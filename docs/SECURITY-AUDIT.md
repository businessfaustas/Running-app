# Pre-launch audit – 24 October 2026

A security, privacy, safety and reliability review of PaceMates against the common
"vibe-coded app" launch checklists. Every item was tested on the real stack (Supabase Auth +
PostgREST + Postgres with all migrations applied to an empty database), in a browser, with
two and three separate accounts and a signed-out visitor – not just read in the code.

**Result:** no critical issues open. Two **high** findings (who joined a workout was visible to
anyone) and several **medium** ones were found and fixed. What remains are owner tasks
(bottom of this page) that code can't do.

| #   | Check                                                               | Result                                           |
| --- | ------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Other users' data in the browser's network tab (row-level security) | ⚠️ → ✅ fixed: participant names were public     |
| 2   | User B opens user A's URLs (ownership)                              | ✅ passed                                        |
| 3   | Stripe refunds / cancellations / disputes                           | — no payments in the app                         |
| 4   | Wi-Fi off mid-action, weak signal                                   | ⚠️ → ✅ fixed: endless spinners                  |
| 5   | Secrets pasted into AI chats or committed                           | ✅ none found – rotate anything pasted elsewhere |
| 6   | Three-year-old phone on 3G                                          | ✅ usable in about 3 s                           |
| 7   | Duplicate workflows / double notifications                          | ✅ none                                          |
| 8   | `/admin` and role checks                                            | ✅ no admin area; nothing privileged reachable   |
| 9   | Env secrets, legal pages, error boundaries, monitoring, rollback    | ✅ (rollback switch added)                       |
| 10  | Liability, location privacy, time zones, join race conditions       | ⚠️ → ✅ fixed (details below)                    |

---

## Fixed

### HIGH – Who joined a workout was visible to anyone

**Found.** Anyone – even without an account – could read the full participant list of every
workout (`slot_participants` was readable by everyone; the workout page and cards returned
names), and a runner's profile listed the upcoming workouts they had joined. Together that
answers "where will this specific person be, and when" – a stalking risk for a running app.

**Fixed** in migration `20261024222324_participation_privacy.sql`:

- Participant names are visible only to people in that workout (and its host). Everyone else
  sees the head-count, the host and the meeting place.
- Someone else's profile shows the workouts they **host** and ones already **finished** (for
  stats and badges) – never upcoming workouts they've only joined.
- Who is going to a race is visible to signed-in runners; visitors see counts only.
- Head-counts, FULL/OPEN status and the leaderboard still work: they're computed by
  `SECURITY DEFINER` functions that return numbers, not names.
- The app shows "Dalyvių vardus mato tik prisijungę prie šios treniruotės" where the list was,
  and the preview mode follows the same rules. The optional `apps/api` listing no longer
  returns avatars either.

**Verified** with an automated probe (37 checks, all passing) – see "Ownership" below.

### MEDIUM – Offline or weak signal: spinner forever, no message

**Found.** With Wi-Fi off, pressing "Dalyvausiu", saving the profile or sending a chat message
showed an endless spinner and no explanation (the data library paused the request until the
connection returned). On a weak signal (server answering after 45 s) the button spun for the
whole time, then for another refresh.

**Fixed.**

- Actions fail immediately when offline with "Nėra ryšio su serveriu. Patikrink internetą ir
  bandyk dar kartą." What was typed stays in the form.
- Every request to Supabase has a deadline (20 s, uploads 90 s). After it: "Serveris per ilgai
  neatsako – gal silpnas ryšys? Bandyk dar kartą."
- Buttons no longer wait for the follow-up refresh after a failure.
- An "offline" banner was already shown; it stays.

**Verified** in the browser: offline join / chat / profile save each show the message within
1.5 s with no spinner; the weak-signal join stops at 20 s with the message.

### MEDIUM – Workout times depended on the phone's time zone

