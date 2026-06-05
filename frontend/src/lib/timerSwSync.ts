import type { TimerMode } from '../types'

export type TimerEndSchedule = {
  endsAt: number
  mode: TimerMode
  notificationsEnabled: boolean
}

type TimerScheduleMessage = {
  type: 'TIMER_SCHEDULE_END'
  schedule: TimerEndSchedule
}

type TimerClearMessage = {
  type: 'TIMER_CLEAR_END'
}

export type TimerSwOutboundMessage = TimerScheduleMessage | TimerClearMessage

export type TimerSwInboundMessage = {
  type: 'TIMER_REQUEST_SYNC'
}

async function activeWorker(): Promise<ServiceWorker | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return reg.active
  } catch {
    return null
  }
}

function postToWorker(message: TimerSwOutboundMessage): void {
  void activeWorker().then((worker) => {
    worker?.postMessage(message)
  })
}

/** Ask the SW to fire a local notification when the current interval ends. */
export function scheduleTimerEndInSw(schedule: TimerEndSchedule): void {
  if (!schedule.notificationsEnabled) {
    clearTimerEndInSw()
    return
  }
  if (schedule.endsAt <= Date.now()) {
    clearTimerEndInSw()
    return
  }
  postToWorker({ type: 'TIMER_SCHEDULE_END', schedule })
}

/** Cancel any pending end-of-interval notification in the SW. */
export function clearTimerEndInSw(): void {
  postToWorker({ type: 'TIMER_CLEAR_END' })
}

/**
 * When the SW activates (update/reload), it asks open clients to resend the
 * current schedule so background alarms are not lost.
 */
export function registerTimerSwResyncListener(
  getSchedule: () => TimerEndSchedule | null,
): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {}
  }

  const onMessage = (event: MessageEvent<TimerSwInboundMessage>) => {
    if (event.data?.type !== 'TIMER_REQUEST_SYNC') return
    const schedule = getSchedule()
    if (schedule) scheduleTimerEndInSw(schedule)
    else clearTimerEndInSw()
  }

  navigator.serviceWorker.addEventListener('message', onMessage)
  return () => navigator.serviceWorker.removeEventListener('message', onMessage)
}
