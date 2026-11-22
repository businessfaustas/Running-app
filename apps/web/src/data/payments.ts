import { backend } from '../backend'

/**
 * Whether PaceMates Plus can be bought. Always in preview mode (the purchase is pretend); with
 * real data only once VITE_PAYMENTS_ENABLED=true is set, which is done after the database
 * migration, the Stripe edge functions and the webhook are in place (docs/PAYMENTS.md). Until
 * then the paid features show as "coming soon" and nothing calls the payment backend.
 */
export const paymentsEnabled =
  backend.mode === 'demo' || import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
