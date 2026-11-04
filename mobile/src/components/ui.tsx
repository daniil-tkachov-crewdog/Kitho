import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native'
import { colors, font, radius } from '../lib/theme'

type BtnKind = 'primary' | 'ghost' | 'danger'

export function Button({ title, onPress, kind = 'primary', disabled, icon, small, style }: {
  title: string
  onPress?: () => void
  kind?: BtnKind
  disabled?: boolean
  icon?: ReactNode
  small?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSm, s[kind], disabled && s.disabled, pressed && !disabled && s.pressed, style]}
    >
      {icon}
      <Text style={[s.btnText, kind === 'ghost' ? s.ghostText : s.solidText]}>{title}</Text>
    </Pressable>
  )
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={s.field}>
      {label && <Text style={s.label}>{label}{hint ? <Text style={s.hint}>  {hint}</Text> : null}</Text>}
      {children}
    </View>
  )
}

export function Input({ style, multiline, editable = true, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      editable={editable}
      multiline={multiline}
      style={[s.input, multiline && s.textarea, !editable && s.inputDisabled, style as StyleProp<TextStyle>]}
      {...props}
    />
  )
}

export function Alert({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  return (
    <View style={[s.alert, kind === 'ok' ? s.alertOk : s.alertErr]}>
      <Text style={[s.alertText, { color: kind === 'ok' ? colors.okText : colors.errorText }]}>{children}</Text>
    </View>
  )
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.panel, style]}>{children}</View>
}

export function Spinner() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  )
}

export function T({ children, style, muted, weight = 'regular', size = 15, numberOfLines }: {
  children: ReactNode
  style?: StyleProp<TextStyle>
  muted?: boolean
  weight?: keyof typeof font
  size?: number
  numberOfLines?: number
}) {
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: font[weight], fontSize: size, color: muted ? colors.muted : colors.text, lineHeight: size * 1.45 }, style]}>{children}</Text>
}

export function H({ children, size = 26, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: font.medium, fontSize: size, color: colors.text, letterSpacing: -0.035 * size, marginBottom: 8 }, style]}>{children}</Text>
}

const s = StyleSheet.create({
  btn: { height: 52, borderRadius: radius.pill, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent' },
  btnSm: { height: 44, paddingHorizontal: 18 },
  primary: { backgroundColor: colors.text },
  ghost: { backgroundColor: colors.surface, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.98 }] },
  btnText: { fontFamily: font.medium, fontSize: 15 },
  solidText: { color: '#fff' },
  ghostText: { color: colors.text },
  field: { marginBottom: 16 },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.text, marginBottom: 6 },
  hint: { fontFamily: font.regular, color: colors.muted, fontSize: 13 },
  input: { height: 48, fontFamily: font.regular, fontSize: 16, color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.input, paddingHorizontal: 16 },
  textarea: { height: 120, paddingTop: 12, textAlignVertical: 'top' },
  inputDisabled: { backgroundColor: colors.inputDisabled, color: '#5E575F' },
  alert: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 },
  alertOk: { backgroundColor: colors.okBg },
  alertErr: { backgroundColor: colors.errorBg },
  alertText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.panel, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
})
