// Port of web/src/pages/Inbox.tsx.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { useAuth } from '../../../lib/auth'
import {
  errorText, getLikesReceived, getMyAdminChat, listChats, photoUrls, subscribeMyChats, type AdminChatSummary, type ChatSummary, type InboxLike, type Profile,
} from '../../../lib/api'
import { when } from '../../../lib/format'
import { colors, font, radius } from '../../../lib/theme'
import Avatar from '../../../components/Avatar'
import { Alert, H, Spinner, T } from '../../../components/ui'

type Chat = ChatSummary & { profile: Profile }
type Data = { likes: InboxLike[]; chats: Chat[]; admin: AdminChatSummary | null; urls: Record<string, string> }

function chatLabel(c: Chat, uid: string): string | null {
  if (c.status === 'declined') return 'Declined'
  if (c.status === 'pending') return c.initiator_id === uid ? 'Waiting for reply' : 'New letter'
  if (!c.last_message_at) return 'New match — say hi!'
  return null
}

export default function Inbox() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [tab, setTab] = useState<'likes' | 'chats'>('chats')
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [likes, chats, admin] = await Promise.all([getLikesReceived(uid), listChats(), getMyAdminChat()])
      const paths = [...likes, ...chats].map((r) => r.profile.photos[0]?.path).filter(Boolean) as string[]
      const urls = paths.length ? await photoUrls([...new Set(paths)]) : {}
      setData({ likes, chats, admin, urls })
      setError('')
    } catch (e) {
      setError(errorText(e))
    }
  }, [uid])

  useEffect(() => subscribeMyChats(() => void load()), [load])
  useFocusEffect(useCallback(() => void load(), [load])) // e.g. unread counts after leaving a chat

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const unread = (data?.chats.reduce((n, c) => n + c.unread, 0) ?? 0) + (data?.admin?.unread ?? 0)
  const photo = (p: Profile) => (p.photos[0] && data?.urls[p.photos[0].path]) || null

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <H style={s.title}>Inbox</H>
      <View style={s.switcher} accessibilityRole="tablist">
        {(['chats', 'likes'] as const).map((t) => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>
              {t === 'chats' ? `Chats${unread ? ` (${unread} new)` : ''}` : `Who liked me${data ? ` (${data.likes.length})` : ''}`}
            </Text>
          </Pressable>
        ))}
      </View>
      {!data && !error ? (
        <Spinner />
      ) : (
        <ScrollView contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {!!error && <Alert kind="error">{error}</Alert>}
          {data && tab === 'likes' && (
            <>
              {!data.likes.length && <T muted>No likes yet. They’ll show up here.</T>}
              {data.likes.map(({ created_at, profile: p }) => (
                <Row key={p.id} avatar={<Avatar url={photo(p)} />} onPress={() => router.push(`/user/${p.id}`)}>
                  <T numberOfLines={1}><T weight="semibold">{p.name}, {p.age}</T><T muted> · {p.location}</T></T>
                  <T muted size={13}>{when(created_at)}</T>
                </Row>
              ))}
            </>
          )}
          {data && tab === 'chats' && (
            <>
              {!data.chats.length && !data.admin && <T muted>No chats yet. Match with someone or send a letter to start one.</T>}
              {data.admin && (
                <Row admin avatar={<Avatar letter="K" />} unread={data.admin.unread} onPress={() => router.push('/chat/admin')}>
                  <View style={s.nameRow}>
                    <T weight="semibold">Admin</T>
                    <View style={s.adminTag}><Text style={s.adminTagText}>Kitho</Text></View>
                  </View>
                  <T muted size={13}>{when(data.admin.last_message_at ?? data.admin.created_at)}</T>
                  {!!data.admin.last_body && <T numberOfLines={1} size={14} style={s.preview}>{data.admin.last_from_admin ? '' : 'You: '}{data.admin.last_body}</T>}
                </Row>
              )}
              {data.chats.map((c) => {
                const label = chatLabel(c, uid)
                return (
                  <Row key={c.id} avatar={<Avatar url={photo(c.profile)} />} unread={c.unread} onPress={() => router.push(`/chat/${c.id}`)}>
                    <T numberOfLines={1}><T weight="semibold">{c.profile.name}, {c.profile.age}</T><T muted> · {c.profile.location}</T></T>
                    <T muted size={13}>
                      {when(c.last_message_at ?? c.created_at)}
                      {label && <T size={13} weight="medium" style={{ color: colors.accent }}> · {label}</T>}
                    </T>
                    {!!c.last_body && <T numberOfLines={1} size={14} style={s.preview}>{c.last_sender_id === uid ? 'You: ' : ''}{c.last_body}</T>}
                  </Row>
                )
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Row({ avatar, unread = 0, admin, onPress, children }: { avatar: ReactNode; unread?: number; admin?: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, admin && s.rowAdmin, pressed && { opacity: 0.7 }]}>
      {avatar}
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {unread > 0 && <View style={s.badge} accessibilityLabel={`${unread} unread`}><Text style={s.badgeText}>{unread}</Text></View>}
    </Pressable>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: 16, paddingTop: 8 },
  switcher: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, padding: 4, marginHorizontal: 16, marginBottom: 12 },
  tab: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.text },
  tabText: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  tabTextOn: { color: '#fff' },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 12 },
  rowAdmin: { backgroundColor: colors.accentSoft, borderColor: '#F3C9CE' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminTag: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  adminTagText: { color: '#fff', fontFamily: font.semibold, fontSize: 11 },
  preview: { color: colors.text2, marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontFamily: font.semibold, fontSize: 12 },
})
