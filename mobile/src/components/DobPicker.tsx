import DateTimePicker from '@react-native-community/datetimepicker'
import { StyleSheet, View } from 'react-native'
import type { Dob } from '../lib/api'
import { colors } from '../lib/theme'

/** iOS spinner wheel for date of birth (18–100 years ago), same range as web DobWheel. */
export default function DobPicker({ value, onChange }: { value: Dob; onChange: (d: Dob) => void }) {
  const now = new Date()
  const max = new Date(now.getFullYear() - 18, 11, 31)
  const min = new Date(now.getFullYear() - 100, 0, 1)
  return (
    <View style={s.wrap}>
      <DateTimePicker
        value={new Date(value.year, value.month - 1, value.day)}
        mode="date"
        display="spinner"
        maximumDate={max}
        minimumDate={min}
        themeVariant="light"
        textColor={colors.text}
        onChange={(_, d) => d && onChange({ day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() })}
      />
    </View>
  )
}

const s = StyleSheet.create({ wrap: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.inputBorder } })
