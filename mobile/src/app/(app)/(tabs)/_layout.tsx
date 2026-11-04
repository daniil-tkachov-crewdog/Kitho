import { Tabs } from 'expo-router/tabs'
import { useUnreadCount } from '../../../lib/useUnreadCount'
import { colors, font } from '../../../lib/theme'
import { CompassIcon, InboxIcon, UserIcon } from '../../../components/Icons'

export default function TabsLayout() {
  const unread = useUnreadCount()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: colors.accent, fontFamily: font.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Discover', tabBarIcon: ({ color }) => <CompassIcon color={color as string} /> }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color }) => <InboxIcon color={color as string} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <UserIcon color={color as string} /> }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  )
}
