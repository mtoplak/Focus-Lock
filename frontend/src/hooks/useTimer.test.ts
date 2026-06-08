import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimer } from './useTimer'
import { DEFAULT_SETTINGS, type Settings } from '../types'

const { notifyTimer, scheduleTimerEndInSw, clearTimerEndInSw } = vi.hoisted(() => ({
  notifyTimer: vi.fn(),
  scheduleTimerEndInSw: vi.fn(),
  clearTimerEndInSw: vi.fn(),
}))

vi.mock('../lib/notify', () => ({
  notifyTimer,
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
    notifyTimer.mockClear()
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

    expect(clearTimerEndInSw).toHaveBeenCalled()
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

  it('completes a focus interval and moves to short break', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))
    const onFocusComplete = vi.fn()

    const { result } = renderHook(() => useTimer(shortSettings, onFocusComplete))

    act(() => {
      result.current.start()
    })

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.mode).toBe('short-break')
    expect(result.current.completedFocusSessions).toBe(1)
    expect(result.current.completedInCycle).toBe(1)
    expect(result.current.secondsLeft).toBe(60)
    expect(result.current.isRunning).toBe(false)
    expect(onFocusComplete).toHaveBeenCalledWith(1)
  })

  it('notifies when a focus interval ends in the foreground', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))

    const settings = { ...shortSettings, notificationsEnabled: true }
    const { result } = renderHook(() => useTimer(settings, vi.fn()))

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(notifyTimer).toHaveBeenCalledWith('end', 'focus')
  })

  it('auto-starts the next break when a focus interval ends', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))

    const settings = {
      ...shortSettings,
      autoStartBreaks: true,
      notificationsEnabled: true,
    }
    const { result } = renderHook(() => useTimer(settings, vi.fn()))

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.mode).toBe('short-break')
    expect(result.current.isRunning).toBe(true)
    expect(notifyTimer).toHaveBeenCalledWith('end', 'focus')
    expect(notifyTimer).toHaveBeenCalledWith('start', 'short-break')
  })

  it('skips from focus to break and records a completed session', () => {
    const onFocusComplete = vi.fn()
    const { result } = renderHook(() => useTimer(shortSettings, onFocusComplete))

    act(() => {
      result.current.skip()
    })

    expect(result.current.mode).toBe('short-break')
    expect(result.current.completedFocusSessions).toBe(1)
    expect(result.current.isRunning).toBe(false)
    expect(onFocusComplete).toHaveBeenCalledWith(1)
  })

  it('silent catch-up after a long absence skips notifications and auto-start', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))

    const settings = {
      ...shortSettings,
      autoStartBreaks: true,
      notificationsEnabled: true,
    }
    const endsAt = Date.now() - 5_000

    localStorage.setItem(
      'fl.timer.v1',
      JSON.stringify({
        mode: 'focus',
        completedFocusSessions: 0,
        cycleOffset: 0,
        totalSeconds: 60,
        secondsLeft: 0,
        endsAt,
      }),
    )

    const { result } = renderHook(() => useTimer(settings, vi.fn()))

    expect(result.current.mode).toBe('short-break')
    expect(result.current.completedFocusSessions).toBe(1)
    expect(result.current.isRunning).toBe(false)
    expect(notifyTimer).not.toHaveBeenCalled()
  })

  it('ignores mode changes while an interval is running', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))

    const settings = {
      ...shortSettings,
      autoStartBreaks: true,
      autoStartFocus: true,
    }
    const { result } = renderHook(() => useTimer(settings, vi.fn()))

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.mode).toBe('short-break')
    expect(result.current.isRunning).toBe(true)
    const endsAtBefore = Date.now() + result.current.secondsLeft * 1000

    act(() => {
      result.current.setMode('focus')
      result.current.setMode('long-break')
      result.current.setMode('short-break')
    })

    expect(result.current.mode).toBe('short-break')
    expect(result.current.isRunning).toBe(true)
    expect(result.current.secondsLeft).toBeGreaterThan(0)
    expect(result.current.secondsLeft).toBeLessThanOrEqual(60)

    act(() => {
      vi.advanceTimersByTime(result.current.secondsLeft * 1000)
    })

    expect(result.current.mode).toBe('focus')
    expect(result.current.isRunning).toBe(true)
    expect(endsAtBefore).toBeLessThanOrEqual(Date.now())
  })

  it('does not reset when selecting the current mode while paused', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))
    const { result } = renderHook(() => useTimer(shortSettings, vi.fn()))

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    act(() => {
      result.current.pause()
    })

    expect(result.current.secondsLeft).toBe(45)

    act(() => {
      result.current.setMode('focus')
    })

    expect(result.current.secondsLeft).toBe(45)
    expect(result.current.mode).toBe('focus')
  })

  it('moves to long break after the last focus in a cycle', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T10:00:00Z'))

    localStorage.setItem(
      'fl.timer.v1',
      JSON.stringify({
        mode: 'focus',
        completedFocusSessions: 3,
        cycleOffset: 0,
        totalSeconds: 60,
        secondsLeft: 60,
        endsAt: null,
      }),
    )

    const { result } = renderHook(() => useTimer(shortSettings, vi.fn()))

    act(() => {
      result.current.skip()
    })

    expect(result.current.mode).toBe('long-break')
    expect(result.current.completedFocusSessions).toBe(4)
    expect(result.current.completedInCycle).toBe(0)
  })
})
