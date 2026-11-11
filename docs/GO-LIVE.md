# Going live with real accounts

Until Supabase is connected, the site runs in **preview mode**: everything (accounts, workouts,
messages) is stored in each visitor's browser. That's ideal for showing the app, but nothing is
shared between people. These steps switch the site to real, shared accounts. Budget about an hour.

Everything below uses free tiers: Supabase Free, Vercel Hobby, Sentry Developer, Resend Free.

**Already checked in the code** (October 2026): all database migrations apply cleanly to an
empty database; the security rules, rate limits, town filter and leaderboard pass the
integration tests; a full two-account run-through against a real backend works; and every
screen passes an automated accessibility scan (WCAG AA) with the production
security headers on. What's left is the setup only the owner can do.

A full security, privacy and safety review (ownership rules, offline behaviour, old phones,
time zones, liability) is in [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md), and the legal review (age
gate, content reports, photos, marketing and payment rules) in
[`LEGAL-REVIEW.md`](LEGAL-REVIEW.md) – each with its owner tasks.

## 1. Create the Supabase project

1. [supabase.com](https://supabase.com) → **New project**.
   - Region: any **EU** region – Frankfurt, Ireland, Stockholm or Paris – so personal data
     stays in the EU (GDPR). Not London or Zurich (outside the EU). The region can't be changed
     later.
   - Save the database password in a password manager.
2. Copy two connection details for later (Supabase → **Connect**):
   - the **Session pooler** connection string (`postgresql://postgres.<ref>:<password>@aws-0-…pooler.supabase.com:5432/postgres`);
   - under **Project Settings → API Keys**: the project URL and the **anon / publishable** key.
     Never use the `service_role` / secret key in the app – the build refuses to ship it.

## 2. Create the tables and security rules

From a computer with this repository:

```bash
pnpm install
DATABASE_URL="<session pooler string>" pnpm db:migrate
```

This creates the tables, row-level security, the database rate limits, the delete-account
function, the leaderboard and town search functions, and two Storage buckets: `avatars`
(profile photos) and `club-photos` (the photo grids on club pages). Check them under **Storage →
Buckets**: both public, images only, 2 MB and 3 MB limits, with four "Avatars: …" and two
"Club photos: …" policies under **Storage → Policies**. If a bucket is missing, run
`pnpm db:migrate` again – nothing is applied twice.

**Don't run `pnpm db:seed` on the real project**: it adds sample athletes, workouts and forum
posts, which is right for a demo but would show fake people to real users.

When a later version of the app adds a migration (a new file in `supabase/migrations/`), run
`pnpm db:migrate` against production **before** the new version is deployed.

The **Last migration** card on the Supabase dashboard stays empty: it only tracks the Supabase
CLI, while these migrations are recorded in `drizzle.__drizzle_migrations`. If you connected
GitHub in Supabase (Project Settings → Integrations), turn off deploying migrations to
production there, or it will try to apply the same files a second time.

## 3. Configure sign-in and emails (Supabase → Authentication)

**Sign In / Providers → Email**

- Enable email sign-in, turn **Confirm email** on.
- Secure email change: on. Secure password change: on.
- Minimum password length: **8**. Password requirements: **Letters and digits** (the app checks
  the same rule).

**URL Configuration**

- Site URL: `https://running-app-web-amber.vercel.app` (or your own domain) – no `/` at the
  end, or the logo in the emails won't load.
- Redirect URLs: `https://running-app-web-amber.vercel.app/auth/callback` and
  `http://localhost:5173/auth/callback`. With your own domain, add
  `https://<your-domain>/auth/callback` too.

**Emails → Set up SMTP** – required for real users, and Supabase only lets you edit the email
templates once it's done. Its built-in sender only delivers to your own team's addresses, a few
per hour. Two options:

- **Quick start – your Gmail** (about 500 emails a day, enough for the first users): in your
  Google Account turn on 2-Step Verification, then create an **App password** named "Supabase".
  In Supabase: host `smtp.gmail.com`, port `465`, username and sender email = the Gmail
  address, password = the app password, sender name `PaceMates`. Set "emails per hour" (Rate
  Limits) to about 30.
- **Later – your own domain** with [Resend](https://resend.com) (3,000 emails/month free): add
  and verify the domain in Resend, create an API key; in Supabase: host `smtp.resend.com`, port
  `465`, user `resend`, password = the API key, sender `PaceMates <noreply@your-domain.lt>`.

**Emails → Templates** (Lithuanian versions are in `supabase/templates/`), after SMTP is set up.
Switch the body to **Source**, replace everything and save:

- _Confirm sign up_: subject `Patvirtink savo PaceMates paskyrą`, body = `confirmation.html`.
- _Reset password_: subject `PaceMates slaptažodžio atkūrimas`, body = `recovery.html`.

**Rate Limits**: with your own domain's SMTP, raise "emails per hour" to around 100 (about 30 with
Gmail). Keep the sign-in and sign-up limits at their defaults.

## 4. Connect the site (Vercel → Project → Settings → Environment Variables)

| Name                     | Value                                  |
| ------------------------ | -------------------------------------- |
| `VITE_SUPABASE_URL`      | `https://<ref>.supabase.co`            |
| `VITE_SUPABASE_ANON_KEY` | the anon / publishable key             |
| `VITE_SENTRY_DSN`        | from step 6 (optional but recommended) |
| `VITE_SITE_URL`          | optional, see below                    |

Then **Deployments → … → Redeploy**. (If you connected Supabase through the Vercel Marketplace,
the `NEXT_PUBLIC_SUPABASE_*` variables it adds work too.)

If you use a custom domain, a different Supabase domain or another map provider, add it to the
`Content-Security-Policy` header in `apps/web/vercel.json`.

**Link previews** (Facebook, Messenger, WhatsApp) use the production domain Vercel reports at
build time. With your own domain, set it as the production domain in Vercel → Settings →
Domains, or set `VITE_SITE_URL=https://<your-domain>`. After deploying, paste the link into
[Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) to check the image
and text.

## 5. Analytics

Vercel → Project → **Analytics** → Enable. Page views show up on the free plan; the named events
the app sends (`sign_up`, `workout_created`, `workout_joined`, …) appear on paid plans. No cookies
are used, so no cookie banner is needed.

## 6. Error tracking

[sentry.io](https://sentry.io) → create a **React** project (choose the EU data region) → copy
the DSN into `VITE_SENTRY_DSN` and redeploy. Reports carry no names, emails, messages or tokens.

## 7. Nightly backups

GitHub → repository → **Settings → Secrets and variables → Actions** → add:

- `SUPABASE_DB_URL` – the Session pooler string (with password);
- `BACKUP_PASSPHRASE` – a long random passphrase. Keep it in a password manager: without it the
  backups can't be opened.

Then **Actions → Database backup → Run workflow** once to check it. It runs every night and keeps
30 days of encrypted backups. Restoring is described in the README ("Backups"). (Supabase's paid
plan adds its own daily backups and point-in-time recovery.)

## 8. Legal

- Fill in the operator details in `apps/web/src/content/legal.ts` (company name, code,
  address). Until then the privacy policy and terms show `[placeholders]` – **don't launch with
  them**. The contact email is set to `info.pacemates@gmail.com`; it's shown on the legal pages
  and under every report form, so change it there if you use another inbox.
- The privacy policy covers everything the app collects as of 22 October 2026: account and
  profile (including town and photo), workouts and chats, race attendance and forum posts,
  the public leaderboards, club photos, content reports, clubs people add, and the fuelling
  calculator (which stays on the device). If you add
  features that collect something new, update it and the date in `legal.ts`.
- Have a lawyer review both pages; they're written for this app but aren't legal advice.
- Accept the data processing agreements offered in the Supabase, Vercel and Sentry dashboards.

## 9. Race calendar and clubs

`packages/shared/src/races.ts` was compiled from organisers' sites and race calendars in
October 2026. Before launch, open each race's official site and confirm its date, distances and
link – especially the ones marked with a date. When organisers announce new dates, update the file and
redeploy. Do the same for the clubs in `packages/shared/src/clubs.ts`: open each club's page and
check the schedule and links; it's worth telling the clubs they're listed.

### Clubs people add

Anyone signed in can add a club (Klubai → "Pridėti"). It's saved in the `club_submissions`
table as `PENDING`, and only the person who added it can see it. To review new ones, open
Supabase → Table Editor → `club_submissions` and filter `status = PENDING`, or run in the SQL
Editor:

```sql
select created_at, name, city, types, description, website, facebook, instagram, email, slug
  from club_submissions where status = 'PENDING' order by created_at;
```

Check the links, then set `status` to `APPROVED` (it appears for everyone straight away) or
`REJECTED`. You can fix typos in the same row before approving. A club that becomes official
can move into `clubs.ts` later (with its logo); delete the row then. Each person can add three
clubs a day.

## 9a. Reports about content

Every "Pranešti" link (workouts, profiles, forum posts, club photos) opens a form. Reports land
in the `content_reports` table; nobody can read them through the app, only you in Supabase. They
also arrive by email if people use the address under the form. Check them at least daily:

```sql
select r.created_at, r.reason, r.subject, r.path, r.details,
       coalesce(p.name, r.reporter_name) as reporter,
       coalesce(u.email, r.reporter_email) as reply_to
  from content_reports r
  left join profiles p on p.id = r.reporter_id
  left join auth.users u on u.id = r.reporter_id
 where r.status = 'NEW'
 order by r.created_at;
```

Open the `path` in the app to see the content (`/athletes/<id>`, `/workouts/<id>`, …; for forum
posts and photos, `target_id` is the row in `race_posts` or `club_photos`). Remove what breaks the
law or the terms, tell the author why (the terms promise this, and a way to reply), reply to the
reporter, then set the report's `status` to `ACTIONED` or `DISMISSED`. Delete reports after a
year – the privacy policy says so. A visitor can send up to 60 reports an hour in total, a
signed-in person 10.

## 10. Final check

With two real email addresses and a phone:

1. Sign up and confirm the email (check it arrives from your own sender, not Supabase's).
2. Finish onboarding and pick a town; the Discover tab should show that town.
3. Create a workout; join it from the second account and chat.
4. Upload a profile photo (this is the one step that can't be tested before a real Supabase
   project exists).
5. Say you're going to a race, post in its forum and reply from the second account.
6. Edit the workout from the first account (Redaguoti): the second account sees the change, and
   the group chat gets a message saying what changed.
7. Report the forum post from the second account and find it with the query in 9a. Add a club,
   approve it and check it shows for the other account.
8. Reset a password from the "Pamiršai slaptažodį?" link.
9. Add the site to the home screen (Share → Add to Home Screen) and open it from there.
10. Delete both test accounts in Settings.

The next day, the leaderboard should list the test workout once it has finished – then you know
the whole chain works.

## 11. After launch

- Sentry emails you about new errors; Vercel → Analytics shows visits.
- Supabase → Database → Backups (paid plan) or the nightly GitHub backup keep the data safe;
  try a restore once, as described in the README.
- Keep the race calendar fresh: once a race has taken place, the app shows an estimated date for
  next year ("~ spalis 2027 · tiksli data dar nepaskelbta") until you put the confirmed date in
  `races.ts`.

## If something goes wrong

Read this once now, so you know what to do under pressure.

- **A new version broke something:** Vercel → Deployments → the previous production deployment →
  **⋯ → Instant Rollback**. It's live again within seconds; nothing else changes. (The Hobby
  plan rolls back one step; to go further back, open an older deployment and **Redeploy** it.)
- **Take the whole app offline** (a serious bug, a data or security problem): Vercel → Settings
  → Environment Variables → add `VITE_MAINTENANCE_MESSAGE` with a short note (for example
  "Tvarkome kai ką svarbaus. Grįžk po valandėlės!") → Deployments → Redeploy. In about a minute
  every visitor sees a "Trumpam tvarkomės" page and the app stops talking to the database.
  Delete the variable and redeploy to bring it back.
- **Stop the database immediately:** Supabase → Project Settings → General → **Pause project**
  (Free plan). Use it only if data is leaking right now; the app shows errors until resumed.
- **A key leaked:** Supabase → Project Settings → API Keys → create a new key and delete the
  leaked one, then put the new one in Vercel and redeploy. Change the database password under
  Database → Settings and update the `SUPABASE_DB_URL` GitHub secret.
- **Before every `pnpm db:migrate` on production**, run **Actions → Database backup → Run
  workflow** and wait for it to finish – migrations only go forward, so the backup is your undo.
  Restoring is described in the README ("Backups").