**Found.** Whether a workout had finished, "today", the timeline's now-line and countdowns
used the phone's clock and zone. A phone set to UTC or abroad saw workouts end hours late or
early, while the database (correctly) uses Lithuanian time.

**Fixed.** One helper (`apps/web/src/lib/clock.ts`) gives "now" in Europe/Vilnius, used
everywhere. When the phone isn't on Lithuanian time, the timeline and workout page say
"Lietuvos laiku". Tests pass with the device set to UTC, New York, Tokyo, Vilnius and Kyiv,
including daylight-saving changes.

_About the "8:00 in New York seen from London" question:_ PaceMates is Lithuania-only, and an
event's time is shown as the local time where it happens (as Meetup and race calendars do) – a
runner abroad sees "18:30 Lietuvos laiku", which is what they need to show up. If the app ever
lists events abroad, store a `timestamptz` plus the event's time zone instead.

### MEDIUM – No organiser confirmation, little safety guidance

**Found.** Sign-up required accepting the terms, but nothing when publishing a workout, and
nothing on a workout page about safety or emergencies.

**Fixed.**

- Publishing a workout now requires ticking: the meeting place is public (not a home address),
  description and pace are accurate, the host will cancel if plans change, participants take
  part at their own risk and PaceMates doesn't organise workouts.
- The sign-up checkbox now says "Suprantu, kad treniruotėse dalyvauju savo atsakomybe".
- Every workout page has a "Saugiai" card: meet in public, tell someone where you'll be, take
  a phone, emergency number 112, own-risk link to the terms.
- Terms: 112 added; a paragraph on organisers' responsibilities and that they aren't our
  staff. Privacy policy section 4 rewritten to match the new visibility rules.

> **Legal note.** In the EU, terms can't exclude liability for death or personal injury caused
> by the service's own fault (Unfair Contract Terms Directive 93/13/EEC, Annex point 1(a)), so
> these texts mainly make clear that PaceMates is a platform and that people take part at
> their own risk. Have a lawyer review them, and consider public-liability insurance.

### MEDIUM – A meeting point dropped with "Mano vieta" could be someone's home

**Fixed.** The create flow now says "Rinkis viešą vietą – ne namų adresą: ją matys visi", and
after "Mano vieta" warns: "Tai tavo dabartinė vieta. Jei esi namie, pasirink viešą vietą
netoliese…". Meeting places themselves stay public on purpose – people need them to join – but
no one's home or live location is ever stored or shared.

### MEDIUM – No quick way to take the app offline

**Fixed.** Set `VITE_MAINTENANCE_MESSAGE` in Vercel and redeploy (about a minute): every
visitor sees a "Trumpam tvarkomės" page with your message, and the app makes no calls to the
backend. Rollback steps are in `docs/GO-LIVE.md` → "If something goes wrong".

### LOW – Unbounded chat and forum loads

Chat loads the newest 300 messages and a race forum the newest 500 posts, so a busy race page
can't grow into a multi-megabyte load over the years.

---

## Passed – no change needed

### Ownership (user B with user A's data)

An automated probe tried, as a visitor and as a second and third account, to read and change
other people's data through the API the browser uses. Every attempt was blocked:

- edit or delete someone's profile, workout, chat message or forum post;
- join a workout, post in a chat or forum, or host a workout **as someone else**;
- remove another participant; change someone's race distance;
- read a chat you're not in; read Supabase's `auth.users` or the private rate-limit table;
- create content or call `delete_account` while signed out; call internal functions;
- rewrite your own profile id to take over another account.

In the browser: pasting another user's chat URL shows "Prisijunk prie treniruotės" (no
messages); `/profile/edit` and `/settings` only ever open your own account.

**No email address is ever returned to another user** – emails live only in Supabase Auth.
Public profiles (name, photo, town, bio, sports, paces, an optional Strava link) are public on
purpose, as the privacy policy says.

### Capacity under simultaneous joins

Five accounts pressed "Dalyvausiu" at the same instant on a workout with one place left: one
got in, four were told it's full. The capacity check locks the workout row first
(`enforce_slot_capacity`), so it can't be raced.

