// Port of web/src/pages/Feed.tsx. Swipe left = Sweep; tap photo sides = prev/next photo.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, PanResponder, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useAuth } from '../../../lib/auth'
import { errorText, getFeedPage, getSentState, likeProfile, photoUrls, sendMessage, setFrozen, type Profile } from '../../../lib/api'
import { colors } from '../../../lib/theme'
import { HeartIcon } from '../../../components/Icons'
import ProfileCard, { actionStyle } from '../../../components/ProfileCard'
import GreetingModal from '../../../components/GreetingModal'
import { Alert, Button, H, Panel, Spinner, T } from '../../../components/ui'

const PAGE = 20
const posKey = (uid: string) => `kitho.feedPos.${uid}`

type Batch = { start: number; items: Profile[]; liked: Set<string>; chats: Map<string, string> }

export default function Feed() {
  const { session, status } = useAuth()
  const [pos, setPos] = useState<number | null>(null)
  const uid = session!.user.id

  // Restore my place in the feed.
  useEffect(() => {
    AsyncStorage.getItem(posKey(uid))
      .then((v) => {
        const n = Number(v)
        setPos(Number.isFinite(n) && n >= 0 ? n : 0)
      })
      .catch(() => setPos(0))
  }, [uid])

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <H style={s.title}>Discover</H>
      {status?.frozen ? <FrozenNotice /> : pos === null ? <Spinner /> : <FeedInner uid={uid} initialPos={pos} />}
    </SafeAreaView>
  )
}

/** Frozen users don't browse; they see how to come back. */
function FrozenNotice() {
  const { session, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function unfreeze() {
    setBusy(true)
    setError('')
    try {
      await setFrozen(session!.user.id, false)
      await refreshProfile()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }
  return (
    <View style={s.centerWrap}>
      <Panel style={{ alignItems: 'center' }}>
        <H size={22}>Your profile is frozen</H>
        <T muted style={{ textAlign: 'center', marginBottom: 16 }}>You’re hidden from Discover. Your open chats still work in Inbox.</T>
        {!!error && <Alert kind="error">{error}</Alert>}
        <Button title={busy ? 'Unfreezing…' : 'Unfreeze profile'} onPress={unfreeze} disabled={busy} />
      </Panel>
    </View>
  )
}

function FeedInner({ uid, initialPos }: { uid: string; initialPos: number }) {
  const [pos, setPos] = useState(initialPos)
  const [batch, setBatch] = useState<Batch | null>(null)
  const [urls, setUrls] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)

  const start = Math.floor(pos / PAGE) * PAGE

  useEffect(() => {
    AsyncStorage.setItem(posKey(uid), String(pos)).catch(() => {}) // position just won't persist
  }, [uid, pos])

  // Load the page containing `pos`. Past the end → wrap around to the first profile.
  useEffect(() => {
    if (batch?.start === start) return
    let cancelled = false
    ;(async () => {
      try {
        const items = await getFeedPage(uid, start, PAGE)
        if (cancelled) return
        if (!items.length && start > 0) return setPos(0)
        const { liked, chats } = await getSentState(uid, items.map((p) => p.id))
        if (!cancelled) setBatch({ start, items, liked, chats })
      } catch (e) {
        if (!cancelled) setError(errorText(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, start, batch?.start])

  const current = batch && batch.start === start ? batch.items[pos - start] : undefined
  const reachedEnd = !!batch && batch.start === start && batch.items.length > 0 && !current

  useEffect(() => {
    if (!reachedEnd) return
    setBatch(null) // reload so new profiles show up on the next lap
    setPos(0)
  }, [reachedEnd])

  useEffect(() => {
    setUrls([])
    if (!current) return
    let cancelled = false
    photoUrls(current.photos.map((p) => p.path))
      .then((map) => !cancelled && setUrls(current.photos.map((p) => map[p.path]).filter(Boolean)))
      .catch((e) => !cancelled && setError(errorText(e)))
    return () => {
      cancelled = true
    }
  }, [current])

  const next = useCallback(() => {
    setError('')
    setPos((p) => p + 1)
  }, [])

  // Swipe left to sweep.
  const dx = useRef(new Animated.Value(0)).current
  const nextRef = useRef(next)
  nextRef.current = next
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => dx.setValue(Math.min(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -110 || g.vx < -0.8) {
          Animated.timing(dx, { toValue: -600, duration: 180, useNativeDriver: true }).start(() => {
            nextRef.current()
            dx.setValue(0)
          })
        } else {
          Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start()
        }
      },
      onPanResponderTerminate: () => Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current

  async function onLike() {
    if (!current || !batch) return
    setBusy(true)
    setError('')
    try {
      await likeProfile(uid, current.id)
      setBatch({ ...batch, liked: new Set(batch.liked).add(current.id) })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (error && !batch) return <View style={s.centerWrap}><Alert kind="error">{error}</Alert></View>
  if (!batch || batch.start !== start) return <Spinner />

  if (!batch.items.length) {
    return (
      <View style={s.centerWrap}>
        <Panel style={{ alignItems: 'center' }}>
          <H size={22}>No one here yet</H>
          <T muted style={{ textAlign: 'center' }}>You’re early! New profiles will show up here as people join. Check back soon.</T>
        </Panel>
      </View>
    )
  }
  if (!current) return <Spinner />

  const liked = batch.liked.has(current.id)
  const chatId = batch.chats.get(current.id)
  const rotate = dx.interpolate({ inputRange: [-300, 0], outputRange: ['-6deg', '0deg'], extrapolate: 'clamp' })

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      {!!error && <Alert kind="error">{error}</Alert>}
      <Animated.View style={{ transform: [{ translateX: dx }, { rotate }] }} {...pan.panHandlers}>
        <ProfileCard
          profile={current}
          urls={urls}
          actions={
            <>
              <Button style={actionStyle} kind="ghost" title="Sweep" onPress={next} />
              <Button
                style={[actionStyle, liked && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
                kind="ghost"
                title={liked ? 'Liked' : 'Like'}
                icon={<HeartIcon color={colors.accent} fill={liked ? colors.accent : 'none'} />}
                onPress={onLike}
                disabled={busy || liked}
              />
              <Button style={actionStyle} title={chatId ? 'Chat' : 'Message'} onPress={() => (chatId ? router.push(`/chat/${chatId}`) : setMsgOpen(true))} />
            </>
          }
        />
      </Animated.View>
      {msgOpen && (
        <GreetingModal
          name={current.name}
          onClose={() => setMsgOpen(false)}
          onSend={async (body) => {
            const id = await sendMessage(current.id, body)
            setBatch((b) => b && { ...b, chats: new Map(b.chats).set(current.id, id) })
            setMsgOpen(false)
          }}
        />
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: 16, paddingTop: 8 },
  centerWrap: { flex: 1, justifyContent: 'center', padding: 16 },
  scroll: { padding: 16, paddingTop: 4 },
})
