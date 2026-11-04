// Port of web/src/lib/auth.tsx.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { getMyStatus, getProfile, type MyStatus, type Profile } from './api'

type AuthState = {
  session: Session | null
  profile: Profile | null
  banned: boolean
  /** My private status (birth date, frozen). Null while loading or signed out. */
  status: MyStatus | null
  /** True until we know both the session and (if signed in) that user's profile. */
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export { isProfileComplete } from './api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; status: MyStatus | null } | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    const [profile, status] = await Promise.all([getProfile(userId).catch(() => null), getMyStatus().catch(() => null)])
    setLoaded({ userId, profile, status })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession((prev) => (prev?.access_token === s?.access_token ? prev : s))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (userId) void loadProfile(userId)
  }, [userId, loadProfile])

  const profileReady = !userId || loaded?.userId === userId
  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId)
  }, [userId, loadProfile])

  const mine = !!userId && loaded?.userId === userId
  return (
    <AuthContext.Provider
      value={{
        session,
        profile: mine ? loaded.profile : null,
        banned: mine && !!loaded.status?.banned,
        status: mine ? loaded.status : null,
        loading: !ready || !profileReady,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
