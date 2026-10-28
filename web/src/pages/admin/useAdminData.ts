import { useCallback, useEffect, useState } from 'react'
import { AdminAuthError } from '../../lib/admin'
import { errorText } from '../../lib/api'

/** Loads admin data and refreshes it every `intervalMs` (live view). Calls onExpired when the admin token is rejected. */
export function useAdminData<T>(load: () => Promise<T>, intervalMs: number, onExpired: () => void) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setData(await load())
      setError('')
    } catch (e) {
      if (e instanceof AdminAuthError) onExpired()
      else setError(errorText(e))
    }
  }, [load, onExpired])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(timer)
  }, [refresh, intervalMs])

  return { data, error, refresh }
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
