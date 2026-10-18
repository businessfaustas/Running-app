# Going live with real accounts

Until Supabase is connected, the site runs in **preview mode**: everything (accounts, workouts,
messages) is stored in each visitor's browser. That's ideal for showing the app, but nothing is
shared between people. These steps switch the site to real, shared accounts. Budget about an hour.

Everything below uses free tiers: Supabase Free, Vercel Hobby, Sentry Developer, Resend Free.

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
function and the `avatars` Storage bucket for profile photos (check it under Storage → Buckets;
it should be public, 2 MB limit, images only). (`pnpm db:seed` adds sample athletes and workouts – useful for a demo, skip it for a real
launch.)

## 3. Configure sign-in and emails (Supabase → Authentication)

**Sign In / Providers → Email**

- Enable email sign-in, turn **Confirm email** on.
- Secure email change: on. Secure password change: on.
- Minimum password length: **8**. Password requirements: **Letters and digits** (the app checks
  the same rule).

**URL Configuration**

- Site URL: `https://running-app-web-amber.vercel.app` (or your own domain).
- Redirect URLs: `https://running-app-web-amber.vercel.app/auth/callback` and
  `http://localhost:5173/auth/callback`.

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

Then **Deployments → … → Redeploy**. (If you connected Supabase through the Vercel Marketplace,
the `NEXT_PUBLIC_SUPABASE_*` variables it adds work too.)

If you use a custom domain, a different Supabase domain or another map provider, add it to the
`Content-Security-Policy` header in `apps/web/vercel.json`.

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
  contact email). Until then the privacy policy and terms show `[placeholders]`.
- Have a lawyer review both pages; they're written for this app but aren't legal advice.
- Accept the data processing agreements offered in the Supabase, Vercel and Sentry dashboards.

## 9. Race calendar and clubs

`packages/shared/src/races.ts` was compiled from organisers' sites and race calendars in
October 2026. Before launch, open each race's official site and confirm its date, distances and
link – especially the ones marked with a date. When organisers announce new dates, update the file and
redeploy. Do the same for the clubs in `packages/shared/src/clubs.ts`: open each club's page and
check the schedule and links; it's worth telling the clubs they're listed.

## 10. Final check

With two real email addresses: sign up and confirm, finish onboarding, create a workout, join it
from the second account, chat, reset a password, say you're going to a race and post in its
forum, reply from the second account, upload a profile photo, switch town, then delete both test
accounts in Settings.
