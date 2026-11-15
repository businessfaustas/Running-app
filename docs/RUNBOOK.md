# Runbook

What to do when something changes or breaks, and the settings only the account owner can make.
Everything here is written so someone who hasn't touched the project for a year can follow it.

- [How releases work](#how-releases-work)
- [Rolling back a bad deploy](#rolling-back-a-bad-deploy)
- [Staging](#staging)
- [Site down](#site-down)
- [Backups and restores](#backups-and-restores)
- [Alerts: who hears what](#alerts-who-hears-what)
- [Secrets and key rotation](#secrets-and-key-rotation)
- [Spend caps and billing alerts](#spend-caps-and-billing-alerts)
- [Custom domain, SSL and email authentication](#custom-domain-ssl-and-email-authentication)
- [Owner checklist: things only you can switch on](#owner-checklist)
- [What this app does not have](#what-this-app-does-not-have)

## How releases work

1. Work happens on a branch. Every push runs **CI** (`.github/workflows/ci.yml`): types, lint,
   unit tests, build, size budget, dependency audit, secret scan, and the browser tests on five
   device profiles (Chrome, Pixel 7, iPhone 13, iPhone SE, iPad) including slow-network and
   accessibility checks.
2. Vercel builds every branch and pull request as a **preview** with its own address.
3. When the production branch (`claude/grouppace-calendar-mvp-auygyw` today; set under Vercel →
   Settings → Git → Production Branch) is updated, Vercel deploys it to the live site.
4. **Post-deploy check** (`post-deploy.yml`) then drives the live site with the smoke and SEO tests.
   If they fail it opens an issue called "Production deploy … failed its post-deploy check" with
   the rollback steps below.

Turn on **branch protection** for the production branch (GitHub → Settings → Branches → require
the `CI` checks to pass before merging) so a red build can't reach the live site.

## Rolling back a bad deploy

Vercel keeps every previous deployment, ready to serve. Rolling back is instant and needs no rebuild.

1. Vercel → the project → **Deployments**.
2. Find the last deployment that worked (the one before the bad one, marked _Production_ earlier).
3. **⋯ → Promote to Production** (or **Instant Rollback** at the top of the list).
4. Check the site. Then fix the problem on a branch and release normally.

If you prefer the command line: `npx vercel rollback` (rolls back to the previous deployment) or
`npx vercel promote <deployment-url>`.

**Database changes don't roll back.** Migrations only move forward. That's why every migration is
written to be safe next to the previous version of the app (add columns and tables; don't rename or
drop in the same release). If a migration itself is the problem, write a new migration that undoes
it; if data was damaged, restore from backup (below).

**Kill switch.** To stop everyone using the app while you fix something, set
`VITE_MAINTENANCE_MESSAGE` in Vercel (Settings → Environment Variables) and redeploy; the app then
shows a maintenance page with your text.

## Staging

Vercel's **preview deployments are the staging environment**: every branch gets a full copy of the
site at its own address, built exactly like production. Open the link on the pull request.

- A stable address: push to a branch named `staging`. Vercel gives it a fixed URL of the form
  `<project>-git-staging-<team>.vercel.app`. CI runs on it too.
- Previews run against whatever Supabase the Vercel variables point to. For a staging that never
  touches real data, create a second free Supabase project, apply the migrations
  (`DATABASE_URL=… pnpm db:migrate`), and in Vercel → Environment Variables set the
  `VITE_SUPABASE_*` values for the **Preview** environment only (leave Production alone). Add the
  preview address to that project's Auth → URL Configuration → Redirect URLs.
- With no Supabase variables a preview runs in **preview mode** (sample data, nothing saved
  anywhere but the browser), which is what the automated browser tests use.

## Site down

An issue labelled `uptime` is opened automatically by `uptime.yml` (every 30 minutes) and closed
when the site recovers. To investigate:

1. Is it the deploy? Vercel → Deployments. A recent failed or odd deployment → roll back (above).
2. Is it Vercel? status.vercel.com. Is it Supabase (sign-in or data failing but the page loads)?
   status.supabase.com → Supabase dashboard → Reports and Logs.
3. Errors in the browser? Sentry → Issues (sorted by newest).
4. The domain? `node scripts/check-domain.mjs <your-domain>` checks the certificate and DNS.
5. Tell people: set `VITE_MAINTENANCE_MESSAGE` if the outage is going to last.

## Backups and restores

- **Nightly backup:** `.github/workflows/db-backup.yml` → encrypted, kept 30 days as a workflow
  artifact. Needs the `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` secrets (GO-LIVE §7).
- **Monthly restore drill:** `.github/workflows/restore-drill.yml` takes the newest backup,
  restores it into a throwaway PostgreSQL+PostGIS database and checks rows, row-level security,
  triggers and location queries; it opens an issue if anything fails. Run it once by hand
  (Actions → Restore drill → Run workflow) after setting the backup up, and read the log.
- **By hand, on your own computer** (PostgreSQL client tools and `gpg` installed):

  ```bash
  # Download a backup artifact from Actions → "Database backup", unzip, then:
  gpg --decrypt --output pacemates.dump pacemates-<date>.dump.gpg
  PGHOST=… PGUSER=postgres PGPASSWORD=… scripts/restore-drill.sh pacemates.dump
  ```

  The script restores into a scratch database and removes it afterwards, so it is safe to run
  next to real data.

- **Real recovery** (the data is gone and you need it back): create a new Supabase project, then
  follow "Backups" in the README (migrate, then load the data with triggers paused). Point the
  Vercel `VITE_SUPABASE_*` variables at the new project and redeploy. People sign in again.

**What was tested.** The backup and restore procedure was run end to end on a database built from
all of this repository's migrations and filled with the sample data: dump with the workflow's
flags, encrypt, decrypt (byte-identical), restore into an empty database, and compare. All 7 data
tables matched row for row and by checksum; row-level security was on for all 9 tables, all
triggers came back, and PostGIS queries worked; a damaged dump was rejected. It has **not** been
run against your production data, because no backup of it existed yet: the first monthly drill
(or a manual run) does that.

## Alerts: who hears what

| What goes wrong            | How you hear                                          | Set up                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site down / unhealthy      | GitHub issue `uptime` (emailed), checked every 30 min | Variable `SITE_URL`; GitHub notifications on. For 1–5 minute checks and SMS/phone alerts add a free outside monitor (UptimeRobot, Better Stack) on the same address |
| Bad deploy                 | GitHub issue `incident`                               | Automatic (`post-deploy.yml`)                                                                                                                                       |
| Backup didn't run          | Failed workflow email from GitHub                     | Automatic                                                                                                                                                           |
| Backup can't be restored   | GitHub issue `incident`                               | Automatic (`restore-drill.yml`)                                                                                                                                     |
| New code error in browsers | Sentry email                                          | Sentry → Alerts → "Issues: new issue" and "issue regression" → your email                                                                                           |
| Error spike                | Sentry email                                          | Sentry → Alerts → "Number of errors > 20 in 1 hour"                                                                                                                 |
| Slow site (real visitors)  | Vercel Speed Insights                                 | Vercel → Speed Insights → Enable; watch LCP < 2.5 s, INP < 200 ms, CLS < 0.1                                                                                        |
| Vulnerable dependency      | Dependabot pull request / failed CI                   | Settings → Code security → enable Dependabot alerts and security updates                                                                                            |
| Leaked secret              | GitHub secret-scanning alert / failed CI              | Settings → Code security → enable Secret scanning and Push protection                                                                                               |
| Money                      | Billing alert emails                                  | See the next section                                                                                                                                                |

## Secrets and key rotation

**Rules.** No secret lives in the repository: the build refuses a secret in any `VITE_`/`NEXT_PUBLIC_`
variable (`apps/web/env-guard.ts`), `.env` files are git-ignored, and CI scans the whole history
with gitleaks. Secrets live in Vercel (Environment Variables) and GitHub (Actions secrets) only.
The Supabase _anon/publishable_ key in the browser is public by design; row-level security protects
the data.

**Last check.** The git history was searched for the usual patterns: Supabase secret keys and
service-role JWTs, Resend, Stripe and GitHub tokens, and database URLs with passwords. Everything that
matched is a fake value in a test or a placeholder connection string in the docs, so nothing needed
rotating. That was a pattern search by hand; the gitleaks job in CI now does a thorough one on every
push, over the whole history, so a real leak will stop the build.

**If a key ever leaks** (committed, pasted in a chat, shown in a screenshot), treat it as public
and rotate it _before_ cleaning the history:

| Key                                    | Where to rotate                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Supabase database password             | Supabase → Project Settings → Database → Reset database password; then update `SUPABASE_DB_URL` in GitHub secrets  |
| Supabase service-role / secret key     | Project Settings → API Keys → regenerate; it is not used by the web app                                            |
| Supabase anon key                      | Only if it was swapped for a secret by mistake: regenerate and update `VITE_SUPABASE_ANON_KEY` in Vercel, redeploy |
| Email (Resend) API key / SMTP password | Resend → API Keys → delete and create; update it in Supabase → Authentication → SMTP                               |
| Sentry DSN                             | Not secret (it only allows sending reports); rotate under Sentry → Client Keys if abused                           |
| `BACKUP_PASSPHRASE`                    | Choose a new one; older backups still need the old one, so keep both until they expire (30 days)                   |
| GitHub tokens                          | GitHub → Settings → Developer settings; revoke and recreate                                                        |

Then: remove the secret from the code, redeploy, and check the provider's logs for use of the old key.

## Spend caps and billing alerts

These can only be set in each provider's dashboard by the account owner (they need your login), so
they are listed here instead of automated. Everything the app uses has a free tier, and all of
these are made so that going over **stops or warns** rather than quietly charging.

- **Vercel** (Hobby): the free plan has hard limits and cannot bill you; at the limit the project is
  paused. If you move to Pro: Team Settings → Billing → **Spend Management** → set an amount and turn
  on _Pause projects when reached_ and email notifications at 50 / 75 / 100 %.
- **Supabase** (Free): no charges possible; at the limits the project slows or pauses. On Pro: Organization →
  Billing → keep **Spend Cap** _on_ (the default) so usage beyond the plan is blocked, not billed.
  Subscribe to usage emails under Organization → Billing.
- **Sentry** (Developer): free; Settings → Subscription → set a **quota / on-demand budget of 0** so
  a runaway error loop is dropped instead of billed.
- **Resend / other email provider**: free tier is a hard cap; if paid, set the monthly send limit.
- **Maps**: OpenFreeMap needs no key and has no billing. If you switch to a paid map provider, set a
  hard monthly quota in its dashboard first.
- **GitHub Actions**: Settings → Billing → set a **spending limit** of $0 so scheduled jobs (uptime
  every 30 minutes, nightly backup, CI) can't run up a bill. Public repositories use Actions for free;
  a private repository gets 2 000 minutes/month, and the uptime check alone uses about 1 500 of them
  (each run bills as a minute), the browser tests several more per push. If you hit the limit, make the
  uptime schedule hourly and rely on an outside monitor, or run only `desktop-chrome` and `iphone-13`
  in the CI matrix.

## Custom domain, SSL and email authentication

1. **Domain:** Vercel → project → Settings → Domains → add your domain and follow the DNS records it
   shows. SSL is automatic (Let's Encrypt) and renews itself. Make the domain the **Production Domain**
   and set `VITE_SITE_URL` to it (no trailing slash) so link previews, the sitemap and the canonical
   tags use it. Add it to Supabase → Authentication → URL Configuration (Site URL and Redirect URLs).
2. **Email authentication** (so sign-up and password-reset emails reach inboxes, not spam): at your
   email provider (GO-LIVE §3 uses a custom SMTP sender) add the three DNS records it gives you:
   - **SPF** – a `TXT` record on the domain that starts `v=spf1` and lists the provider; end it in `~all` or `-all`.
   - **DKIM** – a `TXT`/`CNAME` record at `<selector>._domainkey.<domain>`.
   - **DMARC** – a `TXT` record at `_dmarc.<domain>`: start with `v=DMARC1; p=none; rua=mailto:you@yourdomain`,
     read the reports for two weeks, then move to `p=quarantine`.
3. **Check it:**

   ```bash
   node scripts/check-domain.mjs yourdomain.lt resend   # second argument: your DKIM selector
   ```

   It checks the certificate (and days left), HTTP→HTTPS redirect, HSTS and CSP headers, SPF, DKIM
   and DMARC, and exits with an error if something is missing. Also try mail-tester.com by signing up
   with a test address.

4. In Vercel, **Settings → Domains → Redirect** `www` to the bare domain (or the reverse) so there is
   one canonical address.

## Owner checklist

Everything the repository can do is already in place. These need your accounts:

- [ ] GitHub → Settings → Secrets and variables → Actions: `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`; variable `SITE_URL`
- [ ] Run **Database backup** once, then **Restore drill** once, and read both logs
- [ ] GitHub → Settings → Branches: require the CI checks on the production branch
- [ ] GitHub → Settings → Code security: Dependabot alerts + security updates, Secret scanning + Push protection
- [ ] Vercel: enable **Analytics** and **Speed Insights**; set `VITE_SUPABASE_*`, `VITE_SENTRY_DSN`, `VITE_SITE_URL`
- [ ] Sentry: create the alert rules from the table above
- [ ] Spend caps and billing alerts (section above)
- [ ] Custom domain, then `scripts/check-domain.mjs`
- [ ] Fill in the operator details in `apps/web/src/content/legal.ts` (GO-LIVE §8)
- [ ] Submit `/sitemap.xml` in Google Search Console and Bing Webmaster Tools

## What this app does not have

Some common launch-checklist items don't apply to PaceMates today, and it is better to say so than
to add decoration:

- **No AI model.** There is no language-model feature, so there are no evals, prompt-injection
  tests, model-outage fallback, or token/context-limit handling to build. If one is added later,
  those become required: write evals for it first, treat all user-written text (workout titles,
  chat, forum posts, club descriptions) as untrusted input to the prompt, and design the feature to
  work, without the AI part, when the model API is down.
- **No cookie banner.** The app sets no cookies and loads no advertising or cross-site trackers:
  analytics are cookieless, and `localStorage` holds only things the person asked for (their town,
  packing-list ticks, the sign-in session). Consent is required only for cookies/trackers that
  aren't strictly necessary, so a banner would be wrong here. If you add Google Analytics, a
  Meta pixel or similar, add a consent banner at the same time.
- **No server of its own in production.** `apps/api` is optional and unused by the web app; the
  browser talks to Supabase, where row-level security is the access control. The API still has rate
  limits, request logging, tests that fail if a write route appears, and an audited dependency tree.
