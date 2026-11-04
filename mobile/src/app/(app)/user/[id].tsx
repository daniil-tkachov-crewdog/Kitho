// Someone's profile (opened from Inbox → Who liked me, or a chat header): Like / Message / Open chat.
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../../lib/auth'
import { errorText, getProfile, getSentState, likeProfile, photoUrls, sendMessage, type Profile } from '../../../lib/api'
import { colors } from '../../../lib/theme'
import { ChevronLeftIcon, HeartIcon } from '../../../components/Icons'
import ProfileCard, { actionStyle } from '../../../components/ProfileCard'
import GreetingModal from '../../../components/GreetingModal'
import { Alert, Button, H, Panel, Spinner } from '../../../components/ui'

export default function UserProfile() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const uid = session!.user.id
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [urls, setUrls] = useState<string[]>([])
  const [liked, setLiked] = useState(false)
  const [chatId, setChatId] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msgOpen, setMsgOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await getProfile(id)
        if (cancelled) return
        setProfile(p)
        if (!p) return
        const [sent, map] = await Promise.all([getSentState(uid, [p.id]), photoUrls(p.photos.map((x) => x.path))])
        if (cancelled) return
        setLiked(sent.liked.has(p.id))
        setChatId(sent.chats.get(p.id))
        setUrls(p.photos.map((x) => map[x.path]).filter(Boolean))
      } catch (e) {
        if (!cancelled) setError(errorText(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, uid])

  async function onLike() {
    setBusy(true)
    setError('')
    try {
      await likeProfile(uid, id)
      setLiked(true)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))} accessibilityLabel="Back">
          <ChevronLeftIcon />
        </Pressable>
      </View>
      {profile === undefined && !error ? (
        <Spinner />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {!!error && <Alert kind="error">{error}</Alert>}
          {profile === null && (
            <Panel style={{ alignItems: 'center' }}>
              <H size={22}>Profile not available</H>
            </Panel>
          )}
          {profile && (
            <ProfileCard
              profile={profile}
              urls={urls}
              actions={
                <>
                  <Button
                    style={[actionStyle, liked && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
                    kind="ghost"
                    title={liked ? 'Liked' : 'Like back'}
                    icon={<HeartIcon color={colors.accent} fill={liked ? colors.accent : 'none'} />}
                    onPress={onLike}
                    disabled={busy || liked}
                  />
                  <Button style={actionStyle} title={chatId ? 'Open chat' : 'Message'} onPress={() => (chatId ? router.push(`/chat/${chatId}`) : setMsgOpen(true))} />
                </>
              }
            />
          )}
        </ScrollView>
      )}
      {profile && msgOpen && (
        <GreetingModal
          name={profile.name}
          onClose={() => setMsgOpen(false)}
          onSend={async (body) => {
            const newId = await sendMessage(profile.id, body)
            setChatId(newId)
            setMsgOpen(false)
            router.push(`/chat/${newId}`)
          }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: 8, paddingVertical: 4 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingTop: 0 },
})
