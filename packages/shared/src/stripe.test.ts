import { describe, expect, it } from 'vitest'
import {
  allowedOrigin,
  checkoutParams,
  isRaceSlug,
  mapStatus,
  signPayload,
  toRacePass,
  toSubscriptionRow,
  verifyStripeSignature,
  type CheckoutInput,
} from '../../../supabase/functions/_shared/stripe'

const SECRET = 'whsec_test_secret'
const BODY = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' })
const NOW = 1_800_000_000

describe('verifyStripeSignature', () => {
  it('accepts a correctly signed, recent request', async () => {
    const v1 = await signPayload(SECRET, NOW, BODY)
    expect(await verifyStripeSignature(BODY, `t=${NOW},v1=${v1}`, SECRET, NOW)).toBe(true)
  })

  it('accepts when any of several signatures matches (secret rotation)', async () => {
    const v1 = await signPayload(SECRET, NOW, BODY)
    expect(await verifyStripeSignature(BODY, `t=${NOW},v1=deadbeef,v1=${v1}`, SECRET, NOW)).toBe(
      true,
    )
  })

  it('rejects a changed body, a wrong secret and a forged signature', async () => {
    const v1 = await signPayload(SECRET, NOW, BODY)
    expect(await verifyStripeSignature(BODY + ' ', `t=${NOW},v1=${v1}`, SECRET, NOW)).toBe(false)
    expect(await verifyStripeSignature(BODY, `t=${NOW},v1=${v1}`, 'whsec_other', NOW)).toBe(false)
    expect(await verifyStripeSignature(BODY, `t=${NOW},v1=${'0'.repeat(64)}`, SECRET, NOW)).toBe(
      false,
    )
  })

  it('rejects an old request even when the signature is right (replay)', async () => {
    const v1 = await signPayload(SECRET, NOW - 301, BODY)
    expect(await verifyStripeSignature(BODY, `t=${NOW - 301},v1=${v1}`, SECRET, NOW)).toBe(false)
    const fresh = await signPayload(SECRET, NOW - 299, BODY)
    expect(await verifyStripeSignature(BODY, `t=${NOW - 299},v1=${fresh}`, SECRET, NOW)).toBe(true)
  })

  it('rejects missing, empty and malformed headers and an empty secret', async () => {
    const v1 = await signPayload(SECRET, NOW, BODY)
    for (const header of [
      null,
      undefined,
      '',
      'garbage',
      `v1=${v1}`,
      `t=abc,v1=${v1}`,
      `t=${NOW}`,
    ]) {
      expect(await verifyStripeSignature(BODY, header, SECRET, NOW)).toBe(false)
    }
    expect(await verifyStripeSignature(BODY, `t=${NOW},v1=${v1}`, '', NOW)).toBe(false)
  })
})

const PRICES = { month: 'price_month', year: 'price_year', racePass: 'price_pass' }

describe('toSubscriptionRow', () => {
  const sub = {
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    items: { data: [{ price: { id: 'price_year' }, current_period_end: 1_900_000_000 }] },
  }

  it('maps a yearly subscription, reading the period from the item (new API) or the subscription (old)', () => {
    expect(toSubscriptionRow(sub, PRICES)).toMatchObject({
      status: 'active',
      plan: 'plus_year',
      current_period_end: new Date(1_900_000_000 * 1000).toISOString(),
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      cancel_at_period_end: false,
    })
    const old = {
      ...sub,
      current_period_end: 1_850_000_000,
      items: { data: [{ price: { id: 'price_month' } }] },
    }
    expect(toSubscriptionRow(old, PRICES)).toMatchObject({
      plan: 'plus_month',
      current_period_end: new Date(1_850_000_000 * 1000).toISOString(),
    })
  })

  it('knows a trial, and both ways of "will not renew"', () => {
    expect(
      toSubscriptionRow({ ...sub, status: 'trialing', trial_end: 1_801_000_000 }, PRICES),
    ).toMatchObject({
      status: 'trialing',
      trial_end: new Date(1_801_000_000 * 1000).toISOString(),
    })
    expect(
      toSubscriptionRow({ ...sub, cancel_at_period_end: true }, PRICES)!.cancel_at_period_end,
    ).toBe(true)
    expect(
      toSubscriptionRow({ ...sub, cancel_at: 1_900_000_000 }, PRICES)!.cancel_at_period_end,
    ).toBe(true)
  })

  it('handles the customer as an object', () => {
    expect(
      toSubscriptionRow({ ...sub, customer: { id: 'cus_9' } }, PRICES)!.stripe_customer_id,
    ).toBe('cus_9')
  })

  it('ignores prices that are not ours, and payments still pending', () => {
    expect(
      toSubscriptionRow({ ...sub, items: { data: [{ price: { id: 'price_other' } }] } }, PRICES),
    ).toBeNull()
    expect(toSubscriptionRow({ ...sub, items: { data: [] } }, PRICES)).toBeNull()
    expect(toSubscriptionRow({ ...sub, items: null }, PRICES)).toBeNull()
    expect(toSubscriptionRow({ ...sub, status: 'incomplete' }, PRICES)).toBeNull()
    expect(toSubscriptionRow({ ...sub, status: 'paused' }, PRICES)).toBeNull()
  })
})

