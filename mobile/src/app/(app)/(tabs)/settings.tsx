// Port of web/src/pages/Settings.tsx + legal links.
import { useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { disablePushForThisDevice } from '../../../lib/push'
import { deleteAccount, errorText } from '../../../lib/api'
import { WEBSITE } from '../../../lib/config'
import { colors } from '../../../lib/theme'
import { Alert, Button, Field, H, Input, Panel, T } from '../../../components/ui'
import Sheet from '../../../components/Sheet'

const LEGAL = [
  { label: 'Terms of Use', path: '/terms' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Community Guidelines', path: '/guidelines' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
]

export default function Settings() {
  const [confirm, setConfirm] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    await disablePushForThisDevice()
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  async function onDelete() {
    setBusy(true)
    setError('')
    try {
      await deleteAccount()
      await supabase.auth.signOut({ scope: 'local' })
      router.replace('/auth')
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.head}>
          <H style={{ marginBottom: 0 }}>Settings</H>
          <Button small kind="ghost" title="Back" onPress={() => router.navigate('/profile')} />
        </View>

        <Panel style={s.row}>
          <H size={17}>Log out</H>
          <T muted style={s.desc}>Sign out of Kitho on this device.</T>
          <Button kind="ghost" title="Log out" onPress={logout} />
        </Panel>

        <Panel style={s.row}>
          <H size={17}>Legal & help</H>
          {LEGAL.map((l) => (
            <Pressable key={l.path} style={s.link} onPress={() => Linking.openURL(`${WEBSITE}${l.path}`)}>
              <T>{l.label}</T><T muted>›</T>
            </Pressable>
          ))}
        </Panel>

        <Panel style={[s.row, { borderColor: '#F3C9CE' }]}>
          <H size={17}>Delete my account</H>
          <T muted style={s.desc}>Permanently deletes your profile, photos, likes and messages. This can’t be undone.</T>
          <Button kind="danger" title="Delete my account" onPress={() => setConfirm(true)} />
        </Panel>
      </ScrollView>

      {confirm && (
        <Sheet title="Delete your account?" onClose={() => !busy && setConfirm(false)}>
          <T muted style={{ marginBottom: 12 }}>Everything will be permanently deleted. Type <T weight="semibold">DELETE</T> to confirm.</T>
          {!!error && <Alert kind="error">{error}</Alert>}
          <Field>
            <Input value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} autoFocus accessibilityLabel="Type DELETE to confirm" />
          </Field>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} kind="ghost" title="Cancel" onPress={() => setConfirm(false)} disabled={busy} />
            <Button style={{ flex: 1 }} kind="danger" title={busy ? 'Deleting…' : 'Delete forever'} onPress={onDelete} disabled={busy || typed !== 'DELETE'} />
          </View>
        </Sheet>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  row: { gap: 4 },
  desc: { marginBottom: 12 },
  link: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
})
