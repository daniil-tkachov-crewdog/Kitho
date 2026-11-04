import { Redirect } from 'expo-router'

/** Deep-link target for Google sign-in (kitho://auth-callback). The code exchange happens in lib/oauth.ts. */
export default function AuthCallback() {
  return <Redirect href="/" />
}
