# PaceMates

A social endurance-sports calendar, in Lithuanian, set in Vilnius. Runners and cyclists post
upcoming workouts on a 24-hour timeline as open invitations, so others can find training partners
and join.

**What's in the app**

- **Welcome:** three full-screen photo slides on the first visit ("Bėk. Mink. Kartu.").
- **Atrasti (Discover):** blue header with greeting, your town, the day's quote and a two-week
  day strip; 24-hour timeline (or map) of workouts around that town, filterable by run or ride.
  Workouts at about the same time are shown together as a "pick one" block (two side by side,
  more in a row you swipe) instead of thin columns. Tap an empty time, or the "+" button, to
  post a workout. The chat button opens all your workout chats.
- **Town:** pick from 25 Lithuanian towns (or "use my location"); it's saved on the profile when
  signed in, on the device otherwise, and asked during onboarding. Discover, the meeting-point
  map, the leaderboard and the clubs list follow it.
- **Workout page:** photo header, start/distance/pace, how the pace compares with yours, meeting
  point map and directions, who's going, a "did you know?" fact, join/leave, host cancel, share.
  Joining or posting ends in a full-screen celebration.
- **Group chat** per workout, for people who are going.
- **Post a workout:** six short steps (photo sport tiles, time, distance and pace, vibe, meeting
  point, group size) with a preview of the card others will see.
- **Varžybos (Races):** a searchable calendar of Lithuanian races (road, trail and ultra, cycling,
  triathlon), grouped by month, with type filters and a "Mano" filter for races you've joined.
  Search ignores diacritics ("kursiu" finds Kuršių). Each race page has the date, distances,
  climbing, surface, description, official site and directions, then:
  - **Kas dalyvauja:** say you're going and which course; see who else from PaceMates is.
  - **Forumas:** threads tagged tip / question / gear / logistics / general, one level of
    replies, a topic filter, a badge on posts by people who are going, live updates.
  - **Pasiruošimas:** a packing checklist built from the race type, surface, season and your
    course (ticks are kept on the device), tips for that course, the start on a map, and a
    prefilled fuelling plan.
- **Ženkliukai (`/badges`):** 12 metal medals from finished workouts – levels that go bronze →
  silver → gold (workouts together, hosted, total km, rides), one-off enamel achievements (first
  workout, before 7:00, after 20:00, track, 21 km+) and gold personal-record plaques (longest
  workout, earliest start, biggest group). Earned / still to get, by category, with a close-up
  sheet showing progress to the next step (`features/badges/badges.ts`, with tests).
- **Lyderiai (`/leaderboard`):** this week's, last week's or this month's most kilometres run,
  most kilometres ridden, most workouts and most workouts hosted – in your town or across
  Lithuania – with a podium and your own place. Counted from finished PaceMates workouts
  people took part in (not from Strava).
- **Klubai (tab, `/clubs`):** local running, triathlon and cycling clubs. Pick a town from the
  chips (with club counts; starts in your town) or all of Lithuania, filter by sport or search.
  Each card shows everything: description, regular sessions, meeting place, level, membership
  and links (site, Facebook, Instagram, Strava, email); the club page adds the map and
  directions.
- **Mitybos skaičiuoklė (`/fueling`):** body weight, age, sex, max heart rate (or estimated),
  distance, pace, target heart rate, temperature, climbing, gut training and gel size give an
  estimated carbohydrate burn, a per-hour intake target, a gel timetable along the course, when
  glycogen would run low without fuelling, fluids, sodium, the pre-race meal and carb loading.
  The model is in `features/fueling/fueling.ts` (with tests); it's an estimate, not medical advice.
- **Planai:** the next workout with a countdown, your upcoming races, then upcoming and past
  workouts.
- **Įkvėpimas (Inspiration):** quote of the day, weekly challenge (3 group workouts), fun facts,
  badges, pace calculator with race-time predictions, group-run tips and the most active hosts.
- **Pokalbiai** (all your workout chats, from the chat button on Atrasti) and **Profilis** (stats,
  badges, usual paces, town, profile photo, edit), other athletes' profiles. Photos are
  cropped square and shrunk on the phone before upload (a few dozen KB).
- **Accounts:** sign up with email confirmation (and resend), sign in / out, forgotten password
  by email, change password, onboarding for new accounts (sports, pace, bio, then matching
  workouts), settings, and delete account (removes everything, typed confirmation).
- **Polish:** inline form validation with Lithuanian messages, loading skeletons, empty and
  error states with retry, an offline banner, a custom 404 and crash page, privacy policy
  (`/privatumas`) and terms (`/salygos`).

