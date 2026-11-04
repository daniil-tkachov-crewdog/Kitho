import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { usePathname } from 'expo-router'
import { subscribeMyChats, unreadTotal } from './api'

/** Total unread messages (chats + admin), live via realtime, refreshed on navigation and app foreground. */
export function useUnreadCount() {
  const pathname = usePathname()
  const [count, setCount] = useState(0)
  useEffect(() => {
    const refresh = () => void unreadTotal().then(setCount, () => {})
    refresh()
    const unsubscribe = subscribeMyChats(refresh)
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh())
    return () => {
      unsubscribe()
      sub.remove()
    }
  }, [pathname])
  return count
}
