import type { CheckoutRequest } from '@pacemates/shared'
import { useLocation, useNavigate } from 'react-router'
import { useSession } from '../../data/auth'
import { useCheckout } from '../../data/hooks'
import { track } from '../../lib/analytics'
import { toast, toastError } from '../../lib/toast'

/**
 * Starting a purchase from any screen: signed-out people are sent to sign in and brought back
 * here; everyone else goes to the payment page (or, in preview mode, gets the plan straight away).
 */
export function usePurchase() {
  const checkout = useCheckout()
  const session = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const buy = (request: CheckoutRequest) => {
    if (!session) {
      navigate(`/signin?next=${encodeURIComponent(pathname)}`)
      return
    }
    track(
      'checkout_started',
      request.kind === 'plus' ? { kind: 'plus', plan: request.plan } : { kind: 'race_pass' },
    )
    checkout.mutate(request, {
      onSuccess: ({ url }) => {
        if (url) window.location.assign(url)
        else toast('Įjungta (peržiūros režimas – nieko nemokėta)')
      },
      onError: toastError,
    })
  }
  return { buy, pending: checkout.isPending }
}
