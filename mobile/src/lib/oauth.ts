import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'

WebBrowser.maybeCompleteAuthSession()

/**
 * Google sign-in through Supabase in an in-app browser sheet (works in Expo Go).
 * Redirect URL is kitho://auth-callback (or exp://…/--/auth-callback in Expo Go) — must be in Supabase Redirect URLs.
 * Returns false if the user closed the sheet.
 */
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = Linking.createURL('auth-callback')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw error
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (res.type !== 'success') return false
  const { queryParams } = Linking.parse(res.url)
  const fragment = new URLSearchParams(res.url.split('#')[1] ?? '')
  const errText = (queryParams?.error_description as string | undefined) ?? fragment.get('error_description')
  if (errText) throw new Error(errText)
  const code = queryParams?.code as string | undefined
  if (!code) throw new Error('Google sign-in did not complete. Please try again.')
  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exErr) throw exErr
  return true
}
