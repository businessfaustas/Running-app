/*
 * What an email link brought the visitor here to do. Supabase puts the outcome in the URL
 * #fragment (type=signup|recovery|…, or error=…) and its client clears that fragment as
 * soon as it has read the session, so this is captured once, before the backend loads.
 * main.tsx imports this module first for that reason.
 */

export interface AuthRedirect {
  /** signup, recovery, email_change, magiclink, invite… */
  type: string | null
  error: string | null
  errorCode: string | null
}

function read(): AuthRedirect {
  if (typeof window === 'undefined') return { type: null, error: null, errorCode: null }
  const params = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)
  const get = (key: string) => params.get(key) ?? query.get(key)
  return {
    type: get('type'),
    error: get('error_description') ?? get('error'),
    errorCode: get('error_code'),
  }
}

export const authRedirect: AuthRedirect = read()
