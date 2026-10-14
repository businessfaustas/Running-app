/*
 * Error tracking. Sentry is only downloaded when VITE_SENTRY_DSN is set (in Vercel's
 * environment variables); without it errors just go to the console. Reports never include
 * names, emails, messages or auth tokens.
 */

type Sentry = typeof import('@sentry/react')

const dsn = import.meta.env.VITE_SENTRY_DSN
let sentry: Sentry | null = null
const pending: [unknown, Record<string, unknown> | undefined][] = []
let pendingUser: string | null | undefined

/** Strips anything that could identify someone or let a report be replayed. */
function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/(access_token|refresh_token|token|code)=[^&#\s]+/gi, '$1=[redacted]')
    .replace(/#.*$/, '')
}

export async function initMonitoring() {
  if (!dsn) return
  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION,
      sendDefaultPii: false,
      // Errors only: no performance tracing or session replay, so nothing about what
      // people type or look at leaves the device.
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request?.url) event.request.url = scrub(event.request.url)
        delete event.request?.cookies
        delete event.request?.headers
        if (event.message) event.message = scrub(event.message)
        for (const value of event.exception?.values ?? []) {
          if (value.value) value.value = scrub(value.value)
        }
        return event
      },
      beforeBreadcrumb(crumb) {
        // Console and UI-click breadcrumbs can contain chat text or form input.
        if (crumb.category === 'console' || crumb.category?.startsWith('ui.')) return null
        if (crumb.data?.url) crumb.data.url = scrub(String(crumb.data.url))
        if (crumb.message) crumb.message = scrub(crumb.message)
        return crumb
      },
    })
    sentry = Sentry
    if (pendingUser !== undefined) Sentry.setUser(pendingUser ? { id: pendingUser } : null)
    for (const [error, context] of pending.splice(0))
      Sentry.captureException(error, { extra: context })
  } catch (error) {
    console.warn('Error tracking failed to load', error)
  }
}

/** Reports an unexpected error (not the friendly ones people are shown on purpose). */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  console.error(error)
  if (!dsn) return
  if (sentry) sentry.captureException(error, { extra: context })
  else pending.push([error, context])
}

/** Ties reports to an anonymous account id (never the email or name). */
export function setMonitoringUser(userId: string | null) {
  pendingUser = userId
  sentry?.setUser(userId ? { id: userId } : null)
}

export const monitoringEnabled = Boolean(dsn)
