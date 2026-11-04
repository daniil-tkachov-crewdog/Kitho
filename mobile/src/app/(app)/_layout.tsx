// Port of AppLayout in web/src/components/Layouts.tsx: guards + bottom tabs.
import { useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useSegments } from 'expo-router'
import { Tabs } from 'expo-router/tabs'
import { isProfileComplete, useAuth } from '../../lib/auth'
import { ageFrom, defaultDob, dobToIso, errorText, setBirthDate, type Dob } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { colors, font } from '../../lib/theme'
import { CompassIcon, InboxIcon, LogoMark, UserIcon } from '../../components/Icons'
import { Alert, Button, H, Panel, Spinner, T } from '../../components/ui'
import Sheet from '../../components/Sheet'
import DobPicker from '../../components/DobPicker'

export default function AppLayout() {
  const { session, profile, status, banned, loading } = useAuth()
  const segments = useSegments() as string[]
  const screen = segments[segments.length - 1]

  if (loading) return <Spinner />
  if (!session) return <Redirect href="/auth" />
  if (banned) return <Suspended />
  if (!isProfileComplete(profile) && screen !== 'profile' && screen !== 'settings') return <Redirect href="/profile" />

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bg },
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
          tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        }}
      >
        <Tabs.Screen name="feed" options={{ title: 'Discover', tabBarIcon: ({ color }) => <CompassIcon color={color as string} /> }} />
        <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: ({ color }) => <InboxIcon color={color as string} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <UserIcon color={color as string} /> }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>
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
