import type { Entitlements } from '@pacemates/shared'

const date = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('lt-LT', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(iso),
      )
    : ''

/**
 * One sentence on where someone's Plus stands. A cancelled plan always says that nothing more will
 * be charged – even in the free trial, where the "then you pay" wording would be misleading.
 */
export function describePlan(
  plan: Pick<Entitlements, 'status' | 'plan' | 'renewsAt' | 'trialEndsAt' | 'cancelAtPeriodEnd'>,
): string {
  const kind = plan.plan === 'plus_year' ? 'metinė' : 'mėnesinė'
  if (plan.cancelAtPeriodEnd) {
    return plan.status === 'trialing'
      ? `Atšaukta – bandomasis laikotarpis veikia iki ${date(plan.trialEndsAt ?? plan.renewsAt)}. Nieko nenuskaitysime.`
      : `Atšaukta – veikia iki ${date(plan.renewsAt)}. Daugiau nieko nenuskaitysime.`
  }
  if (plan.status === 'trialing') {
    return `Bandomasis laikotarpis iki ${date(plan.trialEndsAt)}, tada ${kind} prenumerata.`
  }
  if (plan.status === 'past_due') {
    return `Nepavyko nuskaityti mokėjimo. Atnaujink kortelę iki ${date(plan.renewsAt)}, kad prieiga nenutrūktų.`
  }
  return `${kind[0]!.toUpperCase()}${kind.slice(1)} prenumerata, kitas mokėjimas ${date(plan.renewsAt)}.`
}
