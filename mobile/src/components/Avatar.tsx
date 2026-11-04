import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { colors, font } from '../lib/theme'

/** Round avatar: photo, or a letter (e.g. "K" for the admin) on the accent background. */
export default function Avatar({ url, letter, size = 52 }: { url?: string | null; letter?: string; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 }
  if (url) return <Image source={{ uri: url }} style={[box, s.bg]} contentFit="cover" />
  return (
    <View style={[box, letter ? s.letterBg : s.bg, s.center]}>
      {letter ? <Text style={[s.letter, { fontSize: size * 0.42 }]}>{letter}</Text> : null}
    </View>
  )
}

const s = StyleSheet.create({
  bg: { backgroundColor: colors.surface2 },
  letterBg: { backgroundColor: colors.accent },
  center: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontFamily: font.semibold },
})
