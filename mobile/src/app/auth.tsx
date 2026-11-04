// Port of web/src/pages/Auth.tsx.
import { useState } from 'react'
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { checkEmail, errorText } from '../lib/api'
import { signInWithGoogle } from '../lib/oauth'
import { WEBSITE } from '../lib/config'
import { colors, font, radius } from '../lib/theme'
import { AppleIcon, GoogleIcon, LogoMark } from '../components/Icons'
import { Alert, Button, Field, H, Input, Panel, T } from '../components/ui'

type Mode = 'login' | 'signup' | 'verify'

export default function Auth() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  /** Switches tab and clears messages; `notice` is shown on the new tab. */
  function switchMode(next: Mode, notice = '') {
    setMode(next)
    setError('')
    setInfo(notice)
  }

  if (session && mode !== 'verify') return <Redirect href="/feed" />

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const onLogin = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error?.code === 'email_not_confirmed') {
        await supabase.auth.resend({ type: 'signup', email: email.trim() })
        switchMode('verify', 'Your email isn’t verified yet. We sent you a new code.')
        return
      }
      if (error) throw error
      router.replace('/feed')
    })

  const onSignup = () => {
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== password2) return setError('Passwords don’t match.')
    run(async () => {
      const existing = await checkEmail(email.trim())
      if (existing === 'banned') throw new Error('This email can’t be used to create an account.')
      if (existing === 'exists') {
        setPassword('')
        setPassword2('')
        return switchMode('login', 'This email already has an account. Log in with your password, or with Google / Apple.')
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${WEBSITE}/profile` },
      })
      if (error) throw error
      if (data.session) return router.replace('/profile') // email confirmation disabled
      switchMode('verify', `We sent a verification code to ${email.trim()}.`)
    })
  }

  const onVerify = () =>
    run(async () => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
      if (error) throw error
      router.replace('/profile')
    })

  // New users land on Profile via the app guard.
  const onGoogle = () =>
    run(async () => {
      if (await signInWithGoogle()) router.replace('/feed')
    })

  const onResend = () =>
    run(async () => {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
      if (error) throw error
      setInfo('New code sent. Check your inbox (and spam folder).')
    })

  const verb = mode === 'login' ? 'Log in' : 'Sign up'

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logo}>
            <LogoMark size={34} />
            <Text style={s.logoText}>Kitho</Text>
          </View>
          <Panel>
            {mode === 'verify' ? (
              <>
                <H style={s.center}>Check your email</H>
                <T muted style={[s.center, { marginBottom: 16 }]}>Enter the code we sent to <T weight="semibold">{email}</T>.</T>
                {!!info && <Alert kind="ok">{info}</Alert>}
                {!!error && <Alert kind="error">{error}</Alert>}
                <Field label="Verification code">
                  <Input
                    style={s.code}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                  />
                </Field>
                <Button title="Verify email" onPress={onVerify} disabled={busy || code.length < 6} />
                <View style={s.row}>
                  <T muted>Didn’t get it? </T>
                  <Pressable onPress={onResend} disabled={busy}><T weight="medium" style={s.link}>Resend code</T></Pressable>
                  <T muted> · </T>
                  <Pressable onPress={() => switchMode('login')}><T weight="medium" style={s.link}>Back</T></Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={s.switcher} accessibilityRole="tablist">
                  {(['login', 'signup'] as const).map((m) => (
                    <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} style={[s.tab, mode === m && s.tabOn]} onPress={() => switchMode(m)}>
                      <Text style={[s.tabText, mode === m && s.tabTextOn]}>{m === 'login' ? 'Log in' : 'Sign up'}</Text>
                    </Pressable>
                  ))}
                </View>
                {!!info && <Alert kind="ok">{info}</Alert>}
                {!!error && <Alert kind="error">{error}</Alert>}
                <Field label="Email">
                  <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
                </Field>
                <Field label="Password">
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    textContentType={mode === 'login' ? 'password' : 'newPassword'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </Field>
                {mode === 'signup' && (
                  <Field label="Re-type your password">
                    <Input value={password2} onChangeText={setPassword2} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
                  </Field>
                )}
                <Button title={verb} onPress={mode === 'login' ? onLogin : onSignup} disabled={busy || !email.trim() || !password} />
                <View style={s.divider}>
                  <View style={s.line} /><T muted size={13}>or</T><View style={s.line} />
                </View>
                <View style={{ gap: 10 }}>
                  <Button kind="ghost" title={`${verb} with Google`} icon={<GoogleIcon />} onPress={onGoogle} disabled={busy} />
                  <Button kind="ghost" title={`${verb} with Apple`} icon={<AppleIcon />} disabled />
                  <T muted size={13} style={s.center}>Apple sign-in coming soon.</T>
                </View>
                {mode === 'signup' && (
                  <T muted size={13} style={[s.center, { marginTop: 16 }]}>
                    By signing up you agree to our{' '}
                    <Text style={s.link} onPress={() => Linking.openURL(`${WEBSITE}/terms`)}>Terms of Use</Text> and{' '}
                    <Text style={s.link} onPress={() => Linking.openURL(`${WEBSITE}/privacy`)}>Privacy Policy</Text>.
                  </T>
                )}
              </>
            )}
          </Panel>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 },
  logoText: { fontFamily: font.semibold, fontSize: 24, color: colors.text, letterSpacing: -0.6 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 },
  link: { color: colors.text, textDecorationLine: 'underline', fontFamily: font.medium },
  code: { textAlign: 'center', fontSize: 22, letterSpacing: 6, fontFamily: font.semibold },
  switcher: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, padding: 4, marginBottom: 24 },
  tab: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.text },
  tabText: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  tabTextOn: { color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
})
