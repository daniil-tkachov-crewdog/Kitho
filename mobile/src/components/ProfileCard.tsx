import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import type { Profile } from '../lib/api'
import { colors, radius } from '../lib/theme'
import PhotoCarousel from './PhotoCarousel'
import { PinIcon } from './Icons'
import { H, T } from './ui'

/** Photos + name, age, location, bio, with an actions row underneath (Feed and profile view). */
export default function ProfileCard({ profile: p, urls, actions }: { profile: Profile; urls: string[]; actions?: ReactNode }) {
  return (
    <View style={s.card}>
      <PhotoCarousel urls={urls} />
      <View style={s.body}>
        <H size={26} style={{ marginBottom: 0 }}>{p.name}, <T size={26} muted>{p.age}</T></H>
        <View style={s.loc}><PinIcon /><T muted>{p.location}</T></View>
        {!!p.description && <T style={{ marginTop: 10, color: colors.text2 }}>{p.description}</T>}
        {actions && <View style={s.actions}>{actions}</View>}
      </View>
    </View>
  )
}

export const actionStyle = { flex: 1, paddingHorizontal: 8 } as const

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, overflow: 'hidden' },
  body: { padding: 18 },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 18 },
})
