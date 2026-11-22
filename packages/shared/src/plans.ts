/*
 * What PaceMates costs and what the paid plan unlocks – one file, so prices and promises can't
 * drift apart between the pricing page, the checkout and the terms.
 *
 * The app itself is free: finding and joining workouts, posting them, chats, the race calendar
 * and forums, clubs, badges and leaderboards. PaceMates Plus adds tools for people who train
 * towards something. Change a price here AND in Stripe (docs/PAYMENTS.md); the amounts shown
 * to people come from this file, the amounts charged from Stripe.
 */

export const CURRENCY = 'EUR' as const

export const PRICES = {
  /** Per month, VAT included. */
  plusMonthCents: 399,
  /** Per year, VAT included – about 37 % below twelve monthly payments. */
  plusYearCents: 2999,
  /** One race, once, VAT included. Cheaper than a month-by-month plan for a single goal. */
  racePassCents: 699,
} as const

/** Free days at the start of a first subscription (card needed, cancel any time before it ends). */
export const TRIAL_DAYS = 14

export const PLAN_IDS = ['plus_month', 'plus_year'] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const SUBSCRIPTION_STATUSES = ['none', 'trialing', 'active', 'past_due', 'canceled'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/** What a person is entitled to right now. Computed on the server; the app only reads it. */
export interface Entitlements {
  /** True while a subscription is trialing, active, or paid up until its period ends. */
  plus: boolean
  status: SubscriptionStatus
  plan: PlanId | null
  /** ISO timestamp of the next renewal, or the end of access when it is cancelled. */
  renewsAt: string | null
  /** ISO timestamp when the free trial ends, while trialing. */
  trialEndsAt: string | null
  /** Cancelled, but still running until `renewsAt`. */
  cancelAtPeriodEnd: boolean
  /** Races whose full training plan was bought one-off. */
  racePasses: string[]
}

export const NO_ENTITLEMENTS: Entitlements = {
  plus: false,
  status: 'none',
  plan: null,
  renewsAt: null,
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
  racePasses: [],
}

/** Full training plan for a race: with Plus, or with a pass bought for that race. */
export const hasRaceAccess = (e: Entitlements, raceSlug: string) =>
  e.plus || e.racePasses.includes(raceSlug)

export type CheckoutRequest =
  { kind: 'plus'; plan: PlanId } | { kind: 'race_pass'; raceSlug: string }

/** "3,99 €" – Lithuanian style: comma, space, symbol after. */
export function formatPrice(cents: number): string {
  const euros = cents / 100
  const text = Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace('.', ',')
  return `${text} €`
}

/** How much cheaper the yearly plan is than twelve monthly payments, in whole percent. */
export const yearlySavingsPercent = () =>
  Math.round((1 - PRICES.plusYearCents / (PRICES.plusMonthCents * 12)) * 100)

/** What the yearly plan costs per month, for "from 2,50 € a month" lines. */
export const yearlyPerMonthCents = () => Math.round(PRICES.plusYearCents / 12)

export interface PlusFeature {
  id: 'race-plans' | 'stats' | 'calendar' | 'badge'
  title: string
  /** One sentence: what you get. */
  blurb: string
  /** What the free app already gives for it – shown next to the paid part, so the line is clear. */
  free: string
}

export const PLUS_FEATURES: PlusFeature[] = [
  {
    id: 'race-plans',
    title: 'Pasiruošimo planai',
    blurb:
      'Savaitė po savaitės planas bet kuriam kalendoriaus startui: ilgieji, tempo ir greičio treniruotės, lengvos savaitės ir mažinimas prieš startą – pagal tavo lygį ir kiek dienų gali sportuoti.',
    free: 'Pirmoji savaitė nemokamai',
  },
  {
    id: 'stats',
    title: 'Pažangos statistika',
    blurb:
      '12 savaičių kilometrų grafikas, serija iš eilės, ilgiausia treniruotė, sportų pasiskirstymas ir dažniausi bendražygiai.',
    free: 'Šios savaitės kilometrai',
  },
  {
    id: 'calendar',
    title: 'Kalendoriaus eksportas',
    blurb:
      'Visas pasiruošimo planas ir tavo būsimos treniruotės – vienu paspaudimu į telefono kalendorių (Google, Apple, Outlook), kad nieko nepraleistum.',
    free: 'Treniruotės matomos programoje',
  },
  {
    id: 'badge',
    title: 'Plus ženklelis',
    blurb:
      'Rėmelis aplink nuotrauką ir „Plus“ ženklelis profilyje – matyti, kas palaiko bendruomenę.',
    free: '—',
  },
]

export const PLUS_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Ar PaceMates lieka nemokama?',
    answer:
      'Taip. Treniruočių paieška, prisijungimas, jų skelbimas, pokalbiai, varžybų kalendorius ir forumai, klubai, ženkliukai ir lyderių lentelės – visa tai nemokama ir tokia liks. Plus skirtas tiems, kas treniruojasi link tikslo.',
  },
  {
    question: 'Kaip veikia nemokamas bandomasis laikotarpis?',
    answer: `Pirmą kartą užsisakius Plus, pirmosios ${TRIAL_DAYS} dienų nemokamos. Prieš pasibaigiant atsiųsime priminimą, o atšaukti galima bet kada – tada nieko nenuskaitysime.`,
  },
  {
    question: 'Kuo „Varžybų leidimas“ skiriasi nuo prenumeratos?',
    answer:
      'Tai vienkartinis mokėjimas už vienų varžybų pilną treniruočių planą – jokio pratęsimo. Verta, jei ruošiesi vienam startui. Jei ruošiesi penkiems ar daugiau startų per metus, metinė prenumerata pigesnė – be to, ji atrakina ir statistiką bei pasikartojančias treniruotes.',
  },
  {
    question: 'Ar galiu atšaukti?',
    answer:
      'Bet kada, nustatymuose („Prenumerata“). Prieiga lieka iki apmokėto laikotarpio pabaigos. Kaip vartotojas turi teisę atsisakyti pirkimo per 14 dienų – žr. naudojimo sąlygas.',
  },
  {
    question: 'Ar kaina su PVM?',
    answer:
      'Taip, nurodytos kainos jau su PVM. Apmokėjimą apdoroja Stripe; kortelės duomenų PaceMates nemato ir nesaugo.',
  },
]

/**
 * Reads the JSON the server's `my_entitlements()` returns. Anything missing or odd means "no
 * plan" – a bad response must never unlock a paid feature.
 */
export function parseEntitlements(raw: unknown): Entitlements {
  if (typeof raw !== 'object' || raw === null) return NO_ENTITLEMENTS
  const r = raw as Record<string, unknown>
  const status = SUBSCRIPTION_STATUSES.find((s) => s === r.status) ?? 'none'
  const plan = PLAN_IDS.find((p) => p === r.plan) ?? null
  const text = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)
  return {
    plus: r.plus === true && status !== 'none' && status !== 'canceled',
    status,
    plan,
    renewsAt: text(r.renewsAt),
    trialEndsAt: text(r.trialEndsAt),
    cancelAtPeriodEnd: r.cancelAtPeriodEnd === true,
    racePasses: Array.isArray(r.racePasses)
      ? r.racePasses.filter((x): x is string => typeof x === 'string')
      : [],
  }
}
