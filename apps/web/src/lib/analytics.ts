import { track as vercelTrack } from '@vercel/analytics'

/*
 * Product analytics through Vercel Web Analytics: cookieless, no personal data, page views
 * plus a handful of named events. Turn it on under the Vercel project's "Analytics" tab.
 */

export type AnalyticsEvent =
  | 'sign_up'
  | 'sign_in'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'workout_created'
  | 'workout_joined'
  | 'workout_left'
  | 'message_sent'
  | 'race_joined'
  | 'race_left'
  | 'race_post_created'
  | 'password_reset_requested'
  | 'account_deleted'

export const analyticsEnabled = import.meta.env.PROD

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
) {
  if (!analyticsEnabled) return
  try {
    vercelTrack(event, properties)
  } catch {
    // Analytics must never break the app.
  }
}

/** Page URLs without query strings or #fragments, which can carry one-time auth tokens. */
export function sanitizeAnalyticsUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Ids in paths are random UUIDs; group them so reports show pages, not people.
    const path = parsed.pathname.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id',
    )
    return `${parsed.origin}${path}`
  } catch {
    return url.split(/[?#]/)[0] ?? url
  }
}
