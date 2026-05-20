import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings, TimerMode } from '../types'

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

const modeDurationMinutes = (mode: TimerMode, settings: Settings) => {
  if (mode === 'focus') return settings.focusMinutes
  if (mode === 'short-break') return settings.shortBreakMinutes
  return settings.longBreakMinutes
}

export function useTimer(
  settings: Settings,
  onFocusComplete: (focusMinutes: number) => void,
): UseTimerResult {
  const [mode, setModeState] = useState<TimerMode>('focus')
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(settings.focusMinutes * 60)
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const onFocusCompleteRef = useRef(onFocusComplete)
  onFocusCompleteRef.current = onFocusComplete

  const setMode = useCallback(
    (next: TimerMode) => {
      setModeState(next)
      const seconds = modeDurationMinutes(next, settings) * 60
      setTotalSeconds(seconds)
      setSecondsLeft(seconds)
      setIsRunning(false)
    },
    [settings],
  )

  // Keep totals fresh if user updates settings while idle
  useEffect(() => {
    if (isRunning) return
    const seconds = modeDurationMinutes(mode, settings) * 60
    setTotalSeconds(seconds)
    setSecondsLeft(seconds)
  }, [settings, mode, isRunning])

  // Tick
  useEffect(() => {
    if (!isRunning) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [isRunning])

  // Transition on hit zero
  useEffect(() => {
    if (secondsLeft > 0 || !isRunning) return
    setIsRunning(false)

    if (settings.soundEnabled) {
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
      if (settings.autoStartBreaks) setIsRunning(true)
    } else {
      const seconds = settings.focusMinutes * 60
      setModeState('focus')
      setTotalSeconds(seconds)
      setSecondsLeft(seconds)
      if (settings.autoStartFocus) setIsRunning(true)
    }
  }, [secondsLeft, isRunning, mode, settings, completedFocusSessions])

  const start = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const reset = useCallback(() => {
    const seconds = modeDurationMinutes(mode, settings) * 60
    setTotalSeconds(seconds)
    setSecondsLeft(seconds)
    setIsRunning(false)
  }, [mode, settings])
  const skip = useCallback(() => setSecondsLeft(0), [])

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
