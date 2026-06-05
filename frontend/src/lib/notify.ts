import type { TimerMode } from '../types'
import {
  timerNotificationOptions,
  timerNotificationTitle,
  type TimerNotifyEvent,
} from './timerNotificationContent'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function notifyTimer(event: TimerNotifyEvent, mode: TimerMode): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return

  const title = timerNotificationTitle(event, mode)
  const options = timerNotificationOptions(event, mode)

  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return
    }
  } catch {
    // fall through to direct Notification
  }

  try {
    new Notification(title, options)
  } catch {
    // some platforms (e.g. installed PWAs on Android) only allow SW notifications
  }
}
