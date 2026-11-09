import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
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

/** Native Apple sign-in is offered on iOS only (Android/web devices without it hide the button). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  return AppleAuthentication.isAvailableAsync().catch(() => false)
}

/**
 * Apple sign-in with the native iOS sheet, exchanged for a Supabase session via signInWithIdToken.
 * Apple gets the SHA-256 of a random nonce; Supabase gets the raw nonce and checks they match.
 * Apple sends the user's name only on the very first sign-in, so it's saved to user metadata then.
 * Returns false if the user cancelled.
 */
export async function signInWithApple(): Promise<boolean> {
  const rawNonce = Crypto.randomUUID()
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)
  let credential: AppleAuthentication.AppleAuthenticationCredential
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return false
    throw e
  }
  if (!credential.identityToken) throw new Error('Apple sign-in did not complete. Please try again.')
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  })
  if (error) throw error
  const { givenName, familyName } = credential.fullName ?? {}
  const fullName = [givenName, familyName].filter(Boolean).join(' ')
  if (fullName) {
    await supabase.auth.updateUser({ data: { full_name: fullName, given_name: givenName, family_name: familyName } })
  }
  return true
}
