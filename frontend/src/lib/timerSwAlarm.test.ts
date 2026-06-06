import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimerEndAlarmScheduler } from './timerSwAlarm'

describe('timerSwAlarm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires onFire at endsAt for an enabled future schedule', () => {
    const onFire = vi.fn()
    const scheduler = createTimerEndAlarmScheduler(onFire)

    scheduler.schedule({
      endsAt: Date.now() + 5_000,
      mode: 'focus',
      notificationsEnabled: true,
    })

    expect(onFire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5_000)
    expect(onFire).toHaveBeenCalledWith('focus')
  })

  it('does not schedule when notifications are disabled or endsAt has passed', () => {
    const onFire = vi.fn()
    const scheduler = createTimerEndAlarmScheduler(onFire)

    scheduler.schedule({
      endsAt: Date.now() - 1,
      mode: 'focus',
      notificationsEnabled: true,
    })
    scheduler.schedule({
      endsAt: Date.now() + 5_000,
      mode: 'focus',
      notificationsEnabled: false,
    })

    vi.advanceTimersByTime(10_000)
    expect(onFire).not.toHaveBeenCalled()
  })

  it('clear cancels a pending alarm', () => {
    const onFire = vi.fn()
    const scheduler = createTimerEndAlarmScheduler(onFire)

    scheduler.schedule({
      endsAt: Date.now() + 5_000,
      mode: 'short-break',
      notificationsEnabled: true,
    })
    scheduler.clear()

    vi.advanceTimersByTime(5_000)
    expect(onFire).not.toHaveBeenCalled()
  })

  it('replaces an existing alarm when rescheduled', () => {
    const onFire = vi.fn()
    const scheduler = createTimerEndAlarmScheduler(onFire)

    scheduler.schedule({
      endsAt: Date.now() + 10_000,
      mode: 'focus',
      notificationsEnabled: true,
    })
    scheduler.schedule({
      endsAt: Date.now() + 2_000,
      mode: 'long-break',
      notificationsEnabled: true,
    })

    vi.advanceTimersByTime(2_000)
    expect(onFire).toHaveBeenCalledOnce()
    expect(onFire).toHaveBeenCalledWith('long-break')

    vi.advanceTimersByTime(10_000)
    expect(onFire).toHaveBeenCalledOnce()
  })
})
