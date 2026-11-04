// Port of web/src/pages/Chat.tsx.
import { useEffect, useState } from 'react'
import { Alert as RNAlert, FlatList, KeyboardAvoidingView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../../lib/auth'
import {
  declineChat, errorText, getBlockState, getChat, getMessages, likeProfile, markChatRead, photoUrls, reportProfile, sendMessage, subscribeChat,
  toggleBlock, toggleMessageLike, type BlockState, type ChatDetail, type Message,
} from '../../../lib/api'
import { colors } from '../../../lib/theme'
import Avatar from '../../../components/Avatar'
import { AlertIcon, BanIcon } from '../../../components/Icons'
import ReportSheet from '../../../components/ReportSheet'
import { Bubble, ChatHeader, Composer, HeadButton, Note } from '../../../components/chat'
import { Alert, Button, H, Panel, Spinner, T } from '../../../components/ui'

const upsert = (list: Message[], m: Message) =>
  list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m]

export default function Chat() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const uid = session!.user.id
  const [chat, setChat] = useState<ChatDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [block, setBlock] = useState<BlockState>({ i_blocked: false, blocked_me: false })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [c, msgs] = await Promise.all([getChat(uid, id), getMessages(id)])
        if (cancelled) return
        if (!c) return setMissing(true)
        setChat(c)
        setMessages(msgs)
        getBlockState(c.profile.id).then((b) => !cancelled && setBlock(b), () => {})
        const path = c.profile.photos[0]?.path
        if (path) setPhoto((await photoUrls([path]))[path] ?? null)
        markChatRead(id).catch(() => {})
      } catch (e) {
        if (!cancelled) setError(errorText(e))
      }
    })()
    const unsubscribe = subscribeChat(
      uid,
      id,
      (m) => {
        setMessages((list) => upsert(list, m))
        if (m.sender_id !== uid) markChatRead(id).catch(() => {})
      },
      (st) => setChat((c) => c && { ...c, ...st }),
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [id, uid])

  async function run(action: () => Promise<void>): Promise<boolean> {
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch (e) {
      setError(errorText(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  function onLike(m: Message) {
    void run(async () => {
      const liked = await toggleMessageLike(m.id)
      setMessages((list) =>
        list.map((x) => (x.id === m.id ? { ...x, liked_by: liked ? [...x.liked_by.filter((u) => u !== uid), uid] : x.liked_by.filter((u) => u !== uid) } : x)),
      )
    })
  }

  const onSend = (text: string) =>
    run(async () => {
      if (!chat) return
      await sendMessage(chat.profile.id, text)
      setMessages(await getMessages(id))
      setChat((c) => c && (c.status === 'pending' && c.initiator_id !== uid ? { ...c, status: 'active' } : c))
    })

  if (missing) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Panel style={{ alignItems: 'center' }}>
            <H size={22}>Chat not found</H>
            <Button kind="ghost" title="Back to inbox" onPress={() => router.replace('/inbox')} />
          </Panel>
        </View>
      </SafeAreaView>
    )
  }
  if (!chat) return error ? <SafeAreaView style={s.safe}><View style={s.center}><Alert kind="error">{error}</Alert></View></SafeAreaView> : <Spinner />

  const p = chat.profile
  const isSender = chat.initiator_id === uid
  const waiting = chat.status === 'pending' && isSender
  const letterForMe = chat.status === 'pending' && !isSender
  const closed = chat.status === 'declined'
  const blocked = block.i_blocked || block.blocked_me
  const canWrite = !waiting && !closed && !blocked
  const otherRead = new Date(chat.other_read_at).getTime()

  function onBlock() {
    if (block.i_blocked) return void run(async () => setBlock({ ...block, i_blocked: await toggleBlock(p.id) }))
    RNAlert.alert(`Block ${p.name}?`, 'You won’t be able to message each other and you’ll stop seeing each other in Discover. You can unblock any time from this chat.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => void run(async () => setBlock({ ...block, i_blocked: await toggleBlock(p.id) })) },
    ])
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ChatHeader
        avatar={<Avatar url={photo} size={40} />}
        title={<T weight="semibold" numberOfLines={1}>{p.name}, {p.age}</T>}
        subtitle={p.location}
        onPressWho={() => router.push(`/user/${p.id}`)}
        right={
          <>
            <HeadButton label={`Report ${p.name}`} onPress={() => setReportOpen(true)}><AlertIcon /></HeadButton>
            <HeadButton label={block.i_blocked ? `Unblock ${p.name}` : `Block ${p.name}`} on={block.i_blocked} onPress={onBlock} disabled={busy}>
              <BanIcon color={block.i_blocked ? colors.danger : undefined} />
            </HeadButton>
          </>
        }
      />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.thread}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<View style={{ transform: [{ scaleY: -1 }] }}><Note>It’s a match! Say hi to {p.name}.</Note></View>}
          renderItem={({ item: m }) => {
            const mine = m.sender_id === uid
            return (
              <Bubble
                mine={mine}
                body={m.body}
                at={m.created_at}
                likes={m.liked_by.length}
                likedByMe={m.liked_by.includes(uid)}
                onLike={() => !busy && onLike(m)}
                status={mine ? (new Date(m.created_at).getTime() <= otherRead ? 'Seen' : 'Delivered') : null}
              />
            )
          }}
        />
        {!!error && <View style={{ paddingHorizontal: 12 }}><Alert kind="error">{error}</Alert></View>}
        {block.i_blocked && <Note>You blocked {p.name}. Unblock to message each other again.</Note>}
        {!block.i_blocked && block.blocked_me && <Note>You can’t message this user.</Note>}
        {!blocked && waiting && <Note>Letter sent. You can write again once {p.name} replies.</Note>}
        {!blocked && closed && <Note>{isSender ? `${p.name} declined your letter.` : 'You declined this letter.'} This conversation is closed.</Note>}
        {!blocked && letterForMe && (
          <View style={s.letter}>
            <T muted size={14} style={{ textAlign: 'center' }}>{p.name} sent you a letter. Reply, like back, or decline.</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button style={{ flex: 1 }} small kind="ghost" title="Like back" disabled={busy} onPress={() => void run(async () => {
                await likeProfile(uid, p.id)
                setChat((c) => c && { ...c, status: 'active' })
              })} />
              <Button style={{ flex: 1 }} small kind="ghost" title="Decline" disabled={busy} onPress={() => void run(async () => {
                await declineChat(chat.id)
                router.replace('/inbox')
              })} />
            </View>
          </View>
        )}
        {canWrite && <Composer placeholder={letterForMe ? `Reply to ${p.name}…` : 'Write a message…'} onSend={onSend} busy={busy} />}
      </KeyboardAvoidingView>
      {reportOpen && <ReportSheet name={p.name} onClose={() => setReportOpen(false)} onSubmit={(reason, details) => reportProfile(uid, p.id, reason, details)} />}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', padding: 16 },
  thread: { padding: 12, flexGrow: 1 },
  letter: { gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
})
