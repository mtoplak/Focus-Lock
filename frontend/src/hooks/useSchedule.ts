import { useEffect, useState } from 'react'
import type { ScheduleBlock } from '../types'

const toMinutes = (hhmm: string): number | null => {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/** Whether a single schedule window is active at the given moment. */
export function isScheduleActiveAt(schedule: ScheduleBlock, now: Date): boolean {
  if (!schedule.enabled || schedule.days.length === 0) return false

  const start = toMinutes(schedule.start)
  const end = toMinutes(schedule.end)
  if (start === null || end === null || start === end) return false

  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()

  if (start < end) {
    // Same-day window, e.g. 17:00–19:00.
    return schedule.days.includes(day) && minutes >= start && minutes < end
  }

  // Overnight window, e.g. 22:00–02:00. Active if we're past the start on a
  // selected day, or before the end on the day after a selected day.
  if (schedule.days.includes(day) && minutes >= start) return true
  const prevDay = (day + 6) % 7
  if (schedule.days.includes(prevDay) && minutes < end) return true
  return false
}

/** Whether any enabled schedule window is active right now. */
export function anyScheduleActive(schedules: ScheduleBlock[], now: Date): boolean {
  return schedules.some((s) => isScheduleActiveAt(s, now))
}

/**
 * Tracks whether the current moment falls inside any enabled schedule window.
 * Re-evaluates on a short interval so blocking turns on/off at the boundaries
 * without a page reload.
 */
export function useScheduleActive(schedules: ScheduleBlock[]): boolean {
  const [active, setActive] = useState(() => anyScheduleActive(schedules, new Date()))

  useEffect(() => {
    const check = () => setActive(anyScheduleActive(schedules, new Date()))
    check()
    const id = window.setInterval(check, 15_000)
    return () => window.clearInterval(id)
  }, [schedules])

  return active
}
