# Paid plans: PaceMates Plus

PaceMates is free. Plus is an optional plan for people who train towards something. This guide
explains the offer, how it is built, and the steps (all in your own Stripe and Supabase
accounts) to switch real payments on.

**Until those steps are done nothing is charged:** in preview mode (no Supabase) the plan is
pretend, and with Supabase but no Stripe setup the pricing page's buttons say payments aren't on yet.

- [The offer](#the-offer)
- [How it works](#how-it-works)
- [Switching payments on](#switching-payments-on)
- [Testing before going live](#testing-before-going-live)
- [Going live](#going-live)
- [Running it](#running-it)
- [Limits and honest notes](#limits-and-honest-notes)

## The offer

**Free, always:** finding and joining workouts, posting one, group chats, the race calendar and
forums, clubs, badges, leaderboards, and the first week of any race plan, plus this week's kilometres.

|                   | Price (VAT included)                    | What it is                                               |
| ----------------- | --------------------------------------- | -------------------------------------------------------- |
| **Plus, monthly** | 3,99 € / month                          | Everything in Plus, cancel any time                      |
| **Plus, yearly**  | 29,99 € / year (2,50 €/month, 37 % off) | Same, best value                                         |
| **Race pass**     | 6,99 € once                             | The full training plan for **one** race, no subscription |

**14 days free** on a first subscription (card needed; cancel before the end and nothing is charged).

What Plus adds:

1. **Training plans** for any race on the calendar: week by week, built from the distance and date,
   the person's level and days per week (`packages/shared/src/trainingPlan.ts`). Easy weeks, a
   taper, and a note when there isn't time to build up safely.
2. **Progress statistics:** a 12-week chart, streak, longest workout, sport split, usual partners.
3. **Calendar export:** the whole plan and your upcoming workouts as an `.ics` file for any calendar app.
4. **Plus badge** on the profile.

**Why these prices.** Strava charges about 12 € a month, TrainingPeaks 20 € and up; local runners
and club cyclists won't pay that for a social app. 3,99 € is a coffee-and-a-bit; the yearly price
is one race entry's worth a year. The race pass exists because training is seasonal: one goal
shouldn't force a subscription (it's cheaper than two months, and the yearly plan only wins from
five passes a year, which is also why a pass doesn't undercut the plan for regulars). The free
tier stays complete on purpose, because the app only works if lots of people use it.

All amounts live in **one file**, `packages/shared/src/plans.ts`, which feeds the pricing page,
the terms and the tests (which fail if a price drifts past what's reasonable). The amount actually
charged is the one on the Stripe price, so change both (see [Running it](#running-it)).

## How it works

```
Browser ──(signed in)──▶ billing function ──▶ Stripe Checkout (hosted page)
                                                        │ pays
Stripe ──(signed webhook)──▶ stripe-webhook function ──▶ subscriptions / race_passes tables
Browser ◀──(my_entitlements())── database (people can only read their own row)
```

- **Nobody can give themselves a plan.** The plan tables allow reading your own row and nothing
  else; only the webhook (service-role key, on the server) writes. A test fails the build if any
  grant ever lets a signed-in or anonymous user write them.
- **Webhooks are verified** (HMAC signature, 5-minute window against replays), handled once
  (event ids are remembered) and re-read from Stripe, so late or out-of-order events can't leave an
  old state. All of this is in `supabase/functions/_shared/stripe.ts` and unit-tested.
- **Card details never touch PaceMates**: Stripe's hosted page takes them.
- **Deleting an account cancels its subscription first**, and refuses to delete if that fails, so
  no one is charged for an account that no longer exists.
- **Preview mode** (no Supabase) has pretend plans with the same rules, so everything can be tried
  and tested without payments.

## Switching payments on

You need: a Stripe account, the Supabase CLI (`npm i -g supabase`), and your Supabase project.

### 1. Database

Apply the new migration (`20261122120000_paid_plans.sql`) the way you applied the others
(`DATABASE_URL=… pnpm db:migrate`, or paste it into the Supabase SQL editor).

### 2. Stripe: products and prices

Stripe Dashboard (start in **Test mode**), Product catalogue → Add product:

1. **PaceMates Plus** with two recurring prices in EUR: **3,99 €** monthly and **29,99 €** yearly.
   Set _Tax behaviour_ to **Inclusive**.
2. **Varžybų leidimas (race pass)**: one-off price **6,99 €**, tax behaviour inclusive.

Copy the three price ids (`price_…`).

### 3. Stripe: settings

- **Settings → Branding / Public details:** your business name, support email, and the
  **Terms of service** and **Privacy policy** addresses (`https://<your-site>/salygos`,
  `https://<your-site>/privatumas`): Checkout shows the terms checkbox from these.
- **Settings → Billing → Customer portal:** turn on _Cancel subscription_ (at period end),
  _Update payment method_ and _Invoice history_. This is the page behind "Tvarkyti prenumeratą".
- **Settings → Billing → Subscriptions and emails:** turn on _Send emails about expiring trials_
  and _Send emails about upcoming renewals_; they're required in the EU for trials and good practice
  for renewals.
- **Tax:** set up Stripe Tax and register for VAT where you need to (for a Lithuanian company selling
  digital services to EU consumers that normally means VAT + the One Stop Shop scheme: ask your
  accountant). Then set `STRIPE_AUTOMATIC_TAX=true` below.
- **Radar** (fraud) is on by default; leave it on.

### 4. Supabase: secrets and functions

```bash
supabase login
supabase link --project-ref <your-project-ref>

supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PRICE_PLUS_MONTH=price_... \
  STRIPE_PRICE_PLUS_YEAR=price_... \
  STRIPE_PRICE_RACE_PASS=price_... \
  SITE_URL=https://your-site.example          # comma-separate more than one address
# Only when Stripe Tax is set up:
supabase secrets set STRIPE_AUTOMATIC_TAX=true

supabase functions deploy billing
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe has no Supabase login
```

### 5. Stripe: the webhook

Developers → Webhooks → Add endpoint:

- URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

Copy the **signing secret** (`whsec_…`) and set it:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Testing before going live

With test-mode keys, everything is free to try; use card **4242 4242 4242 4242**, any future
date, any CVC (other test cards: 4000 0000 0000 9995 declines; 4000 0025 0000 3155 asks for 3-D Secure).

1. Sign in, open **/plus**, pick monthly: Stripe shows a 14-day trial. Pay → you land back on
   `/plus?paid=plus`, Plus is active within a few seconds.
2. Open a race page → Pasiruošimas → the full plan unlocks. Open **/stats** → the full view.
3. Settings → _Prenumerata_ → _Tvarkyti_: the Stripe portal opens; cancel → the app shows
   "baigiasi <date>" and Plus keeps working until then.
4. Buy a **race pass** with a different account (no subscription): only that race's plan unlocks.
5. Try to subscribe again while subscribed: the app says you already have access.
6. **Trial end and renewal:** Stripe → _Test clocks_ lets you jump time forward; check the status goes
   trialing → active, and that a declined card (4000 0000 0000 0341 after the trial) goes to past_due
   but keeps access until the period ends.
7. Delete a test account that has a subscription: the subscription disappears in Stripe too.
8. Watch **Supabase → Edge Functions → Logs** for `stripe-webhook`, and Stripe → Developers →
   Webhooks → recent deliveries (all should be 200). A 400 means the signing secret is wrong.

> The Stripe round trip itself (steps above) has **not** been run: no Stripe account was available
> when this was built, and the two functions weren't run (Deno isn't installed there). What _is_ tested
> automatically: the signature check, replays, forged requests, subscription mapping for both Stripe
> API shapes, checkout parameters, return-address safety, the database permissions (read own row only,
> no writes), entitlement rules and the pricing page. Treat step 1–8 as required before charging anyone.

## Going live

- [ ] Operator details filled in (`apps/web/src/content/legal.ts`) and the terms/privacy updated
      for payments (they are: sections on paid plans and on Stripe as a processor) – **have a lawyer read them**
- [ ] Stripe account activated (identity, bank account); VAT sorted with your accountant
- [ ] Repeat steps 2–5 above in **live mode**: new `sk_live_…` key, **new live price ids**, new
      webhook endpoint with its own `whsec_…`; set them with `supabase secrets set`
- [ ] Place one real order with your own card and refund it
- [ ] Stripe → Settings → Billing → _Revenue recovery_: smart retries and failed-payment emails on
- [ ] Add `STRIPE_*`-related alerts: Stripe → Developers → Webhooks → email me on failures

## Running it

- **Who is subscribed:** Stripe Dashboard → Customers; or in Supabase SQL:
  `select user_id, plan, status, current_period_end from subscriptions order by updated_at desc;`
- **Refunds:** refund in Stripe. A _subscription_ refund doesn't remove access by itself: cancel the
  subscription too. A _race pass_ refund: `delete from race_passes where stripe_session_id = 'cs_…';`
- **Consumer rights.** EU buyers can withdraw within 14 days, but for digital services that start
  straight away they agree to that at checkout (the terms checkbox) and then pay for what they used.
  Be generous in practice: refund anyone who asks in the first days and hasn't used much.
- **Changing a price:** Stripe prices can't be edited. Create a new price on the product, update the
  secret (`supabase secrets set STRIPE_PRICE_…=price_new`) and the amount in `plans.ts`; existing
  subscribers keep their old price until you move them.
- **Free trial length / price experiments:** `TRIAL_DAYS` in `plans.ts` and the function's `TRIAL_DAYS`
  (supabase/functions/billing) – change both.
- **A person says they paid but have no access:** Stripe → Developers → Webhooks → recent deliveries
  for their payment; resend the event. The webhook is safe to resend.

## Limits and honest notes

- **The paywall is "soft" for the two computed features.** The training-plan builder and the
  statistics are code in the app, so someone technical could read the code and generate plans without
  paying. They can't get anything that lives on the server (there is nothing like that behind Plus yet),
  and the people willing to do that are not the people who would have paid. If it ever matters, move the
  plan builder into an edge function that checks `my_entitlements()` before answering.
- **No recurring workouts.** They were considered and dropped: posting is rate limited (3 a minute, 15 a day) to stop abuse, and exempting paying users needs a server-side function of its own.
- **No coupons or team plans yet.** Stripe promotion codes work at checkout (`allow_promotion_codes`),
  so you can hand out codes (for clubs, races, press) without code changes.
