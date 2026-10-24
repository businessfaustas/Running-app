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
time zones, liability) is in [`SECURITY-AUDIT.md`](SECURITY-AUDIT.md), with its owner tasks.

## 1. Create the Supabase project

1. [supabase.com](https://supabase.com) → **New project**.
   - Region: **Central EU (Frankfurt)**, so personal data stays in the EU (GDPR).
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
function, the leaderboard and town search functions, and the `avatars` Storage bucket for
profile photos. Check the bucket under **Storage → Buckets**: it should be public, 2 MB limit,
images only, with four "Avatars: …" policies under **Storage → Policies**. If the bucket is
missing, run `pnpm db:migrate` again – nothing is applied twice.

**Don't run `pnpm db:seed` on the real project**: it adds sample athletes, workouts and forum
posts, which is right for a demo but would show fake people to real users.

When a later version of the app adds a migration (a new file in `supabase/migrations/`), run
`pnpm db:migrate` against production **before** the new version is deployed.

## 3. Configure sign-in and emails (Supabase → Authentication)

**Sign In / Providers → Email**

- Enable email sign-in, turn **Confirm email** on.
- Secure email change: on. Secure password change: on.
- Minimum password length: **8**. Password requirements: **Letters and digits** (the app checks
  the same rule).

**URL Configuration**

- Site URL: `https://running-app-web-amber.vercel.app` (or your own domain).
- Redirect URLs: `https://running-app-web-amber.vercel.app/auth/callback` and
  `http://localhost:5173/auth/callback`. With your own domain, add
  `https://<your-domain>/auth/callback` too.

**Emails → SMTP Settings** – required for real users. Supabase's built-in sender only delivers to
your own team members' addresses, a few per hour. For example with [Resend](https://resend.com)
(3,000 emails/month free):

1. Add and verify your domain in Resend, create an API key.
2. In Supabase: host `smtp.resend.com`, port `465`, user `resend`, password = the API key,
   sender `PaceMates <noreply@your-domain.lt>`.

**Emails → Templates** (Lithuanian versions are in `supabase/templates/`)

- _Confirm signup_: subject `Patvirtink savo PaceMates paskyrą`, body = `confirmation.html`.
- _Reset password_: subject `PaceMates slaptažodžio atkūrimas`, body = `recovery.html`.

**Rate Limits**: with custom SMTP, raise "emails per hour" to around 100. Keep the sign-in and
sign-up limits at their defaults.

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

- Fill in the operator details in `apps/web/src/content/legal.ts` (company name, code, address,
  contact email). Until then the privacy policy and terms show `[placeholders]` – **don't
  launch with them**.
- The privacy policy covers everything the app collects as of 22 October 2026: account and
  profile (including town and photo), workouts and chats, race attendance and forum posts,
  the public leaderboards, and the fuelling calculator (which stays on the device). If you add
  features that collect something new, update it and the date in `legal.ts`.
- Have a lawyer review both pages; they're written for this app but aren't legal advice.
- Accept the data processing agreements offered in the Supabase, Vercel and Sentry dashboards.

## 9. Race calendar and clubs

`packages/shared/src/races.ts` was compiled from organisers' sites and race calendars in
October 2026. Before launch, open each race's official site and confirm its date, distances and
link – especially the ones marked with a date. When organisers announce new dates, update the file and
redeploy. Do the same for the clubs in `packages/shared/src/clubs.ts`: open each club's page and
check the schedule and links; it's worth telling the clubs they're listed.

## 10. Final check

With two real email addresses and a phone:

1. Sign up and confirm the email (check it arrives from your own sender, not Supabase's).
2. Finish onboarding and pick a town; the Discover tab should show that town.
3. Create a workout; join it from the second account and chat.
4. Upload a profile photo (this is the one step that can't be tested before a real Supabase
   project exists).
5. Say you're going to a race, post in its forum and reply from the second account.
6. Reset a password from the "Pamiršai slaptažodį?" link.
7. Add the site to the home screen (Share → Add to Home Screen) and open it from there.
8. Delete both test accounts in Settings.

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
