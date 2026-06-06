import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimer } from './useTimer'
import { DEFAULT_SETTINGS, type Settings } from '../types'

vi.mock('../lib/notify', () => ({
  notifyTimer: vi.fn(),
}))

const { scheduleTimerEndInSw, clearTimerEndInSw } = vi.hoisted(() => ({
  scheduleTimerEndInSw: vi.fn(),
  clearTimerEndInSw: vi.fn(),
}))

vi.mock('../lib/timerSwSync', () => ({
  scheduleTimerEndInSw,
  clearTimerEndInSw,
  registerTimerSwResyncListener: vi.fn(() => () => {}),
}))

const shortSettings: Settings = {
  ...DEFAULT_SETTINGS,
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 1,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: false,
  notificationsEnabled: false,
}

describe('useTimer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
    scheduleTimerEndInSw.mockClear()
    clearTimerEndInSw.mockClear()
  })

  it('reset only restores the current interval, not cycle progress', () => {
    localStorage.setItem(
      'fl.timer.v1',
      JSON.stringify({
        mode: 'focus',
        completedFocusSessions: 2,
        cycleOffset: 0,
        totalSeconds: 60,
        secondsLeft: 30,
        endsAt: null,
      }),
    )

    const { result } = renderHook(() => useTimer(shortSettings, vi.fn()))

    expect(result.current.completedInCycle).toBe(2)
    expect(result.current.completedFocusSessions).toBe(2)

    act(() => {
      result.current.reset()
    })

    expect(result.current.secondsLeft).toBe(60)
    expect(result.current.completedInCycle).toBe(2)
    expect(result.current.completedFocusSessions).toBe(2)
  })

  it('resetCycle returns to focus 1 while keeping today session total', () => {
    localStorage.setItem(
      'fl.timer.v1',
      JSON.stringify({
        mode: 'short-break',
        completedFocusSessions: 2,
        cycleOffset: 0,
        totalSeconds: 60,
        secondsLeft: 45,
        endsAt: null,
      }),
    )

    const { result } = renderHook(() => useTimer(shortSettings, vi.fn()))

    expect(result.current.canResetCycle).toBe(true)
    expect(result.current.completedInCycle).toBe(2)

    act(() => {
      result.current.resetCycle()
    })

    expect(result.current.mode).toBe('focus')
    expect(result.current.completedInCycle).toBe(0)
    expect(result.current.completedFocusSessions).toBe(2)
    expect(result.current.secondsLeft).toBe(60)
    expect(result.current.isRunning).toBe(false)
  })

  it('syncs a background notification schedule when a running session has notifications enabled', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))

    const settings = { ...shortSettings, notificationsEnabled: true }
    const { result } = renderHook(() => useTimer(settings, vi.fn()))

    act(() => {
      result.current.start()
    })

    expect(scheduleTimerEndInSw).toHaveBeenCalledWith({
      endsAt: Date.now() + 60_000,
      mode: 'focus',
      notificationsEnabled: true,
    })

    act(() => {
      result.current.pause()
    })

    expect(clearTimerEndInSw).toHaveBeenCalled()
  })

  it('hides reset cycle at the start of a fresh cycle on focus', () => {
    const { result } = renderHook(() => useTimer(shortSettings, vi.fn()))

    expect(result.current.mode).toBe('focus')
    expect(result.current.completedInCycle).toBe(0)
    expect(result.current.canResetCycle).toBe(false)
  })
})
