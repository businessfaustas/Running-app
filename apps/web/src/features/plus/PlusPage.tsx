import {
  formatPrice,
  PLUS_FAQ,
  PLUS_FEATURES,
  PRICES,
  TRIAL_DAYS,
  yearlyPerMonthCents,
  yearlySavingsPercent,
  type PlanId,
  type PlusFeature,
} from '@pacemates/shared'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  BadgeCheck,
  CalendarPlus,
  Check,
  ChevronDown,
  Route,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { backend } from '../../backend'
import { Button, ButtonLink } from '../../components/Button'
import { PlusBadge } from '../../components/PlusBadge'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import { useBillingPortal, useEntitlements } from '../../data/hooks'
import { paymentsEnabled } from '../../data/payments'
import { track } from '../../lib/analytics'
import { toastError } from '../../lib/toast'
import { usePageMeta } from '../../lib/usePageMeta'
import { describePlan } from './planText'
import { usePurchase } from './usePurchase'

const FEATURE_ICONS: Record<PlusFeature['id'], LucideIcon> = {
  'race-plans': Route,
  stats: TrendingUp,
  calendar: CalendarPlus,
  badge: BadgeCheck,
}

const FREE_FOREVER = [
  'Treniruočių paieška ir prisijungimas',
  'Savų treniruočių skelbimas',
  'Grupių pokalbiai',
  'Varžybų kalendorius ir forumai',
  'Klubai',
  'Ženkliukai ir lyderių lentelės',
]

