import { useState } from 'react'
import { View } from 'react-native'
import { errorText } from '../lib/api'
import Sheet from './Sheet'
import { Alert, Button, Field, Input, T } from './ui'

/** First letter to someone (starts a pending chat). Port of GreetingModal in web Feed.tsx. */
export default function GreetingModal({ name, onClose, onSend }: { name: string; onClose: () => void; onSend: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await onSend(body.trim())
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title={`Say hello to ${name}`} onClose={onClose}>
      <T muted style={{ marginBottom: 12 }}>Send a letter to start a chat. You can write again once they reply.</T>
      {!!error && <Alert kind="error">{error}</Alert>}
      <Field>
        <Input multiline maxLength={2000} value={body} onChangeText={setBody} placeholder={`Hi ${name}! …`} autoFocus />
        <T muted size={12} style={{ textAlign: 'right', marginTop: 4 }}>{body.length}/2000</T>
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} kind="ghost" title="Cancel" onPress={onClose} />
        <Button style={{ flex: 1 }} title="Send" onPress={submit} disabled={busy || !body.trim()} />
      </View>
    </Sheet>
  )
}
