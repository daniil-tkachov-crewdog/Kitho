import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import { WEBSITE } from './config'

WebBrowser.maybeCompleteAuthSession()

/**
 * Google sign-in through Supabase in an in-app browser sheet (works in Expo Go).
 * Supabase redirects to kitho.co.uk/app-auth.html (always allowed: it's the Site URL), which forwards
 * the code to the app URL (kitho://auth-callback, or exp://…/--/auth-callback in Expo Go).
 * Returns false if the user closed the sheet.
 */
export async function signInWithGoogle(): Promise<boolean> {
  const appUrl = Linking.createURL('auth-callback')
  const redirectTo = `${WEBSITE}/app-auth.html?to=${encodeURIComponent(appUrl)}`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw error
  const res = await WebBrowser.openAuthSessionAsync(data.url, appUrl)
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
