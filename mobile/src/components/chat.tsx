// Shared pieces of the user chat and the admin chat screens.
import { useRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { time } from '../lib/format'
import { colors, font, radius } from '../lib/theme'
import { ChevronLeftIcon, HeartIcon } from './Icons'
import { Button, T } from './ui'

export function ChatHeader({ avatar, title, subtitle, onPressWho, right }: {
  avatar: ReactNode
  title: ReactNode
  subtitle: string
  onPressWho?: () => void
  right?: ReactNode
}) {
  return (
    <View style={s.head}>
      <Pressable style={s.iconBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))} accessibilityLabel="Back to inbox">
        <ChevronLeftIcon />
      </Pressable>
      <Pressable style={s.who} onPress={onPressWho} disabled={!onPressWho}>
        {avatar}
        <View style={{ flex: 1, minWidth: 0 }}>
          {title}
          <T muted size={13} numberOfLines={1}>{subtitle}</T>
        </View>
      </Pressable>
      {right}
    </View>
  )
}

export function HeadButton({ children, onPress, on, label, disabled }: { children: ReactNode; onPress: () => void; on?: boolean; label: string; disabled?: boolean }) {
  return (
    <Pressable style={[s.iconBtn, on && s.iconBtnOn]} onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityState={{ selected: on }}>
      {children}
    </Pressable>
  )
}

/** One message bubble. Double-tap or the heart toggles my like (when `onLike` is given). */
export function Bubble({ mine, body, at, likes = 0, likedByMe, onLike, status }: {
  mine: boolean
  body: string
  at: string
  likes?: number
  likedByMe?: boolean
  onLike?: () => void
  status?: string | null
}) {
  const lastTap = useRef(0)
  const onPress = () => {
    const now = Date.now()
    if (onLike && now - lastTap.current < 300) onLike()
    lastTap.current = now
  }
  return (
    <View style={[s.msg, mine ? s.mine : s.theirs]}>
      <View style={[s.msgRow, mine && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={onPress} style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
          <Text style={[s.body, mine && { color: '#fff' }]}>{body}</Text>
          <Text style={[s.time, mine && { color: 'rgba(255,255,255,0.7)' }]}>{time(at)}</Text>
          {likes > 0 && (
            <View style={[s.likes, mine ? { left: -6 } : { right: -6 }]}>
              <HeartIcon size={12} color={colors.accent} fill={colors.accent} />
              {likes > 1 && <Text style={s.likesText}>{likes}</Text>}
            </View>
          )}
        </Pressable>
        {onLike && (
          <Pressable onPress={onLike} hitSlop={8} accessibilityLabel={likedByMe ? 'Unlike message' : 'Like message'} style={s.likeBtn}>
            <HeartIcon size={16} color={likedByMe ? colors.accent : colors.inputBorder} fill={likedByMe ? colors.accent : 'none'} />
          </Pressable>
        )}
      </View>
      {status && <Text style={s.status}>{status}</Text>}
    </View>
  )
}

export function Composer({ placeholder = 'Write a message…', onSend, busy }: { placeholder?: string; onSend: (text: string) => Promise<boolean>; busy?: boolean }) {
  const [body, setBody] = useState('')
  async function send() {
    const text = body.trim()
    if (text && (await onSend(text))) setBody('')
  }
  return (
    <View style={s.composer}>
      <TextInput
        style={s.input}
        multiline
        maxLength={2000}
        value={body}
        onChangeText={setBody}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
      />
      <Button small title="Send" onPress={send} disabled={busy || !body.trim()} />
    </View>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <T muted size={14} style={s.note}>{children}</T>
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconBtnOn: { backgroundColor: colors.errorBg },
  msg: { marginVertical: 4, maxWidth: '86%' },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, flexShrink: 1 },
  bubbleMine: { backgroundColor: colors.text, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  time: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
  likes: { position: 'absolute', bottom: -8, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 5, paddingVertical: 2 },
  likesText: { fontFamily: font.semibold, fontSize: 11, color: colors.accent },
  likeBtn: { padding: 2 },
  status: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 4, marginHorizontal: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, minHeight: 44, maxHeight: 120, fontFamily: font.regular, fontSize: 16, color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11 },
  note: { textAlign: 'center', paddingHorizontal: 16, paddingVertical: 8 },
})
