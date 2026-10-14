/*
 * Form rules shared by the screens and the preview backend, with Lithuanian messages.
 * Supabase enforces the same password rule on the server ("letters and digits", 8+).
 */

export const PASSWORD_MIN_LENGTH = 8

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function emailError(email: string): string | null {
  const value = email.trim()
  if (!value) return 'Įvesk el. pašto adresą'
  if (value.length > 254 || !EMAIL_RE.test(value)) return 'Įvesk tinkamą el. pašto adresą'
  return null
}

export function nameError(name: string): string | null {
  const value = name.trim()
  if (value.length < 2) return 'Įvesk savo vardą (bent 2 raidės)'
  if (value.length > 80) return 'Vardas per ilgas (iki 80 simbolių)'
  return null
}

export interface PasswordCheck {
  label: string
  ok: boolean
}

/** The individual rules, for a live checklist under the field. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: `Bent ${PASSWORD_MIN_LENGTH} simboliai`, ok: password.length >= PASSWORD_MIN_LENGTH },
    { label: 'Bent viena raidė', ok: /\p{L}/u.test(password) },
    { label: 'Bent vienas skaičius', ok: /\d/.test(password) },
  ]
}

export function passwordError(password: string): string | null {
  if (!password) return 'Įvesk slaptažodį'
  if (password.length > 72) return 'Slaptažodis per ilgas (iki 72 simbolių)'
  return passwordChecks(password).every((c) => c.ok)
    ? null
    : 'Slaptažodį turi sudaryti bent 8 simboliai: raidės ir bent vienas skaičius'
}

export function confirmPasswordError(password: string, confirm: string): string | null {
  if (!confirm) return 'Pakartok slaptažodį'
  return password === confirm ? null : 'Slaptažodžiai nesutampa'
}
