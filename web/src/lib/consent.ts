import { useSyncExternalStore } from 'react'

export type Consent = 'accepted' | 'rejected' | null

const KEY = 'kitho_cookie_consent'
const VISITOR_KEY = 'kitho_visitor_id'
const listeners = new Set<() => void>()
let current: Consent = read()

function read(): Consent {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'accepted' || v === 'rejected' ? v : null
  } catch {
    return null
  }
}

function emit() {
  listeners.forEach((l) => l())
}

export function setConsent(value: 'accepted' | 'rejected') {
  current = value
  try {
    localStorage.setItem(KEY, value)
    if (value === 'rejected') localStorage.removeItem(VISITOR_KEY)
  } catch { /* storage unavailable */ }
  emit()
}

/** Forget the choice so the banner is shown again. */
export function resetConsent() {
  current = null
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(VISITOR_KEY)
  } catch { /* storage unavailable */ }
  emit()
}

export function useConsent(): Consent {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => null,
  )
}