describe('mapStatus', () => {
  it('maps every Stripe state to ours', () => {
    expect(mapStatus('trialing')).toBe('trialing')
    expect(mapStatus('active')).toBe('active')
    expect(mapStatus('past_due')).toBe('past_due')
    expect(mapStatus('unpaid')).toBe('past_due')
    expect(mapStatus('canceled')).toBe('canceled')
    expect(mapStatus('incomplete_expired')).toBe('canceled')
    expect(mapStatus('incomplete')).toBeNull()
    expect(mapStatus('something_new')).toBeNull()
  })
})

const base: CheckoutInput = {
  request: { kind: 'plus', plan: 'plus_month' },
  userId: 'user-1',
  email: 'a@b.lt',
  customerId: null,
  trialDays: 14,
  prices: PRICES,
  origin: 'https://pacemates.example',
  automaticTax: false,
}

describe('checkoutParams', () => {
  it('builds a subscription checkout with the trial and the user id on both session and subscription', () => {
    const p = checkoutParams(base)
    expect(p.get('mode')).toBe('subscription')
    expect(p.get('line_items[0][price]')).toBe('price_month')
    expect(p.get('subscription_data[trial_period_days]')).toBe('14')
    expect(p.get('client_reference_id')).toBe('user-1')
    expect(p.get('subscription_data[metadata][user_id]')).toBe('user-1')
    expect(p.get('customer_email')).toBe('a@b.lt')
    expect(p.get('success_url')).toBe('https://pacemates.example/plus?paid=plus')
    expect(p.get('consent_collection[terms_of_service]')).toBe('required')
    expect(p.get('locale')).toBe('lt')
  })

  it('picks the yearly price, skips the trial for returning customers and reuses their customer', () => {
    const p = checkoutParams({
      ...base,
      request: { kind: 'plus', plan: 'plus_year' },
      trialDays: 0,
      customerId: 'cus_1',
    })
    expect(p.get('line_items[0][price]')).toBe('price_year')
    expect(p.has('subscription_data[trial_period_days]')).toBe(false)
    expect(p.get('customer')).toBe('cus_1')
    expect(p.has('customer_email')).toBe(false)
  })

  it('builds a one-off race pass that remembers which race', () => {
    const p = checkoutParams({
      ...base,
      request: { kind: 'race_pass', raceSlug: 'klaipedos-maratonas' },
    })
    expect(p.get('mode')).toBe('payment')
    expect(p.get('line_items[0][price]')).toBe('price_pass')
    expect(p.get('metadata[race_slug]')).toBe('klaipedos-maratonas')
    expect(p.has('subscription_data[trial_period_days]')).toBe(false)
    expect(p.get('success_url')).toBe(
      'https://pacemates.example/races/klaipedos-maratonas?paid=pass',
    )
  })

  it('turns on automatic tax only when asked', () => {
    expect(checkoutParams(base).has('automatic_tax[enabled]')).toBe(false)
    expect(checkoutParams({ ...base, automaticTax: true }).get('automatic_tax[enabled]')).toBe(
      'true',
    )
  })
})

describe('allowedOrigin', () => {
  const allowed = 'https://pacemates.example, https://www.pacemates.example/'
  it('accepts only the site’s own origins, and returns the bare origin', () => {
    expect(allowedOrigin('https://pacemates.example/plus?x=1', allowed)).toBe(
      'https://pacemates.example',
    )
    expect(allowedOrigin('https://www.pacemates.example', allowed)).toBe(
      'https://www.pacemates.example',
    )
  })
  it('rejects look-alikes, other hosts, other schemes and junk', () => {
    for (const bad of [
      'https://pacemates.example.evil.com',
      'https://evilpacemates.example',
      'http://pacemates.example',
      'https://evil.com/?https://pacemates.example',
      'javascript:alert(1)',
      'not a url',
      '',
      null,
      42,
    ]) {
      expect(allowedOrigin(bad, allowed)).toBeNull()
    }
    expect(allowedOrigin('https://pacemates.example', '')).toBeNull()
  })
})

describe('race passes', () => {
  it('accepts only slugs shaped like ours', () => {
    expect(isRaceSlug('trail-kursiu-nerija')).toBe(true)
    for (const bad of ['', 'Has Caps', 'a/b', '../x', 'a--b-', 'x'.repeat(81), null, 5])
      expect(isRaceSlug(bad)).toBe(false)
  })

  it('records a pass only for a paid one-off checkout with a race on it', () => {
    const paid = {
      id: 'cs_1',
      mode: 'payment' as const,
      payment_status: 'paid' as const,
      client_reference_id: 'user-1',
      metadata: { race_slug: 'vilties-begimas' },
    }
    expect(toRacePass(paid)).toEqual({
      user_id: 'user-1',
      race_slug: 'vilties-begimas',
      stripe_session_id: 'cs_1',
    })
    expect(toRacePass({ ...paid, payment_status: 'unpaid' })).toBeNull()
    expect(toRacePass({ ...paid, mode: 'subscription' })).toBeNull()
    expect(toRacePass({ ...paid, metadata: {} })).toBeNull()
    expect(toRacePass({ ...paid, metadata: { race_slug: '../etc' } })).toBeNull()
    expect(toRacePass({ ...paid, client_reference_id: null })).toBeNull()
  })
})
