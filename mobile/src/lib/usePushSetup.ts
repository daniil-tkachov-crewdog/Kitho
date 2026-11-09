import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { enablePush } from './push'

/** Signed-in area: register this device for pushes and open the right screen when one is tapped. */
export function usePushSetup(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    enablePush(true).catch((e) => console.warn('[push]', e instanceof Error ? e.message : e))
  }, [enabled])

  const last = Notifications.useLastNotificationResponse()
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!enabled || !last) return
    const id = last.notification.request.identifier
    const url = last.notification.request.content.data?.url
    if (handled.current === id || typeof url !== 'string' || !url.startsWith('/')) return
    handled.current = id
    router.push(url as never)
  }, [enabled, last])
}
