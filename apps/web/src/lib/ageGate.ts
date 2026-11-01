import { MIN_AGE } from '../content/legal'

/*
 * Neutral age screen at sign-up: we ask for the year and month of birth without saying what
 * the minimum age is, turn away anyone younger than MIN_AGE, and remember that on the device
 * for a day so the answer can't simply be changed and resubmitted. The date itself is only
 * checked – it is never stored or sent anywhere.
 */

const KEY = 'pacemates:age-check'
const BLOCK_MS = 24 * 60 * 60 * 1000

/** Full years of age for someone born in `year`/`month` (1–12), counted in whole months. */
export function ageInYears(year: number, month: number, now = new Date()): number {
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  return Math.floor(months / 12)
}

export const oldEnough = (year: number, month: number, now = new Date()) =>
  ageInYears(year, month, now) >= MIN_AGE

/** Birth years offered, newest first – a plain list that doesn't hint at the cut-off. */
export function birthYears(now = new Date()): number[] {
  const current = now.getFullYear()
  return Array.from({ length: 100 }, (_, i) => current - i)
}

export function isAgeBlocked(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(KEY))
    return at > 0 && now - at < BLOCK_MS
  } catch {
    return false
  }
}

export function rememberTooYoung(now = Date.now()) {
  try {
    localStorage.setItem(KEY, String(now))
  } catch {
    // Private mode: the check still applies to this attempt.
  }
}
