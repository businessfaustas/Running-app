/*
 * The parts of the Stripe integration that must be exactly right, kept free of secrets, network
 * calls and Deno-only APIs so they can be unit tested (packages/shared/src/stripe.test.ts):
 * webhook signature checking, turning Stripe's data into our rows, and building checkout requests.
 */

/** Seconds a webhook's timestamp may differ from now: stops an old, captured request being replayed. */
export const SIGNATURE_TOLERANCE_SECONDS = 300

const encoder = new TextEncoder()

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string comparison, so the check doesn't leak how many characters matched. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** HMAC-SHA256 of `${timestamp}.${body}` – what Stripe puts in the Stripe-Signature header. */
export async function signPayload(
  secret: string,
  timestamp: number,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)))
}

/**
 * Checks a webhook really came from Stripe: header `t=<unix>,v1=<hex>[,v1=<hex>…]`. Valid when
 * any v1 matches and the timestamp is recent. Anything malformed is simply "not valid".
 */
export async function verifyStripeSignature(
  body: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds: number,
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS,
): Promise<boolean> {
  if (!header || !secret) return false
  let timestamp = NaN
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=')
    if (key === 't') timestamp = Number(value)
    else if (key === 'v1' && value) signatures.push(value)
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false
  const expected = await signPayload(secret, timestamp, body)
  return signatures.some((s) => safeEqual(s, expected))
}

export type OurStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

/** Stripe's subscription states → ours. `null`: not a subscription we should record yet. */
export function mapStatus(status: string): OurStatus | null {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    default:
      // 'incomplete' (first payment pending) and 'paused': nothing to unlock yet.
      return null
  }
}

/** The parts of a Stripe subscription object we read. */
export interface StripeSubscription {
  id: string
  customer: string | { id: string }
  status: string
  cancel_at_period_end?: boolean
  cancel_at?: number | null
  trial_end?: number | null
  current_period_end?: number | null
  metadata?: Record<string, string> | null
  items?: {
    data?: { price?: { id?: string } | null; current_period_end?: number | null }[]
  } | null
}

export interface SubscriptionRow {
  status: OurStatus
  plan: 'plus_month' | 'plus_year'
  current_period_end: string | null
  trial_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string
  stripe_subscription_id: string
}

const iso = (seconds: number | null | undefined) =>
  typeof seconds === 'number' && seconds > 0 ? new Date(seconds * 1000).toISOString() : null

/**
 * Our row for a Stripe subscription, or null when it isn't one to record. Newer Stripe API
 * versions keep the period on the subscription item, older ones on the subscription itself.
 */
export function toSubscriptionRow(
  sub: StripeSubscription,
  prices: { month: string; year: string },
): SubscriptionRow | null {
  const status = mapStatus(sub.status)
  if (!status) return null
  const item = sub.items?.data?.[0]
  const priceId = item?.price?.id
  // A price we don't know is not ours to unlock anything for.
  const plan =
    priceId === prices.year ? 'plus_year' : priceId === prices.month ? 'plus_month' : null
  if (!plan) return null
  return {
    status,
    plan,
    current_period_end: iso(sub.current_period_end ?? item?.current_period_end),
    trial_end: iso(sub.trial_end),
    // Cancelling is either "at period end" or a scheduled cancel date; both mean it won't renew.
    cancel_at_period_end: sub.cancel_at_period_end === true || (sub.cancel_at ?? 0) > 0,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
  }
}

export interface CheckoutInput {
  request:
    { kind: 'plus'; plan: 'plus_month' | 'plus_year' } | { kind: 'race_pass'; raceSlug: string }
  userId: string
  email: string | null
  /** Stripe customer id of someone who has subscribed before. */
  customerId: string | null
  /** First subscription: offer the free trial. */
  trialDays: number
  prices: { month: string; year: string; racePass: string }
  /** Where Stripe sends people back to (the site's own origin, already checked). */
  origin: string
  automaticTax: boolean
}

/** Race slugs are stored with passes; allow only the shape our own slugs have. */
export const isRaceSlug = (slug: unknown): slug is string =>
  typeof slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 80

/**
 * The form body for POST /v1/checkout/sessions. Subscriptions carry the user id in both the
 * session and the subscription metadata, so the webhook can always tell whose it is.
 */
export function checkoutParams(input: CheckoutInput): URLSearchParams {
  const p = new URLSearchParams()
  const { request, origin } = input
  p.set('client_reference_id', input.userId)
  p.set('metadata[user_id]', input.userId)
  p.set('locale', 'lt')
  p.set('line_items[0][quantity]', '1')
  p.set('allow_promotion_codes', 'true')
  // Shows the "I agree to the terms" box (the terms address is set in the Stripe dashboard).
  p.set('consent_collection[terms_of_service]', 'required')
  if (input.automaticTax) p.set('automatic_tax[enabled]', 'true')
  if (input.customerId) p.set('customer', input.customerId)
  else if (input.email) p.set('customer_email', input.email)

  if (request.kind === 'plus') {
    p.set('mode', 'subscription')
    p.set(
      'line_items[0][price]',
      request.plan === 'plus_year' ? input.prices.year : input.prices.month,
    )
    p.set('subscription_data[metadata][user_id]', input.userId)
    if (input.trialDays > 0) p.set('subscription_data[trial_period_days]', String(input.trialDays))
    p.set('success_url', `${origin}/plus?paid=plus`)
    p.set('cancel_url', `${origin}/plus`)
  } else {
    p.set('mode', 'payment')
    p.set('line_items[0][price]', input.prices.racePass)
    p.set('metadata[race_slug]', request.raceSlug)
    p.set('payment_intent_data[metadata][user_id]', input.userId)
    p.set('payment_intent_data[metadata][race_slug]', request.raceSlug)
    p.set('success_url', `${origin}/races/${request.raceSlug}?paid=pass`)
    p.set('cancel_url', `${origin}/races/${request.raceSlug}`)
    if (!input.customerId) p.set('customer_creation', 'always')
  }
  return p
}

/**
 * The origin to send people back to: only the site's own addresses (SITE_URL, comma separated),
 * never one a caller supplies, so a payment page can't be pointed at someone else's site.
 */
export function allowedOrigin(requested: unknown, allowed: string): string | null {
  if (typeof requested !== 'string') return null
  let origin: string
  try {
    origin = new URL(requested).origin
  } catch {
    return null
  }
  const list = allowed
    .split(',')
    .map((a) => a.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return list.includes(origin) ? origin : null
}

/** Pulls the fields we use from a checkout.session object. */
export interface StripeCheckoutSession {
  id: string
  mode: 'payment' | 'subscription' | 'setup'
  payment_status: 'paid' | 'unpaid' | 'no_payment_required'
  client_reference_id?: string | null
  metadata?: Record<string, string> | null
}

/** A race pass to record, from a paid one-off checkout; null for anything else. */
export function toRacePass(
  session: StripeCheckoutSession,
): { user_id: string; race_slug: string; stripe_session_id: string } | null {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return null
  const userId = session.client_reference_id ?? session.metadata?.user_id
  const slug = session.metadata?.race_slug
  if (!userId || !isRaceSlug(slug)) return null
  return { user_id: userId, race_slug: slug, stripe_session_id: session.id }
}
