// Port of web/src/pages/AdminChat.tsx: the user's direct chat with the Kitho admin.
import { useEffect, useState } from 'react'
import { FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../../lib/auth'
import { errorText, getAdminMessages, getMyAdminChat, markAdminChatRead, sendAdminMessage, subscribeAdminChat, type AdminMessage } from '../../../lib/api'
import { colors, font, radius } from '../../../lib/theme'
import Avatar from '../../../components/Avatar'
import { Bubble, ChatHeader, Composer, Note } from '../../../components/chat'
import { Alert, Spinner, T } from '../../../components/ui'

export default function AdminChat() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [messages, setMessages] = useState<AdminMessage[] | null>(null)
  const [adminReadAt, setAdminReadAt] = useState('-infinity')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [chat, msgs] = await Promise.all([getMyAdminChat(), getAdminMessages()])
        if (cancelled) return
        setMessages(msgs)
        if (chat) {
          setAdminReadAt(chat.admin_read_at)
          markAdminChatRead().catch(() => {})
        }
      } catch (e) {
        if (!cancelled) setError(errorText(e))
      }
    })()
    const unsubscribe = subscribeAdminChat(
      uid,
      (m) => {
        setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
        if (m.from_admin) markAdminChatRead().catch(() => {})
      },
      setAdminReadAt,
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [uid])

  async function onSend(text: string): Promise<boolean> {
    setBusy(true)
    setError('')
    try {
      await sendAdminMessage(text)
      setMessages(await getAdminMessages())
      return true
    } catch (err) {
      setError(errorText(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!messages) return error ? <SafeAreaView style={s.safe}><View style={{ padding: 16 }}><Alert kind="error">{error}</Alert></View></SafeAreaView> : <Spinner />

  const lastMine = [...messages].reverse().find((m) => !m.from_admin)
  const readAt = new Date(adminReadAt).getTime()

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ChatHeader
        avatar={<Avatar letter="K" size={40} />}
        title={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T weight="semibold">Admin</T>
            <View style={s.tag}><Text style={s.tagText}>Kitho</Text></View>
          </View>
        }
        subtitle="The Kitho team"
      />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.thread}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }] }}><Note>Questions or ideas? Write to the Kitho team here.</Note></View>}
          renderItem={({ item: m }) => (
            <Bubble
              mine={!m.from_admin}
              body={m.body}
              at={m.created_at}
              status={m === lastMine ? (new Date(m.created_at).getTime() <= readAt ? 'Seen' : 'Delivered') : null}
            />
          )}
        />
        {!!error && <View style={{ paddingHorizontal: 12 }}><Alert kind="error">{error}</Alert></View>}
        <Composer onSend={onSend} busy={busy} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  thread: { padding: 12, flexGrow: 1 },
  tag: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  tagText: { color: '#fff', fontFamily: font.semibold, fontSize: 11 },
})
