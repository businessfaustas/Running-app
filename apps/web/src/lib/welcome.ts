const KEY = 'pacemates:welcomed'

export function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function markWelcomeSeen() {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    // Private mode: they'll just see the intro again next time.
  }
}
