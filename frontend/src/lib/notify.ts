import type { TimerMode } from '../types'

type NotifyEvent = 'start' | 'end'

const TITLES: Record<TimerMode, Record<NotifyEvent, string>> = {
  focus: { start: 'Focus session started', end: 'Focus session complete' },
  'short-break': { start: 'Short break started', end: 'Short break over' },
  'long-break': { start: 'Long break started', end: 'Long break over' },
}

const BODIES: Record<NotifyEvent, Record<TimerMode, string>> = {
  start: {
    focus: 'Time to focus — eyes on the task.',
    'short-break': 'Take a quick breather.',
    'long-break': 'Step away and recharge.',
  },
  end: {
    focus: 'Nice work — time for a break.',
    'short-break': "Break's up. Ready to focus?",
    'long-break': 'Long break done. Back to it when you are ready.',
  },
}

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

export async function notifyTimer(event: NotifyEvent, mode: TimerMode): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return

  const title = TITLES[mode][event]
  const options: NotificationOptions = {
    body: BODIES[event][mode],
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `focus-lock-${mode}-${event}`,
    renotify: true,
  } as NotificationOptions

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
