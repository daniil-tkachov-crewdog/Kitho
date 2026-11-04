import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { colors } from '../lib/theme'

/** Photos with tap-left / tap-right to go back / forward, and dots on top. */
export default function PhotoCarousel({ urls }: { urls: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => setI(0), [urls])
  const go = (d: number) => setI((n) => Math.min(urls.length - 1, Math.max(0, n + d)))

  return (
    <View style={s.wrap}>
      {urls[i] ? <Image source={{ uri: urls[i] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
      <View style={s.taps}>
        <Pressable style={s.tap} onPress={() => go(-1)} accessibilityLabel="Previous photo" />
        <Pressable style={s.tap} onPress={() => go(1)} accessibilityLabel="Next photo" />
      </View>
      {urls.length > 1 && (
        <View style={s.dots} pointerEvents="none">
          {urls.map((_, n) => <View key={n} style={[s.dot, n === i && s.dotOn]} />)}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surface2, overflow: 'hidden' },
  taps: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  tap: { flex: 1 },
  dots: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { backgroundColor: '#fff' },
})
