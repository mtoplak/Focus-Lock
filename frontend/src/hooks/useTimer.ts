import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings, TimerMode } from '../types'
import { notifyTimer } from '../lib/notify'

export interface UseTimerResult {
  mode: TimerMode
  setMode: (mode: TimerMode) => void
  secondsLeft: number
  totalSeconds: number
  isRunning: boolean
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  completedFocusSessions: number
}

const STORAGE_KEY = 'fl.timer.v1'

interface PersistedTimer {
  mode: TimerMode
  completedFocusSessions: number
  totalSeconds: number
  secondsLeft: number
  // epoch ms when the current interval ends; null when paused/idle.
  endsAt: number | null
}

const modeDurationMinutes = (mode: TimerMode, settings: Settings) => {
  if (mode === 'focus') return settings.focusMinutes
  if (mode === 'short-break') return settings.shortBreakMinutes
  return settings.longBreakMinutes
}

const loadPersisted = (settings: Settings): PersistedTimer => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedTimer
      if (parsed && typeof parsed.mode === 'string') {
        // Reconcile against wall clock: if the tab was closed mid-session,
        // recompute remaining time. The transition effect handles the case
        // where time fully elapsed (secondsLeft === 0).
        if (parsed.endsAt !== null) {
          const left = Math.max(0, Math.ceil((parsed.endsAt - Date.now()) / 1000))
          return { ...parsed, secondsLeft: left }
        }
        return parsed
      }
    }
  } catch {
    // fall through to defaults
  }
  const seconds = settings.focusMinutes * 60
  return {
    mode: 'focus',
    completedFocusSessions: 0,
    totalSeconds: seconds,
    secondsLeft: seconds,
    endsAt: null,
  }
}