export function PlusPage() {
  usePageMeta({
    title: 'PaceMates Plus',
    description:
      'PaceMates lieka nemokama. Plus – pasiruošimo planai bet kuriems startams, pažangos statistika ir kalendoriaus eksportas nuo 3,99 € per mėnesį, 14 dienų nemokamai.',
  })
  const session = useSession()
  const { entitlements: plan } = useEntitlements()
  const { buy, pending } = usePurchase()
  const portal = useBillingPortal()
  const [billing, setBilling] = useState<PlanId>('plus_year')
  const [params] = useSearchParams()
  const justPaid = params.get('paid') === 'plus'
  const queryClient = useQueryClient()

  useEffect(() => {
    track('plus_viewed')
  }, [])

  // Right after paying, the confirmation can take a few seconds to reach us: look again for a while.
  useEffect(() => {
    if (!justPaid || plan.plus) return
    let tries = 0
    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ['entitlements'] })
      if (++tries >= 10) clearInterval(timer)
    }, 2000)
    return () => clearInterval(timer)
  }, [justPaid, plan.plus, queryClient])

  const returning = plan.status === 'canceled'
  const yearly = billing === 'plus_year'
  const price = yearly ? PRICES.plusYearCents : PRICES.plusMonthCents

  const openPortal = () =>
    portal.mutate(undefined, {
      onSuccess: ({ url }) => {
        if (url) window.location.assign(url)
      },
      onError: toastError,
    })

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <section className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-blue to-blue-deep pb-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-volt/10 blur-3xl"
          />
          <TopBar overlay fallback="/profile" />
          <div className="relative px-5 pt-24">
            <PlusBadge label="PaceMates Plus" className="px-2.5 py-1 text-[12px]" />
            <h1 className="headline mt-3 text-[40px] text-white">Treniruokis link tikslo</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-white/90">
              PaceMates lieka nemokama. Plus – tiems, kas ruošiasi startui: planas savaitė po
              savaitės, pažangos statistika ir viskas telefono kalendoriuje.
            </p>
          </div>
        </section>

        <div className="space-y-6 px-5 pt-6">
          {justPaid && (
            <p
              role="status"
              className="rounded-[20px] border border-volt/40 bg-volt/10 p-4 text-[14px] text-white"
            >
              {plan.plus
                ? 'Ačiū! Plus įjungtas – gero treniravimosi.'
                : 'Ačiū! Tvirtiname mokėjimą – tai užtrunka kelias sekundes…'}
            </p>
          )}

          {plan.plus ? (
            <ActivePlan plan={plan} onManage={openPortal} managing={portal.isPending} />
          ) : (
            <section
              aria-label="Kaina"
              className="rounded-[28px] border border-white/10 bg-surface p-5"
            >
              <div
                role="group"
                aria-label="Apmokėjimo laikotarpis"
                className="grid grid-cols-2 rounded-full bg-ink p-1"
              >
                {(
                  [
                    ['plus_month', 'Kas mėnesį'],
                    ['plus_year', `Kasmet · −${yearlySavingsPercent()} %`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={billing === id}
                    onClick={() => setBilling(id)}
                    className={clsx(
                      'h-11 rounded-full text-[13px] font-bold transition-colors',
                      billing === id ? 'bg-white text-black' : 'text-slate-300 hover:text-white',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mt-5 flex items-baseline gap-2">
                <span className="headline text-[52px] tabular">{formatPrice(price)}</span>
                <span className="text-[15px] font-semibold text-slate-400">
                  {yearly ? 'per metus' : 'per mėnesį'}
                </span>
              </p>
              <p className="text-[13px] text-slate-400">
                {yearly
                  ? `Tai tik ${formatPrice(yearlyPerMonthCents())} per mėnesį. Kaina su PVM.`
                  : 'Kaina su PVM. Atšaukti galima bet kada.'}
              </p>

              {paymentsEnabled ? (
                <Button
                  size="lg"
                  className="mt-5 w-full"
                  loading={pending}
                  onClick={() => buy({ kind: 'plus', plan: billing })}
                >
                  {returning ? 'Atnaujinti Plus' : `Pradėti ${TRIAL_DAYS} dienų nemokamai`}
                </Button>
              ) : (
                <p
                  role="status"
                  className="mt-5 rounded-[20px] bg-white/[0.06] p-4 text-center text-[14px] leading-relaxed font-semibold text-white"
                >
                  Plus pardavinėti pradėsime netrukus. Užsuk vėliau – ir nemokama programa tuo tarpu
                  veikia kaip veikusi.
                </p>
              )}
              <p className="mt-3 text-center text-[12.5px] leading-relaxed text-slate-400">
                {returning
                  ? 'Atšaukti galima bet kada nustatymuose.'
                  : `Pirmos ${TRIAL_DAYS} dienų nemokamos, paskui ${formatPrice(price)} ${yearly ? 'per metus' : 'per mėnesį'}. Atšauk bet kada – prieš pabaigą nieko nenuskaitysime.`}
              </p>
              {!session && (
                <p className="mt-2 text-center text-[12.5px] text-slate-500">
                  Pirmiausia prisijungsi arba susikursi paskyrą.
                </p>
              )}
              {backend.mode === 'demo' && (
                <p className="mt-3 rounded-[14px] bg-white/[0.04] p-3 text-center text-[12px] text-slate-400">
                  Peržiūros režimas: mokėjimas tik imituojamas, pinigai nemokami.
                </p>
              )}
            </section>
          )}

          <section aria-label="Ką gauni">
            <h2 className="headline text-[24px]">Ką gauni su Plus</h2>
            <ul className="mt-3 space-y-3">
              {PLUS_FEATURES.map((f) => {
                const Icon = FEATURE_ICONS[f.id]
                return (
                  <li
                    key={f.id}
                    className="flex gap-4 rounded-[24px] border border-white/[0.06] bg-surface p-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-volt text-black">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-bold text-white">{f.title}</h3>
                      <p className="mt-1 text-[14px] leading-relaxed text-slate-300">{f.blurb}</p>
                      {f.free !== '—' && (
                        <p className="mt-2 text-[12.5px] text-slate-500">
                          Be Plus: {f.free.toLowerCase()}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section
            aria-label="Varžybų leidimas"
            className="rounded-[28px] bg-gradient-to-br from-raised to-surface p-5"
          >
            <h2 className="headline text-[22px]">Ruošiesi tik vienam startui?</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
              <strong className="text-white">
                Varžybų leidimas – {formatPrice(PRICES.racePassCents)} vieną kartą.
              </strong>{' '}
              Atrakina pilną pasiruošimo planą vienoms pasirinktoms varžyboms. Jokios prenumeratos,
              jokio pratęsimo.
            </p>
            <ButtonLink to="/races" variant="secondary" className="mt-4">
              Pasirink varžybas
            </ButtonLink>
          </section>

          <section
            aria-label="Visada nemokama"
            className="rounded-[28px] border border-white/[0.06] p-5"
          >
            <h2 className="headline text-[22px]">Visada nemokama</h2>
            <p className="mt-1 text-[14px] text-slate-400">Tai nesikeičia ir be Plus:</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {FREE_FOREVER.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[14px] text-slate-200">
                  <Check className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Dažni klausimai">
            <h2 className="headline text-[24px]">Dažni klausimai</h2>
            <div className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface">
              {PLUS_FAQ.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{item.question}</span>
                    <ChevronDown
                      className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="px-5 pb-4 text-[14px] leading-relaxed text-slate-300">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <p className="px-1 text-center text-[12px] leading-relaxed text-slate-500">
            Kainos nurodytos eurais su PVM. Mokėjimus apdoroja Stripe – kortelės duomenų PaceMates
            nemato. Pirkdamas sutinki su{' '}
            <Link to="/salygos" className="underline">
              naudojimosi sąlygomis
            </Link>
            . Planai ir statistika – bendro pobūdžio patarimai, ne medicininė konsultacija.
          </p>
        </div>
      </div>
    </div>
  )
}

function ActivePlan({
  plan,
  onManage,
  managing,
}: {
  plan: ReturnType<typeof useEntitlements>['entitlements']
  onManage: () => void
  managing: boolean
}) {
  return (
    <section
      aria-label="Tavo planas"
      className="rounded-[28px] border border-volt/30 bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <PlusBadge />
        <span className="text-[13px] font-bold text-volt">Tu esi Plus narys</span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-white">{describePlan(plan)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink to="/stats">
          <TrendingUp className="size-4" aria-hidden />
          Mano statistika
        </ButtonLink>
        {backend.mode === 'supabase' ? (
          <Button variant="secondary" onClick={onManage} loading={managing}>
            Tvarkyti prenumeratą
          </Button>
        ) : (
          <ButtonLink to="/settings" variant="secondary">
            Tvarkyti prenumeratą
          </ButtonLink>
        )}
      </div>
    </section>
  )
}