### Secrets

- Git history (all branches) has no keys, tokens, passwords or connection strings – only a
  fake `sb_secret_abc123` in the guard's own test.
- `.env` files are git-ignored; only `.env.example` files are committed.
- The build refuses to ship a Supabase secret / service-role key, a Sentry auth token, a Stripe
  key or a database URL in a public variable (`apps/web/env-guard.ts`).
- This project's AI chat transcript contains no real secrets – only throw-away passwords of the
  local test database and the README's placeholder.

### Old phones and weak signal

Production build, cold cache, CPU slowed 4× and Fast-3G network (1.6 Mbps, 150 ms):

| Screen    | Splash | Usable | Downloaded |
| --------- | ------ | ------ | ---------- |
| Atrasti   | 0.8 s  | 2.8 s  | 330 kB     |
| Varžybos  | 0.8 s  | 2.8 s  | 373 kB     |
| Klubai    | 0.8 s  | 2.7 s  | 330 kB     |
| A workout | 0.9 s  | 3.2 s  | 390 kB     |

Maps (1 MB) load only when a map is on screen. Layouts were checked at 320 px wide.

### Duplicate workflows

The database has 14 triggers – one per job (profile creation, `updated_at`, capacity, OPEN/FULL
status, host-as-participant, a rate limit per table) – with no overlaps and no duplicate
functions. The only emails are Supabase Auth's (confirm sign-up, reset password), so nothing
can send a welcome email twice. Each user action records one analytics event.

### `/admin` and roles

There is no admin area and no admin role. `/admin` shows the 404 page signed out and signed
in. The only sensitive database function, `delete_account`, requires a signed-in user and
deletes only that user. The service-role key is never in the app.

### Errors, monitoring, environment, legal

- Database and auth errors are translated to Lithuanian messages; anything unexpected shows
  "Kažkas nepavyko…" and is reported to Sentry. Raw database text never reaches the screen.
- Route-level error pages and a map error boundary catch crashes; a 404 page catches bad links.
- Sentry is wired in and strips names, emails, messages and tokens – it starts reporting as
  soon as `VITE_SENTRY_DSN` is set.
- Terms and privacy policy exist in Lithuanian and now cover everything the app collects.

### Authentication edge cases

Tested against Supabase Auth: sign-up with confirmation email, sign-in before confirming
(offers a resend), expired or reused links ("Nuoroda nebegalioja"), password reset, password
change, account deletion. **Signing up again with an existing email** shows the same "check
your email" screen (so nobody can probe which emails have accounts), sends nothing, and leaves
the original account and password untouched.

### Accessibility and security headers

An axe-core scan of 25 screens reports no WCAG AA violations, and no page breaks the
Content-Security-Policy.

---

## Residual risks (accepted, documented)

- **Public listings can be scraped.** Workouts, meeting places and public profiles are public
  so people can find groups; anyone can list them with the public API key. Supabase's free
  plan has no per-IP read limit. Writes are rate-limited in the database.
- **Full page reload while offline** shows the browser's offline page (there is no service
  worker). Inside the app, going offline shows the banner and clear messages.
- **Organiser confirmation** is enforced in the app, not stored per workout; the sign-up
  acceptance time is stored.

## Owner tasks before launch

1. Run `pnpm db:migrate` against production (applies the privacy migration).
2. **Rotate any secret you ever pasted into an AI tool or chat** – Supabase service-role key,
   database password, Resend API key, Sentry auth token. (None were pasted in this project's
   chat.)
3. Set `VITE_SENTRY_DSN` – monitoring is a launch blocker, not a nice-to-have.
4. Fill in the operator details in `apps/web/src/content/legal.ts`, have a lawyer review the
   terms and privacy policy, and consider liability insurance.
5. Read "If something goes wrong" in `docs/GO-LIVE.md` once, before you need it.
6. Open the app once on a real older Android phone on mobile data.