All text, dates and plurals are Lithuanian (`apps/web/src/lib/format.ts`, `Intl.PluralRules('lt')`);
quotes, facts and tips live in `apps/web/src/content/inspiration.ts`.

**Preview mode.** Without Supabase settings the app runs entirely in the browser: sample athletes
and workouts around today, and anything you do (accounts, workouts, joins, messages) is saved on
that device only. "Išbandyti kaip Gabija" signs in as a sample athlete in one tap. Set the Supabase
variables (below) to make it multi-user.

**Race calendar.** `packages/shared/src/races.ts` lists the races, curated from organisers' sites,
their registration platforms and ITRA in October 2026. A `date` is filled in only once the
organiser has announced it; otherwise the race shows under its usual month ("~ gegužė 2027"), and
a date that has passed rolls the race on to next year automatically. Add races or update dates by
editing that file; keep each `slug` unchanged once people have posted, since posts and attendance
are stored by slug.

**Clubs.** `packages/shared/src/clubs.ts` lists the clubs, gathered from their public pages and
social accounts. Schedules and fees change; keep the file up to date and add clubs as you hear of
them (towns must match names in `packages/shared/src/cities.ts`).

**Brand.** `apps/web/src/components/brand.ts` holds the runner-P symbol and the "pacemates"
wordmark as SVG paths (used by `Logo.tsx`); standalone files are in `apps/web/public/brand/`, and
the app icons, favicon and social preview image (`og.png`) sit in `apps/web/public/`.

**Photos.** `apps/web/public/photos/` holds the three photos used for headers and tiles. They came
from the client brief; confirm the rights before a public launch. Sample avatars load from
randomuser.me and fall back to initials.

## Stack

| Layer          | Choice                                                                      |
| -------------- | --------------------------------------------------------------------------- |
| Web app (PWA)  | React 19 + Vite + TypeScript, Tailwind CSS v4, React Router                 |
| Data / state   | TanStack Query (server state) + Zustand (UI state)                          |
| Maps           | MapLibre GL via `react-map-gl` with OpenFreeMap tiles (no API key)          |
| API (optional) | Node.js + Express 5, validated with Zod                                     |
| Database & ORM | Supabase Postgres + PostGIS, Drizzle ORM / drizzle-kit migrations           |
| Auth, realtime | Supabase Auth (profiles auto-created), Supabase Realtime (chat, attendance) |

## Repository layout

```
apps/
  web/                 React PWA
    src/backend/       one Backend interface; demo.ts (on-device) and supabase.ts implementations
    src/data/          TanStack Query hooks and auth state
    src/features/
      discover/        timeline, overlap layout algorithm (+ tests), day strip, map view
      workout/         workout page, group chat
      create/          post-a-workout steps
      inspire/         inspiration tab and weekly progress (+ tests)
      badges/          medal collection: rules (+ tests), SVG medals, badges page
      races/           race calendar, race page (forum, attendance, packing list), dates and
                       gear rules (+ tests)
      fueling/         fuelling calculator and its model (+ tests)
      leaderboard/     weekly/monthly leaderboard and its ranking maths (+ tests)
      clubs/           clubs directory and club page
      welcome/         first-visit photo carousel
      auth/            sign in/up, forgot/reset password, email-link callback
      onboarding/      first-run steps for new accounts
      settings/        password, legal links, sign out, delete account
      legal/           privacy policy and terms (operator details in src/content/legal.ts)
      errors/          404 and crash pages
      plans/ inbox/ profile/
      slots/           workout card, list rows, sport/vibe metadata
    src/components/    buttons, fields, top/tab bars, maps, dialogs, celebration overlay
    src/content/       quotes, fun facts and tips; legal operator details
    src/lib/           formatting, validation, analytics, monitoring, helpers
  api/                 Express API (optional) and the seed script
    src/db/schema.ts   Drizzle schema (source of truth for tables/enums/indexes)
packages/
  shared/              domain types & enums, Zod schemas, pace matching, date helpers, sample data,
                       the race calendar (races.ts), towns (cities.ts) and clubs (clubs.ts)
supabase/
  migrations/          generated by drizzle-kit + hand-written SQL (triggers, RLS, realtime,
                       rate limits, account deletion)
  templates/           Lithuanian confirmation and password-reset emails
docs/GO-LIVE.md        launch checklist
.github/workflows/     nightly encrypted database backup
```

