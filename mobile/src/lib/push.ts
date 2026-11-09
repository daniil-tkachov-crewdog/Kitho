import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { registerPushToken, unregisterPushToken } from './api'

const TOKEN_KEY = 'kitho.pushToken'

// Show pushes as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
})

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable'

export async function getPushStatus(): Promise<PushStatus> {
  if (!Device.isDevice) return 'unavailable'
  const { status } = await Notifications.getPermissionsAsync()
  return status
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
}

/**
 * Asks for permission if `ask` (iOS shows the system prompt only once), then saves this device's
 * Expo push token for the signed-in user. Returns the resulting permission status.
 */
export async function enablePush(ask: boolean): Promise<PushStatus> {
  let status = await getPushStatus()
  if (status === 'unavailable') return status
  if (status === 'undetermined' && ask) status = (await Notifications.requestPermissionsAsync()).status
  if (status !== 'granted') return status
  const id = projectId()
  if (!id) throw new Error('Push needs an EAS project id: run `npx eas init` in mobile/.')
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id })
  await registerPushToken(token, Platform.OS)
  await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {})
  return status
}

/** Call before signing out: this device stops getting pushes for the account. */
export async function disablePushForThisDevice() {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null)
  if (!token) return
  await unregisterPushToken(token).catch(() => {})
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {})
}
