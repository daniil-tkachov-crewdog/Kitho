import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native'
import { colors } from '../lib/theme'
import { H } from './ui'

/** Centered modal card (web Modal). `onClose` undefined → can't be dismissed. */
export default function Sheet({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.card}>
          <H size={22}>{title}</H>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26,23,25,0.45)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 22 },
})
