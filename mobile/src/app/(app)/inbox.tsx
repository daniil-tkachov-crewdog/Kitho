import { Linking, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WEBSITE } from '../../lib/config'
import { colors } from '../../lib/theme'
import { Button, H, Panel, T } from '../../components/ui'

/** Placeholder until Inbox / Chat come to the app. */
export default function Inbox() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <H style={s.title}>Inbox</H>
      <View style={s.body}>
        <Panel style={{ alignItems: 'center' }}>
          <H size={22}>Coming soon</H>
          <T muted style={{ textAlign: 'center', marginBottom: 16 }}>Likes and chats are coming to the app. For now, open your inbox on the website.</T>
          <Button kind="ghost" title="Open inbox on kitho.co.uk" onPress={() => Linking.openURL(`${WEBSITE}/inbox`)} />
        </Panel>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: 16, paddingTop: 8 },
  body: { flex: 1, justifyContent: 'center', padding: 16 },
})
