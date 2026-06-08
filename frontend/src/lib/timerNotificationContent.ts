import type { TimerMode } from '../types'

export type TimerNotifyEvent = 'start' | 'end'

const TITLES: Record<TimerMode, Record<TimerNotifyEvent, string>> = {
  focus: { start: 'Focus session started', end: 'Focus session complete' },
  'short-break': { start: 'Short break started', end: 'Short break over' },
  'long-break': { start: 'Long break started', end: 'Long break over' },
}

const BODIES: Record<TimerNotifyEvent, Record<TimerMode, string>> = {
  start: {
    focus: 'Time to focus – eyes on the task.',
    'short-break': 'Take a quick breather.',
    'long-break': 'Step away and recharge.',
  },
  end: {
    focus: 'Nice work – time for a break.',
    'short-break': "Break's up. Ready to focus?",
    'long-break': 'Long break done. Back to it when you are ready.',
  },
}

export function timerNotificationTitle(event: TimerNotifyEvent, mode: TimerMode): string {
  return TITLES[mode][event]
}

export function timerNotificationBody(event: TimerNotifyEvent, mode: TimerMode): string {
  return BODIES[event][mode]
}

export function timerNotificationOptions(
  event: TimerNotifyEvent,
  mode: TimerMode,
): NotificationOptions {
  return {
    body: timerNotificationBody(event, mode),
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `focus-lock-${mode}-${event}`,
    renotify: true,
  } as NotificationOptions
}
