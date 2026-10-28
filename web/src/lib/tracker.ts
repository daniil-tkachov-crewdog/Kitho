import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './auth'

const VISITOR_KEY = 'kitho_visitor_id'

/** Random id kept per browser so repeat visits count as one visitor. */
function visitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

/** Records a visit on page load and whenever the signed-in user changes. Never on the admin panel. */
export function useVisitTracker() {
  const { session, loading } = useAuth()
  const isAdmin = useLocation().pathname.startsWith('/admin')
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (loading || isAdmin) return
    void supabase.functions.invoke('track-visit', { body: { visitor_id: visitorId() } }).catch(() => {})
  }, [loading, isAdmin, userId])
}