## Getting started

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev            # http://localhost:5173, preview mode, no backend needed
```

Other scripts: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

### Making it multi-user (Supabase)

**Step-by-step launch guide: [docs/GO-LIVE.md](docs/GO-LIVE.md)** (Supabase project, auth and
email settings, Vercel variables, analytics, error tracking, backups, legal details).

The web app talks to Supabase directly; row-level security in the database decides who can do
what, so no separate server is needed.

1. **Create a Supabase project.** From Vercel, add Supabase from the Marketplace
   (vercel.com/marketplace/supabase, or your project's Storage tab) and connect it to this project.
   That adds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which the app reads.
   (Elsewhere, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.)
2. **Create the tables** (once, from a computer with this repo):
   ```bash
   pnpm install
   # Supabase → Connect → "Session pooler" connection string
   DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-…pooler.supabase.com:5432/postgres" pnpm db:migrate
   DATABASE_URL="…same…" pnpm db:seed   # optional: the sample athletes, workouts and chats
   ```
3. **Point auth emails at the app:** Supabase → Authentication → URL Configuration → set the
   Site URL to your Vercel address and add `<site>/auth/callback` to the Redirect URLs. New
   accounts confirm their email before signing in; reset links land on `/reset-password`.
4. **Redeploy** on Vercel so the build picks up the Supabase variables.

For local development, `supabase start` (Supabase CLI) runs the whole stack; then use its local
URL and anon key in `apps/web/.env.local` and `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`
for the two commands above.

### Changing the schema

Edit `apps/api/src/db/schema.ts`, then run `pnpm db:generate`. drizzle-kit writes a new
timestamped migration into `supabase/migrations`. Behaviour that drizzle can't model (triggers,
policies, publications) goes in a custom migration: run
`pnpm --filter @pacemates/api exec drizzle-kit generate --custom --name=<name>`.

## Data model

- **profiles**: one row per Supabase Auth user, created by the `on_auth_user_created` trigger.
  Columns: `name`, `avatar_url`, `bio`, `sports` (`running`/`cycling`), `default_paces` (jsonb),
  `strava_id`, `city` (town id from `cities.ts`), `onboarded_at` (null until onboarding is
  finished or skipped). Profile photos live in the public `avatars` Storage bucket, one file per
  person at `<user id>/avatar`; people can only write inside their own folder.
- **workout_slots**: `sport_type` (`RUN`/`CYCLING`/`GRAVEL`/`TRACK`), local `date`,
  `start_time` and `end_time`, `distance_km`, `target_pace`, `vibe_tag`, `description`, `meeting_point_name`,
  `location` (PostGIS `geometry(Point, 4326)`, GiST-indexed as `geography` for radius search in
  metres), `max_participants` (group size including the host; null means unlimited), and `status`.
- **slot_participants**: `(slot_id, user_id)`, `status` (`ACCEPTED`/`PENDING`), `joined_at`.
- **slot_messages**: the per-slot chat, published to Supabase Realtime.
- **race_attendees**: `(race_slug, user_id)`, `distance_km` (the chosen course, optional).
- **race_posts**: the race forums – `race_slug`, `author_id`, `parent_id` (replies),
  `topic` (`TIP`/`QUESTION`/`GEAR`/`LOGISTICS`/`GENERAL`), `content`; published to Realtime.
  Races themselves aren't in the database – they come from `packages/shared/src/races.ts`.

Rules enforced in the database (see `supabase/migrations/*_triggers_rls_realtime.sql`):

- The host is automatically an accepted participant of their own slot.
- Joining a full, cancelled or completed slot is rejected. The slot row is locked, so concurrent
  joins can't overbook it.
- `status` switches between `OPEN` and `FULL` automatically as people join and leave, or when the
  host changes the capacity.
- Row-level security: anyone, signed in or not, can browse workouts, attendance and profiles.
  Users can only host, join or edit as themselves. Hosts can't leave their own workout. Only
  accepted participants can read or post in a workout's chat.
- Rate limits per user (`*_rate_limits_account_deletion.sql`): 20 messages a minute (1,000 a
  day), 3 new workouts a minute (15 a day), 40 joins/leaves per 10 minutes, 20 profile edits a
  minute. Counters live in a `private` schema the API doesn't expose.
- Check constraints repeat the form rules (lengths, distance ≤ 400 km, numeric Strava ID, https
  avatar URLs), so the API can't be used to store what the app wouldn't allow.
- Race forums (`*_race_community_rules.sql`): anyone can read posts and who's going; people post,
  join and delete only as themselves. Replies must be in the same race and only one level deep.
  6 posts a minute (100 a day) and 30 attendance changes per 10 minutes per person.
- `delete_account()` deletes the caller's login; their profile, hosted workouts (with those
  chats), attendance, messages, race attendance and forum posts cascade from it.

The app reads through SQL functions (`list_slots`, `get_slot`, `list_user_slots`, `list_threads`,
`create_slot` in `supabase/migrations/*_app_functions.sql`; `list_slots_near` and `leaderboard`
in `*_city_leaderboard_avatars.sql`) that return the JSON shapes in
`packages/shared/src/domain.ts`. `list_slots_near` uses the geography index for the town's
radius; `leaderboard` totals finished, non-cancelled workouts (Lithuanian time) per person and
caps a request at about two months.

## API (optional)

The web app doesn't need it; it's kept for server-side jobs later, and holds the seed script.

| Method | Path      | Notes                                                                                           |
| ------ | --------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/health` | Liveness check                                                                                  |
| GET    | `/slots`  | `from`, `to` (`YYYY-MM-DD`, required); `sport=RUN,TRACK`; `lat`, `lng`, `radiusKm` (default 25) |

`/slots` returns `SlotSummary[]` (see `packages/shared/src/domain.ts`).

## Security and privacy

- **No secrets in the browser.** The app only uses the Supabase anon/publishable key, which is
  public by design; row-level security protects the data. `apps/web/env-guard.ts` stops the build
  if a `VITE_`/`NEXT_PUBLIC_` variable holds a service-role key, secret key, token or database
  URL, and the app refuses a secret key at runtime too.
- **Auth:** email confirmation, passwords of 8+ characters with letters and digits (checked in
  the app and by Supabase), failed sign-ins pause the form for 30 s after 5 tries, resend buttons
  wait 60 s, and Supabase's own rate limits apply to all auth endpoints.
- **Headers** (`apps/web/vercel.json`): Content-Security-Policy, HSTS, `X-Frame-Options: DENY`,
  `nosniff`, Referrer-Policy, Permissions-Policy.
- **Optional API** (`apps/api`): per-IP rate limiting (300 reads, 30 writes a minute) and a 16 kB
  body limit.
- **Privacy:** cookieless analytics, error reports scrubbed of emails and tokens, no tracking
  cookies. Account deletion is self-service.

## Monitoring

- **Analytics:** Vercel Web Analytics (enable it in the Vercel project). Page views plus events:
  `sign_up`, `sign_in`, `onboarding_completed`/`skipped`, `workout_created`, `workout_joined`,
  `workout_left`, `message_sent`, `password_reset_requested`, `account_deleted`
  (`apps/web/src/lib/analytics.ts`). URLs are reported without ids, query strings or fragments.
- **Errors:** Sentry, loaded only when `VITE_SENTRY_DSN` is set (`apps/web/src/lib/monitoring.ts`).
  Crashes, unexpected backend errors and failed queries are reported with an anonymous user id.

## Backups

`.github/workflows/db-backup.yml` dumps the database every night (public and auth schemas, without
short-lived sessions and tokens), checks the archive can be read, encrypts it with
`BACKUP_PASSPHRASE` and keeps it as a workflow artifact for 30 days. Setup: add the
`SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` repository secrets (see docs/GO-LIVE.md).

To restore (PostgreSQL 17 client tools and gpg needed):

```bash
# 1. Actions → "Database backup" → pick a run → download and unzip the artifact
gpg --decrypt --output pacemates.dump pacemates-<date>.dump.gpg      # asks for the passphrase
# 2. Into a fresh Supabase project: create the tables first
DATABASE_URL="<new project session pooler>" pnpm db:migrate
# 3. Load the data with triggers paused, so nothing is created twice
PGOPTIONS="-c session_replication_role=replica" pg_restore --data-only --no-owner \
  --schema=public --schema=auth --dbname "<new project session pooler>" pacemates.dump
```

People sign in again after a restore (sessions aren't backed up).

## Environment variables (web)

| Name                     | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL. Unset → preview mode.                   |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon / publishable key (never the service-role key). |
| `NEXT_PUBLIC_SUPABASE_*` | Same, as set by the Vercel ↔ Supabase integration.            |
| `VITE_SENTRY_DSN`        | Turns on error tracking.                                      |
| `VITE_MAP_STYLE_URL`     | Other map style (default: OpenFreeMap dark).                  |

## Maps

Maps use [OpenFreeMap](https://openfreemap.org)'s dark style: free, no API key, commercial use
allowed. To use Mapbox or MapTiler instead, set `VITE_MAP_STYLE_URL` to a style URL that includes
your key.

## Deploying (Vercel)

Set the project's Root Directory to `apps/web`. `apps/web/vercel.json` sends every path to
`index.html`, so links like `/workouts/<id>` work when opened directly.

## Next steps

- Profile photo upload (Supabase Storage).
- CAPTCHA (Cloudflare Turnstile) on sign-up if bots show up.
- Data export button (today: on request by email).
- Push notifications for new messages and changes to workouts you joined.
- Native iOS/Android app (Expo) reusing `packages/shared` and the same Supabase backend.
