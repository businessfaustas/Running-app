import { formatPrice, PRICES, TRIAL_DAYS, yearlyPerMonthCents } from '@pacemates/shared'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, ButtonLink } from '../../components/Button'
import { paymentsEnabled } from '../../data/payments'
import { usePurchase } from './usePurchase'

/**
 * The invitation shown where a Plus feature would be: says what it is, what it costs and that
 * there's a free trial, and goes straight to the pricing page or (for a race) the one-off pass.
 */
export function UpgradeCard({
  title,
  children,
  racePass,
}: {
  title: string
  children: ReactNode
  /** Offer the one-off pass for this race next to the subscription. */
  racePass?: { raceSlug: string; raceName: string }
}) {
  const { buy, pending } = usePurchase()
  return (
    <section
      aria-label={title}
      className="rounded-[26px] border border-volt/25 bg-gradient-to-br from-surface to-raised p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-volt text-black">
          <Lock className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="headline text-[20px]">{title}</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-slate-300">{children}</p>
        </div>
      </div>
      {paymentsEnabled ? (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <ButtonLink to="/plus" className="flex-1">
              Išbandyk Plus {TRIAL_DAYS} d. nemokamai
            </ButtonLink>
            {racePass && (
              <Button
                variant="secondary"
                className="flex-1"
                loading={pending}
                onClick={() => buy({ kind: 'race_pass', raceSlug: racePass.raceSlug })}
              >
                Tik šie startai – {formatPrice(PRICES.racePassCents)}
              </Button>
            )}
          </div>
          <p className="mt-3 text-[12px] text-slate-500">
            Plus nuo {formatPrice(yearlyPerMonthCents())} per mėnesį (metinis). Atšaukti galima bet
            kada.
          </p>
        </>
      ) : (
        <div className="mt-4">
          <ButtonLink to="/plus" variant="secondary">
            Sužinok apie Plus
          </ButtonLink>
          <p className="mt-3 text-[12px] text-slate-500">Plus pardavinėti pradėsime netrukus.</p>
        </div>
      )}
    </section>
  )
}
