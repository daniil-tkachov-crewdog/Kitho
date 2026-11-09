// Port of AppLayout in web/src/components/Layouts.tsx: guards for the signed-in area (tabs + chat screens).
import { useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, Stack, useSegments } from 'expo-router'
import { isProfileComplete, useAuth } from '../../lib/auth'
import { ageFrom, defaultDob, dobToIso, errorText, setBirthDate, type Dob } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { usePushSetup } from '../../lib/usePushSetup'
import { colors } from '../../lib/theme'
import { LogoMark } from '../../components/Icons'
import { Alert, Button, H, Panel, Spinner, T } from '../../components/ui'
import Sheet from '../../components/Sheet'
import DobPicker from '../../components/DobPicker'

export const unstable_settings = { initialRouteName: '(tabs)' }

export default function AppLayout() {
  const { session, profile, status, banned, loading } = useAuth()
  const segments = useSegments() as string[]
  const screen = segments[segments.length - 1]
  const complete = isProfileComplete(profile)
  usePushSetup(!loading && !!session && !banned && complete)

  if (loading) return <Spinner />
  if (!session) return <Redirect href="/auth" />
  if (banned) return <Suspended />
  if (!complete && screen !== 'profile' && screen !== 'settings') return <Redirect href="/profile" />

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      {profile && status && !status.birth_date && <DobPrompt />}
    </>
  )
}

/** Existing users without a date of birth must add one before using the app (can't be dismissed). */
function DobPrompt() {
  const { session, refreshProfile } = useAuth()
  const [dob, setDob] = useState<Dob>(defaultDob)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const age = ageFrom(dob)

  async function save() {
    if (age < 18) return setError('You must be 18 or over to use Kitho.')
    setBusy(true)
    setError('')
    try {
      await setBirthDate(session!.user.id, dobToIso(dob))
      await refreshProfile()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <Sheet title="Add your date of birth">
      <T muted style={{ marginBottom: 12 }}>Kitho is for adults only. Your age is calculated from it and can’t be changed later.</T>
      {!!error && <Alert kind="error">{error}</Alert>}
      <DobPicker value={dob} onChange={setDob} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 14 }}>
        <T muted>Your age</T><T weight="semibold">{age}</T>
      </View>
      <Button title={busy ? 'Saving…' : 'Confirm'} onPress={save} disabled={busy} />
    </Sheet>
  )
}

/** Shown instead of the app to banned users. */
function Suspended() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 16 }}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}><LogoMark size={34} /></View>
      <Panel>
        <H style={{ textAlign: 'center' }}>Account suspended</H>
        <T muted style={{ textAlign: 'center', marginBottom: 16 }}>Your account has been suspended for breaking the community rules.</T>
        <Button kind="ghost" title="Log out" onPress={() => void supabase.auth.signOut()} />
      </Panel>
    </SafeAreaView>
  )
}
