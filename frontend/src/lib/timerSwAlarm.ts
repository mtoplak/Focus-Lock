import type { TimerMode } from '../types'
import type { TimerEndSchedule } from './timerSwSync'

export type TimerAlarmDeps = {
  now: () => number
  setTimer: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimer: (id: ReturnType<typeof setTimeout>) => void
}

export type TimerEndAlarmScheduler = {
  schedule: (schedule: TimerEndSchedule) => void
  clear: () => void
}

export function createTimerEndAlarmScheduler(
  onFire: (mode: TimerMode) => void,
  deps: TimerAlarmDeps = {
    now: () => Date.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (id) => clearTimeout(id),
  },
): TimerEndAlarmScheduler {
  let endAlarmId: ReturnType<typeof setTimeout> | null = null

  const clear = (): void => {
    if (endAlarmId !== null) {
      deps.clearTimer(endAlarmId)
      endAlarmId = null
    }
  }

  const schedule = (input: TimerEndSchedule): void => {
    clear()
    if (!input.notificationsEnabled) return

    const delay = input.endsAt - deps.now()
    if (delay <= 0) return

    endAlarmId = deps.setTimer(() => {
      endAlarmId = null
      onFire(input.mode)
    }, delay)
  }

  return { schedule, clear }
}
