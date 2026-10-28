import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { getMyBanned, getProfile, type Profile } from './api'

type AuthState = {
  session: Session | null
  profile: Profile | null
  banned: boolean
  /** True until we know both the session and (if signed in) that user's profile. */
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function isProfileComplete(p: Profile | null): boolean {
  return !!p && !!p.name && !!p.age && !!p.location && p.photos.length > 0
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; banned: boolean } | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    const [profile, banned] = await Promise.all([getProfile(userId).catch(() => null), getMyBanned().catch(() => false)])
    setLoaded({ userId, profile, banned })
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

  return (
    <AuthContext.Provider
      value={{
        session,
        profile: userId && loaded?.userId === userId ? loaded.profile : null,
        banned: !!userId && loaded?.userId === userId && loaded.banned,
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
