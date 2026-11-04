import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import { createClient } from '@supabase/supabase-js'
import { initShared } from '@kitho/shared'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (copy .env.example to .env)')

// Secure random bytes for Supabase's PKCE verifier (Hermes has no Web Crypto).
const g = globalThis as { crypto?: { getRandomValues?: unknown } }
if (!g.crypto) g.crypto = {}
if (!g.crypto.getRandomValues) g.crypto.getRandomValues = Crypto.getRandomValues

export const supabase = createClient(url, key, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
})

initShared({ client: supabase, uuid: () => Crypto.randomUUID() })

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh()
  else void supabase.auth.stopAutoRefresh()
})