export function useTimer(
  settings: Settings,
  onFocusComplete: (focusMinutes: number) => void,
): UseTimerResult {
  const [hydrated] = useState(() => loadPersisted(settings))
  const [mode, setModeState] = useState<TimerMode>(hydrated.mode)
  const [completedFocusSessions, setCompletedFocusSessions] = useState(
    hydrated.completedFocusSessions,
  )
  const [totalSeconds, setTotalSeconds] = useState(hydrated.totalSeconds)
  const [secondsLeft, setSecondsLeft] = useState(hydrated.secondsLeft)
  const [endsAt, setEndsAt] = useState<number | null>(hydrated.endsAt)

  // endsAt mirror that we can mutate synchronously inside reset / pause /
  // skip / start. The 250 ms tick interval reads from this ref, so when a
  // control action clears endsAt, the next in-flight tick bails out before
  // it can clobber secondsLeft with the old (still-running) value. Without
  // this, pressing R while running races the tick and the reset visibly
  // "doesn't happen".
  const endsAtRef = useRef<number | null>(hydrated.endsAt)

  const isRunning = endsAt !== null && secondsLeft > 0
  const onFocusCompleteRef = useRef(onFocusComplete)
  onFocusCompleteRef.current = onFocusComplete

  // Persist on every change so a refresh restores exactly where we were.
  useEffect(() => {
    try {
      const snap: PersistedTimer = {
        mode,
        completedFocusSessions,
        totalSeconds,
        secondsLeft,
        endsAt,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
    } catch {
      // ignore quota / private-mode errors
    }
  }, [mode, completedFocusSessions, totalSeconds, secondsLeft, endsAt])

  const setMode = useCallback(
    (next: TimerMode) => {
      const seconds = modeDurationMinutes(next, settings) * 60
      endsAtRef.current = null
      setModeState(next)
      setTotalSeconds(seconds)
      setSecondsLeft(seconds)
      setEndsAt(null)
    },
    [settings],
  )

  // Keep totals fresh if user updates settings while idle.
  useEffect(() => {
    if (isRunning) return
    const seconds = modeDurationMinutes(mode, settings) * 60
    if (seconds === totalSeconds) return
    setTotalSeconds(seconds)
    setSecondsLeft(seconds)
  }, [settings, mode, isRunning, totalSeconds])

  // Tick — recompute from endsAt instead of decrementing. Survives tab
  // throttling and refreshes without drift. Reads endsAt via ref so an
  // in-flight tick after reset/pause sees the cleared value and bails out.
  useEffect(() => {
    if (endsAt === null) return
    const tick = () => {
      const e = endsAtRef.current
      if (e === null) return
      const left = Math.max(0, Math.ceil((e - Date.now()) / 1000))
      setSecondsLeft(left)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [endsAt])

  // Transition on hit zero.
  useEffect(() => {
    if (secondsLeft > 0 || endsAt === null) return

    // If the interval finished while the tab was closed (endsAt comfortably
    // in the past), skip the bell and notification — the user wasn't there
    // to receive them, and don't auto-start the next interval either.
    const silent = Date.now() - endsAt > 2000

    endsAtRef.current = null
    setEndsAt(null)

    if (!silent && settings.notificationsEnabled) {
      void notifyTimer('end', mode)
    }

    if (!silent && settings.soundEnabled) {
      try {
        const ctx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
        osc.start()
        osc.stop(ctx.currentTime + 0.6)
      } catch {
        // ignore
      }
    }

    if (mode === 'focus') {
      const nextCount = completedFocusSessions + 1
      setCompletedFocusSessions(nextCount)
      onFocusCompleteRef.current(settings.focusMinutes)
      const nextMode: TimerMode =
        nextCount % settings.sessionsUntilLongBreak === 0 ? 'long-break' : 'short-break'
      const seconds = modeDurationMinutes(nextMode, settings) * 60
      setModeState(nextMode)
      setTotalSeconds(seconds)
      setSecondsLeft(seconds)
      if (!silent && settings.autoStartBreaks) {
        if (settings.notificationsEnabled) void notifyTimer('start', nextMode)
        const end = Date.now() + seconds * 1000
        endsAtRef.current = end
        setEndsAt(end)
      }
    } else {
      const seconds = settings.focusMinutes * 60
      setModeState('focus')
      setTotalSeconds(seconds)
      setSecondsLeft(seconds)
      if (!silent && settings.autoStartFocus) {
        if (settings.notificationsEnabled) void notifyTimer('start', 'focus')
        const end = Date.now() + seconds * 1000
        endsAtRef.current = end
        setEndsAt(end)
      }
    }
  }, [secondsLeft, endsAt, mode, settings, completedFocusSessions])

  const start = useCallback(() => {
    if (endsAtRef.current !== null) return // already running
    if (settings.notificationsEnabled) {
      void notifyTimer('start', mode)
    }
    const end = Date.now() + secondsLeft * 1000
    endsAtRef.current = end
    setEndsAt(end)
  }, [mode, secondsLeft, settings.notificationsEnabled])

  const pause = useCallback(() => {
    const e = endsAtRef.current
    if (e === null) return
    // Freeze remaining seconds at pause time so the persisted snapshot is exact.
    setSecondsLeft(Math.max(0, Math.ceil((e - Date.now()) / 1000)))
    endsAtRef.current = null
    setEndsAt(null)
  }, [])

  const reset = useCallback(() => {
    const seconds = modeDurationMinutes(mode, settings) * 60
    endsAtRef.current = null
    setTotalSeconds(seconds)
    setSecondsLeft(seconds)
    setEndsAt(null)
  }, [mode, settings])

  const skip = useCallback(() => {
    // Force the transition effect: zero seconds + endsAt in the past.
    // Works whether we were running or paused.
    const now = Date.now()
    endsAtRef.current = now
    setSecondsLeft(0)
    setEndsAt(now)
  }, [])

  return {
    mode,
    setMode,
    secondsLeft,
    totalSeconds,
    isRunning,
    start,
    pause,
    reset,
    skip,
    completedFocusSessions,
  }
}
