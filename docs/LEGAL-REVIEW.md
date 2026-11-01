# Legal exposure review – 1 November 2026

A check of PaceMates against a common legal-launch checklist, adapted to what the app actually
is: a free, EU (Lithuanian) service with public user content, no payments and no marketing
email. Each item was checked in the code and, where it changes behaviour, tested in a browser
and against the database. Not legal advice – have a lawyer review the terms and privacy policy.

| Checklist item                              | Status                                | Files                                                                                                                                                                               |
| ------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Age gate at sign-up                         | ✅ added                              | `apps/web/src/lib/ageGate.ts`, `lib/ageGate.test.ts`, `features/auth/BirthDateField.tsx`, `features/auth/SignInPage.tsx`, `components/Field.tsx`, `features/legal/PrivacyPage.tsx`  |
| Self-hosted fonts                           | ✅ already self-hosted – verified     | none needed                                                                                                                                                                         |
| Session replay off, inputs masked           | ✅ already off – made explicit        | `apps/web/src/lib/monitoring.ts`                                                                                                                                                    |
| Unsubscribe + address in marketing email    | — no marketing email is sent          | (rules below)                                                                                                                                                                       |
| Renewal terms next to subscribe             | — no payments or subscriptions        | (rules below)                                                                                                                                                                       |
| DMCA designated agent                       | ⚠️ owner action – EU equivalent built | `components/ReportLink.tsx`, `lib/report.ts`, `features/races/RacePage.tsx`, `features/workout/WorkoutPage.tsx`, `features/profile/ProfileView.tsx`, `features/legal/TermsPage.tsx` |
| **Found:** third-party photos and portraits | ⚠️ partly fixed, one owner decision   | `packages/shared/src/mock.ts`, `README.md`, migration `…_avatar_storage_only.sql`, `apps/api/src/db/schema.ts`                                                                      |

## Age gate (COPPA, GDPR Art. 8)

Sign-up now asks for **year and month of birth**, neutrally – a plain list of years and no hint
of the minimum – which is how the US FTC describes a proper age screen. Anyone under 16 is
turned away with a friendly message, and the refusal is remembered on the device for 24 hours
so the answer can't just be changed. The date is only compared, never stored or sent.

16 is above both COPPA's 13 and Lithuania's age of digital consent (14), so no parental consent
flow is needed. The old "Man yra bent 16 metų" sentence in the terms checkbox was removed –
a tick-box that states the cut-off is exactly what the neutral screen replaces.

## Fonts

Plus Jakarta Sans comes from the `@fontsource-variable/plus-jakarta-sans` package and is bundled
with the app; the security policy only allows fonts from the app itself. A browser run over ten
pages recorded **no requests to Google or any font service** (and, after the fix below, no
third-party requests at all). The two auth emails use Arial.

## Session replay

Sentry records errors only: tracing off, no replay integration, no names/emails/tokens in
reports, and console and click breadcrumbs dropped. The config now sets
`replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 0` explicitly, with a note that
replay may only ever be added with `maskAllText`, `maskAllInputs`, `blockAllMedia`, a privacy
policy update and consent.

## Marketing email – not applicable

The app sends only Supabase Auth emails (confirm sign-up, reset password). These are
transactional: no unsubscribe link belongs in them. **If you start sending newsletters or
promotions:** get opt-in consent first (EU ePrivacy Directive Art. 13; Lithuanian Law on
Electronic Communications Art. 69), and put an unsubscribe link and your company name and
address in every one (also what the US CAN-SPAM Act asks).

## Subscriptions – not applicable

There is nothing to buy. **If you add paid plans:** next to the button show the price with VAT,
the billing period and that it renews, and how to cancel; label the button so it's clear it
means paying (e.g. "Užsakyti ir sumokėti" – EU Consumer Rights Directive Art. 8(2)); explain the
14-day withdrawal right; and make cancelling online as easy as subscribing.

## Copyright notices – DMCA vs. the EU Digital Services Act

A DMCA designated agent is a US registration that gives US "safe harbor". It can't be filed from
the code: it needs your company's legal details and an account with the US Copyright Office
(dmca.copyright.gov, $6, renewed every 3 years). For a Lithuanian service it is optional.

What **does** apply is the EU **Digital Services Act**, because users publish content (forum
posts, workouts, profiles, photos). Now in place:

- **Notice and action (Art. 16):** a "Pranešti" link on every forum post that isn't yours, on
  each workout page and on other people's profiles. It opens an email to `OPERATOR.email`
  already holding the link, the item's id, a space for the reason, the reporter's name and the
  good-faith statement a valid notice needs.
- **Terms (Art. 14, 17, 11–12):** new section 6 – how to report illegal content and copyright
  infringement, that people (not algorithms) review reports, that the poster is told why
  content was removed and can ask for a review, repeat-infringer suspension, and one contact
  point for users and authorities.
- **Privacy policy:** reports are kept until handled and at most a year.

**What you do with a report:** reply to confirm you received it, decide quickly, and if you
remove something, email the poster the reason. Keep the emails.

## Found during the review

**Third-party sample portraits (fixed).** The sample athletes' photos loaded from randomuser.me,
so every visitor's IP address went to that site – the same issue that made Google-hosted fonts
unlawful in the EU. They now show initials; the app makes no third-party image requests.

**Tracking images in profiles (fixed).** The database accepted any `https://` address as a
profile photo, so a profile could carry a tracking pixel that reports every viewer's IP address.
A new migration allows only files from the project's own `avatars` bucket (and clears anything
else); tested both ways.

**Header photos (your decision).** The three photos in `apps/web/public/photos/` (used on 15
screens: welcome, sign-in, workouts, races, clubs and more) came from the client brief and look
like brand campaign shots – one shows PAS Normal Studios cycling kit, another branded apparel,
all with identifiable models. Without a licence that is a copyright and image-rights risk, and
the logos can suggest an endorsement. Replace them with your own photos, licensed stock, or
artwork without people – or get written permission. Don't use them in Instagram posts either.

**Club logos.** The Klaipėda club logos identify those clubs, which is generally fine, but ask
each club for permission (and remove any on request).

## Owner tasks

1. Run `pnpm db:migrate` on production (adds the avatar rule).
2. Fill in `apps/web/src/content/legal.ts` – the report links send to `OPERATOR.email`.
3. Decide on the header photos (above).
4. Optional: register a DMCA designated agent if you want US safe harbor.
