// Supabase Edge Function: starts payments for the signed-in person.
//
//   POST /functions/v1/billing   { action: 'checkout' | 'portal' | 'cancel', request?, returnUrl }
//   → { url }   (a Stripe-hosted page to send the person to; null for 'cancel')
//   → { error: 'already_has_access' | 'payments_off' | 'unauthorized' | 'bad_request' | … }
//
// The Stripe secret key lives only here. Setup and the settings it needs: docs/PAYMENTS.md.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { allowedOrigin, checkoutParams, isRaceSlug } from '../_shared/stripe.ts'

const TRIAL_DAYS = 14

const env = (name: string) => Deno.env.get(name) ?? ''
const PRICES = {
  month: env('STRIPE_PRICE_PLUS_MONTH'),
  year: env('STRIPE_PRICE_PLUS_YEAR'),
  racePass: env('STRIPE_PRICE_RACE_PASS'),
}

const cors = {
  'Access-Control-Allow-Origin': '*', // the answer is only useful with the caller's own sign-in token
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

/** One call to Stripe's REST API (no SDK needed). */
async function stripe(path: string, method: string, body?: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe ${path}: ${data?.error?.message ?? res.status}`)
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'bad_request' }, 405)
  if (!env('STRIPE_SECRET_KEY') || !PRICES.month || !PRICES.year || !PRICES.racePass) {
    return json({ error: 'payments_off' }, 503)
  }

  // Who is asking: the person's own sign-in token, checked by Supabase.
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)
  const asUser = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'))
  const { data: auth, error: authError } = await asUser.auth.getUser(token)
  if (authError || !auth.user) return json({ error: 'unauthorized' }, 401)
  const user = auth.user

  let input: { action?: string; request?: unknown; returnUrl?: unknown }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  // Only ever send people back to the site's own address, never one the caller supplies.
  const origin = allowedOrigin(input.returnUrl, env('SITE_URL'))
  if (!origin) return json({ error: 'bad_request' }, 400)

  // Plan tables can only be written with the service-role key, which stays on the server.
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
  const { data: sub } = await admin
    .from('subscriptions')
    .select('status, current_period_end, stripe_customer_id, stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  try {
    if (input.action === 'checkout') {
      const request = input.request as
        { kind?: string; plan?: string; raceSlug?: string } | undefined
      const live =
        !!sub &&
        (['trialing', 'active'].includes(sub.status) ||
          (sub.status === 'past_due' && new Date(sub.current_period_end ?? 0) > new Date()))
      let checkout
      if (
        request?.kind === 'plus' &&
        (request.plan === 'plus_month' || request.plan === 'plus_year')
      ) {
        if (live) return json({ error: 'already_has_access' }, 409)
        checkout = { kind: 'plus' as const, plan: request.plan }
      } else if (request?.kind === 'race_pass' && isRaceSlug(request.raceSlug)) {
        const { data: pass } = await admin
          .from('race_passes')
          .select('race_slug')
          .eq('user_id', user.id)
          .eq('race_slug', request.raceSlug)
          .maybeSingle()
        if (live || pass) return json({ error: 'already_has_access' }, 409)
        checkout = { kind: 'race_pass' as const, raceSlug: request.raceSlug }
      } else {
        return json({ error: 'bad_request' }, 400)
      }
      const session = await stripe(
        'checkout/sessions',
        'POST',
        checkoutParams({
          request: checkout,
          userId: user.id,
          email: user.email ?? null,
          customerId: sub?.stripe_customer_id ?? null,
          // The free trial is for first-time subscribers only.
          trialDays: sub ? 0 : TRIAL_DAYS,
          prices: PRICES,
          origin,
          automaticTax: env('STRIPE_AUTOMATIC_TAX') === 'true',
        }),
      )
      return json({ url: session.url })
    }

    if (input.action === 'portal') {
      if (!sub?.stripe_customer_id) return json({ error: 'no_subscription' }, 404)
      const session = await stripe(
        'billing_portal/sessions',
        'POST',
        new URLSearchParams({ customer: sub.stripe_customer_id, return_url: `${origin}/settings` }),
      )
      return json({ url: session.url })
    }

    if (input.action === 'cancel') {
      // Called before an account is deleted: end the subscription now so no more charges happen.
      if (sub?.stripe_subscription_id && sub.status !== 'canceled') {
        await stripe(`subscriptions/${sub.stripe_subscription_id}`, 'DELETE')
      }
      return json({ url: null })
    }

    return json({ error: 'bad_request' }, 400)
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', message: 'billing failed', error: String(e) }))
    return json({ error: 'payment_failed' }, 502)
  }
})
