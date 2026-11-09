import { useCallback, useEffect, useState } from 'react'
import { AppState, Linking, StyleSheet, Switch, View } from 'react-native'
import { errorText, getNotificationSettings, saveNotificationSettings, type NotificationSettings } from '../lib/api'
import { enablePush, getPushStatus, type PushStatus } from '../lib/push'
import { colors } from '../lib/theme'
import { Alert, Button, Panel, T } from './ui'

const ROWS: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: 'messages', label: 'New messages', hint: 'Replies in your chats' },
  { key: 'letters', label: 'New letters', hint: 'Someone writes to you first' },
  { key: 'likes', label: 'Likes', hint: 'Someone likes your profile' },
  { key: 'admin', label: 'Kitho team', hint: 'Messages from the Kitho team' },
]

/** Profile → Notifications: phone permission + which pushes I get (saved to my account). */
export default function NotificationSettingsPanel({ userId }: { userId: string }) {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refreshStatus = useCallback(() => void getPushStatus().then(setStatus, () => setStatus('unavailable')), [])

  useEffect(() => {
    refreshStatus()
    getNotificationSettings().then(setSettings, (e) => setError(errorText(e)))
    // Back from iPhone Settings → pick up the new permission and register this device.
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return
      refreshStatus()
      enablePush(false).catch(() => {})
    })
    return () => sub.remove()
  }, [refreshStatus])

  async function turnOn() {
    setError('')
    if (status === 'denied') return void Linking.openSettings()
    setBusy(true)
    try {
      setStatus(await enablePush(true))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(key: keyof NotificationSettings, value: boolean) {
    if (!settings) return
    const prev = settings
    const next = { ...settings, [key]: value }
    setSettings(next)
    setError('')
    try {
      await saveNotificationSettings(userId, next)
    } catch (e) {
      setSettings(prev)
      setError(errorText(e))
    }
  }

  const off = status === 'denied' || status === 'undetermined'

  return (
    <Panel>
      <T weight="semibold" size={16} style={{ marginBottom: 4 }}>Notifications</T>
      {!!error && <Alert kind="error">{error}</Alert>}
      {off && (
        <View style={s.off}>
          <T muted size={14} style={{ flex: 1 }}>
            {status === 'denied' ? 'Notifications are turned off for Kitho in iPhone Settings.' : 'Get notified about messages, letters and likes.'}
          </T>
          <Button small title={status === 'denied' ? 'Open Settings' : 'Turn on'} onPress={turnOn} disabled={busy} />
        </View>
      )}
      {status === 'unavailable' && <T muted size={14} style={{ marginBottom: 8 }}>Notifications aren’t available on this device.</T>}
      {ROWS.map((r, i) => (
        <View key={r.key} style={[s.row, i === ROWS.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <T>{r.label}</T>
            <T muted size={13}>{r.hint}</T>
          </View>
          <Switch
            value={settings?.[r.key] ?? true}
            onValueChange={(v) => void toggle(r.key, v)}
            disabled={!settings}
            trackColor={{ true: colors.accent, false: colors.inputBorder }}
            accessibilityLabel={r.label}
          />
        </View>
      ))}
    </Panel>
  )
}

const s = StyleSheet.create({
  off: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface2, borderRadius: 14, padding: 12, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
})
