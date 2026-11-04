import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { errorText, REPORT_REASONS, type ReportReason } from '../lib/api'
import { colors, radius } from '../lib/theme'
import Sheet from './Sheet'
import { Alert, Button, Field, Input, T } from './ui'

/** Port of ReportModal in web Chat.tsx. */
export default function ReportSheet({ name, onClose, onSubmit }: {
  name: string
  onClose: () => void
  onSubmit: (reason: ReportReason, details: string) => Promise<void>
}) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit() {
    if (!reason) return
    setBusy(true)
    setError('')
    try {
      await onSubmit(reason, details.trim())
      setDone(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Sheet title="Report sent" onClose={onClose}>
        <T muted style={{ marginBottom: 16 }}>Thanks. Our team will review your report about {name}.</T>
        <Button title="Close" onPress={onClose} />
      </Sheet>
    )
  }

  return (
    <Sheet title={`Report ${name}`} onClose={onClose}>
      <T muted style={{ marginBottom: 12 }}>Why are you reporting this person? They won’t know it was you.</T>
      {!!error && <Alert kind="error">{error}</Alert>}
      <View style={s.reasons} accessibilityRole="radiogroup">
        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: reason === r.code }}
            style={[s.reason, reason === r.code && s.reasonOn]}
            onPress={() => setReason(r.code)}
          >
            <T size={14} weight={reason === r.code ? 'medium' : 'regular'}>{r.label}</T>
          </Pressable>
        ))}
      </View>
      <Field>
        <Input multiline maxLength={1000} value={details} onChangeText={setDetails} placeholder="Add details (optional)" style={{ height: 80 }} />
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} kind="ghost" title="Cancel" onPress={onClose} />
        <Button style={{ flex: 1 }} kind="danger" title={busy ? 'Sending…' : 'Report'} onPress={submit} disabled={busy || !reason} />
      </View>
    </Sheet>
  )
}

const s = StyleSheet.create({
  reasons: { gap: 6, marginBottom: 12 },
  reason: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.bg },
  reasonOn: { borderColor: colors.text, backgroundColor: colors.surface },
})
