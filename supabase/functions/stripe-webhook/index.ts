// Supabase Edge Function: Stripe calls this when something happens to a payment or subscription.
// It is the ONLY thing that writes plans, so it trusts nothing until the signature checks out.
//
// Deploy WITHOUT the JWT check (Stripe has no Supabase login):
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Then add its address in Stripe → Developers → Webhooks. Setup: docs/PAYMENTS.md.
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  toRacePass,
  toSubscriptionRow,
  verifyStripeSignature,
  type StripeCheckoutSession,
  type StripeSubscription,
} from '../_shared/stripe.ts'

const env = (name: string) => Deno.env.get(name) ?? ''
const PRICES = { month: env('STRIPE_PRICE_PLUS_MONTH'), year: env('STRIPE_PRICE_PLUS_YEAR') }

const log = (level: 'info' | 'error', message: string, fields: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }))

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}` },
  })
  if (!res.ok) throw new Error(`Stripe ${path}: ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // The raw text, exactly as sent: the signature is over these bytes.
  const body = await req.text()
  const valid = await verifyStripeSignature(
    body,
    req.headers.get('Stripe-Signature'),
    env('STRIPE_WEBHOOK_SECRET'),
    Math.floor(Date.now() / 1000),
  )
  if (!valid) {
    log('error', 'webhook signature rejected')
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body) as {
    id: string
    type: string
    data: { object: Record<string, unknown> }
  }
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

  // Stripe can deliver an event twice. The first time wins; repeats are acknowledged and ignored.
  const { error: seen } = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })
  if (seen?.code === '23505') return new Response('Already handled', { status: 200 })
  if (seen) {
    log('error', 'could not record event', { id: event.id, error: seen.message })
    return new Response('Try again', { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        // A one-off race pass. (Subscriptions arrive as customer.subscription.* events.)
        const pass = toRacePass(event.data.object as unknown as StripeCheckoutSession)
        if (pass) {
          const { error } = await admin
            .from('race_passes')
            .upsert(pass, { onConflict: 'user_id,race_slug' })
          if (error) throw error
          log('info', 'race pass recorded', { race: pass.race_slug })
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Ask Stripe for the subscription as it is now, so late or out-of-order events can't
        // leave an old state behind.
        const sub = (await stripeGet(
          `subscriptions/${(event.data.object as { id: string }).id}`,
        )) as StripeSubscription
        const row = toSubscriptionRow(sub, PRICES)
        if (!row) break
        let userId = sub.metadata?.user_id
        if (!userId) {
          const { data } = await admin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', row.stripe_customer_id)
            .maybeSingle()
          userId = data?.user_id
        }
        if (!userId) {
          log('error', 'subscription with no user', { subscription: sub.id })
          break
        }
        const { error } = await admin
          .from('subscriptions')
          .upsert(
            { user_id: userId, ...row, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          )
        if (error) throw error
        log('info', 'subscription saved', { status: row.status, plan: row.plan })
        break
      }
      default:
        break // Other events aren't needed.
    }
  } catch (e) {
    // Let Stripe retry: forget we saw it, so the retry is processed.
    await admin.from('stripe_events').delete().eq('id', event.id)
    log('error', 'webhook failed', { id: event.id, type: event.type, error: String(e) })
    return new Response('Failed', { status: 500 })
  }
  return new Response('ok', { status: 200 })
})
