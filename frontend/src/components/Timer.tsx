import { useEffect, useRef, useState } from 'react'
import type { UseTimerResult } from '../hooks/useTimer'
import type { Settings, TimerMode } from '../types'

interface TimerProps {
  timer: UseTimerResult
  settings: Settings
  task: string
  onTaskChange: (task: string) => void
  strictLocked?: boolean
  /** Screen Wake Lock is currently held — display stays awake. */
  screenAwake?: boolean
}

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  'short-break': 'Short break',
  'long-break': 'Long break',
}

const MODE_COLOR: Record<TimerMode, string> = {
  focus: '#2563eb',
  'short-break': '#16a34a',
  'long-break': '#0891b2',
}

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

type CycleStep = { kind: TimerMode }

const buildCycle = (sessionsInCycle: number): CycleStep[] => {
  const steps: CycleStep[] = []
  for (let i = 0; i < sessionsInCycle; i++) {
    steps.push({ kind: 'focus' })
    if (i < sessionsInCycle - 1) steps.push({ kind: 'short-break' })
  }
  steps.push({ kind: 'long-break' })
  return steps
}

export function Timer({ timer, settings, task, onTaskChange, strictLocked = false, screenAwake = false }: TimerProps) {
  const { mode, setMode, secondsLeft, totalSeconds, isRunning, start, pause, reset, skip, completedFocusSessions } =
    timer
  type PanelName = 'info' | 'shortcuts'
  const [openPanel, setOpenPanel] = useState<PanelName | null>(null)
  const panelGroupRef = useRef<HTMLDivElement | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  const openPanelNow = (name: PanelName) => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setOpenPanel(name)
  }
  const scheduleClosePanel = () => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      setOpenPanel(null)
      hideTimerRef.current = null
    }, 150)
  }

  useEffect(
    () => () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (openPanel === null) return
    const onDocClick = (e: MouseEvent) => {
      if (panelGroupRef.current && !panelGroupRef.current.contains(e.target as Node)) {
        setOpenPanel(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel(null)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openPanel])

  // Global keyboard shortcuts. Skip when the user is typing in a field, when
  // a modifier is held (avoids clashing with browser shortcuts), and respect
  // strict-mode locks the same way the on-screen buttons do.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          // Space toggles start/pause. Pause is blocked by strict mode.
          if (timer.isRunning) {
            if (strictLocked) return
            e.preventDefault()
            timer.pause()
          } else {
            e.preventDefault()
            timer.start()
          }
          break
        case 'r':
        case 'R':
          if (strictLocked) return
          e.preventDefault()
          timer.reset()
          break
        case 's':
        case 'S':
          if (strictLocked) return
          e.preventDefault()
          timer.skip()
          break
        case '1':
          if (strictLocked) return
          e.preventDefault()
          timer.setMode('focus')
          break
        case '2':
          if (strictLocked) return
          e.preventDefault()
          timer.setMode('short-break')
          break
        case '3':
          if (strictLocked) return
          e.preventDefault()
          timer.setMode('long-break')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [timer, strictLocked])

  const progress = totalSeconds === 0 ? 0 : 1 - secondsLeft / totalSeconds
  const radius = 138
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const sessionsInCycle = settings.sessionsUntilLongBreak
  const completedInCycle = completedFocusSessions % sessionsInCycle
  const modeColor = MODE_COLOR[mode]

  const cycle = buildCycle(sessionsInCycle)
  // Map (mode, completedInCycle) to step index in the cycle sequence.
  // Sequence is [F, SB, F, SB, ..., F, LB] — focuses at even indices, short breaks at odd, long break last.
  const currentStepIdx =
    mode === 'long-break'
      ? cycle.length - 1
      : mode === 'focus'
        ? completedInCycle * 2
        : completedInCycle * 2 - 1

  const focusNumber = Math.min(completedInCycle + (mode === 'focus' ? 1 : 0), sessionsInCycle)
  const nextStep = cycle[currentStepIdx + 1]
  const nextLabel = nextStep ? MODE_LABELS[nextStep.kind] : MODE_LABELS.focus

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-8">
      <input
        type="text"
        value={task}
        onChange={(e) => onTaskChange(e.target.value)}
        placeholder="What are you working on?"
        className="w-full max-w-md border-b border-[color:var(--color-line)] bg-transparent px-1 py-2 text-center text-[15px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:border-[color:var(--color-accent)] focus:outline-none"
      />

      {/* mode tabs + info icons */}
      <div className="relative flex items-center gap-2" ref={panelGroupRef}>
        <div className="flex gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1">
          {(['focus', 'short-break', 'long-break'] as TimerMode[]).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                disabled={strictLocked}
                title={strictLocked ? 'Locked by strict mode' : undefined}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? 'bg-[color:var(--color-ink)] text-white'
                    : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
                } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[color:var(--color-ink-muted)]`}
              >
                {MODE_LABELS[m]}
              </button>
            )
          })}
        </div>

        {/* (i) Pomodoro info */}
        <div
          className="relative"
          onMouseEnter={() => openPanelNow('info')}
          onMouseLeave={scheduleClosePanel}
        >
          <button
            type="button"
            onFocus={() => openPanelNow('info')}
            onBlur={scheduleClosePanel}
            onClick={() => setOpenPanel((p) => (p === 'info' ? null : 'info'))}
            aria-label="How the Pomodoro timer works"
            aria-expanded={openPanel === 'info'}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[color:var(--color-ink-muted)] transition ${
              openPanel === 'info'
                ? 'border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]'
                : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <circle cx="12" cy="7.75" r="0.6" fill="currentColor" />
            </svg>
          </button>

          {openPanel === 'info' && (
            <div
              role="dialog"
              aria-label="How the Pomodoro timer works"
              className="absolute top-[calc(100%+10px)] left-1/2 z-20 w-[320px] -translate-x-1/2 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 text-left shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold tracking-tight text-[color:var(--color-ink)]">
                  How the Pomodoro timer works
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenPanel(null)}
                  aria-label="Close"
                  className="-mr-1 flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--color-ink-faint)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink-muted)]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ol className="space-y-2 text-[12.5px] leading-relaxed text-[color:var(--color-ink-muted)]">
                <li className="flex gap-2.5">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: MODE_COLOR.focus }} />
                  <span>
                    Focus for <span className="font-medium text-[color:var(--color-ink)]">{settings.focusMinutes} min</span>.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: MODE_COLOR['short-break'] }} />
                  <span>
                    Take a <span className="font-medium text-[color:var(--color-ink)]">{settings.shortBreakMinutes} min</span> short break.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-ink-fainter)]" />
                  <span>
                    Repeat <span className="font-medium text-[color:var(--color-ink)]">{sessionsInCycle}</span> times.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: MODE_COLOR['long-break'] }} />
                  <span>
                    Then a longer <span className="font-medium text-[color:var(--color-ink)]">{settings.longBreakMinutes} min</span> break before starting the next cycle.
                  </span>
                </li>
              </ol>
              <p className="mt-3 border-t border-[color:var(--color-line)] pt-2.5 text-[11.5px] text-[color:var(--color-ink-faint)]">
                Tip: adjust durations and auto-start in Settings.
              </p>
            </div>
          )}
        </div>

        {/* (⌨) Keyboard shortcuts */}
        <div
          className="relative"
          onMouseEnter={() => openPanelNow('shortcuts')}
          onMouseLeave={scheduleClosePanel}
        >
          <button
            type="button"
            onFocus={() => openPanelNow('shortcuts')}
            onBlur={scheduleClosePanel}
            onClick={() => setOpenPanel((p) => (p === 'shortcuts' ? null : 'shortcuts'))}
            aria-label="Keyboard shortcuts"
            aria-expanded={openPanel === 'shortcuts'}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[color:var(--color-ink-muted)] transition ${
              openPanel === 'shortcuts'
                ? 'border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]'
                : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
            </svg>
          </button>

          {openPanel === 'shortcuts' && (
            <div
              role="dialog"
              aria-label="Keyboard shortcuts"
              className="absolute top-[calc(100%+10px)] left-1/2 z-20 w-[300px] -translate-x-1/2 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 text-left shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold tracking-tight text-[color:var(--color-ink)]">
                  Keyboard shortcuts
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenPanel(null)}
                  aria-label="Close"
                  className="-mr-1 flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--color-ink-faint)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink-muted)]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ul className="space-y-2 text-[12.5px] text-[color:var(--color-ink-muted)]">
                <li className="flex items-center justify-between gap-3">
                  <span>Start / Pause</span>
                  <kbd className="rounded border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-2)] px-2 py-0.5 font-mono text-[10.5px] font-medium text-[color:var(--color-ink-soft)]">
                    Space
                  </kbd>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Reset</span>
                  <kbd className="rounded border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-2)] px-2 py-0.5 font-mono text-[10.5px] font-medium text-[color:var(--color-ink-soft)]">
                    R
                  </kbd>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Skip</span>
                  <kbd className="rounded border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-2)] px-2 py-0.5 font-mono text-[10.5px] font-medium text-[color:var(--color-ink-soft)]">
                    S
                  </kbd>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span>Switch mode</span>
                  <span className="flex shrink-0 gap-1">
                    <kbd
                      className="rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-medium"
                      style={{
                        borderColor: MODE_COLOR.focus,
                        color: MODE_COLOR.focus,
                        background: `${MODE_COLOR.focus}14`,
                      }}
                      title="Focus"
                    >
                      1
                    </kbd>
                    <kbd
                      className="rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-medium"
                      style={{
                        borderColor: MODE_COLOR['short-break'],
                        color: MODE_COLOR['short-break'],
                        background: `${MODE_COLOR['short-break']}14`,
                      }}
                      title="Short break"
                    >
                      2
                    </kbd>
                    <kbd
                      className="rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-medium"
                      style={{
                        borderColor: MODE_COLOR['long-break'],
                        color: MODE_COLOR['long-break'],
                        background: `${MODE_COLOR['long-break']}14`,
                      }}
                      title="Long break"
                    >
                      3
                    </kbd>
                  </span>
                </li>
              </ul>
              <p className="mt-3 border-t border-[color:var(--color-line)] pt-2.5 text-[11.5px] text-[color:var(--color-ink-faint)]">
                Shortcuts are disabled while typing in a text field.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ring + numerals */}
      <div className="relative">
        <svg width="320" height="320" viewBox="0 0 320 320" className="-rotate-90">
          <circle
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="6"
          />
          <circle
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke={modeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[11px] font-medium tracking-[0.18em] uppercase"
            style={{ color: modeColor }}
          >
            {MODE_LABELS[mode]}
          </span>
          <span className="mt-1.5 font-mono text-[78px] leading-none font-medium tabular-nums tracking-tight text-[color:var(--color-ink)]">
            {formatTime(secondsLeft)}
          </span>
          <span className="mt-3 text-[12px] tracking-wide text-[color:var(--color-ink-faint)]">
            {task ? (
              <span className="block max-w-[210px] truncate">{task}</span>
            ) : isRunning ? (
              'Running'
            ) : (
              'Ready'
            )}
          </span>
          {screenAwake && (
            <span
              className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-wide text-[color:var(--color-ink-faint)]"
              title="Screen stays awake during this focus session"
              aria-label="Screen stays awake"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
              </svg>
              Screen on
            </span>
          )}
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={strictLocked}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] transition hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[color:var(--color-line)] disabled:hover:text-[color:var(--color-ink-muted)]"
          aria-label="Reset"
          title={strictLocked ? 'Locked by strict mode' : 'Reset'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={isRunning ? pause : start}
          disabled={isRunning && strictLocked}
          title={isRunning && strictLocked ? 'Locked by strict mode' : undefined}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-ink)] px-9 py-2.5 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition hover:bg-[color:var(--color-ink-soft)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[color:var(--color-ink)]"
        >
          {isRunning ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5l12 7-12 7V5z" />
            </svg>
          )}
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={strictLocked}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] transition hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[color:var(--color-line)] disabled:hover:text-[color:var(--color-ink-muted)]"
          aria-label="Skip"
          title={strictLocked ? 'Locked by strict mode' : 'Skip'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 5v14l9-7-9-7z" />
            <rect x="16" y="5" width="2.5" height="14" rx="0.5" />
          </svg>
        </button>
      </div>

      {/* cycle sequence + caption */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-1">
          {cycle.map((step, i) => {
            const isDone = i < currentStepIdx
            const isCurrent = i === currentStepIdx
            const color = MODE_COLOR[step.kind]
            const isFocus = step.kind === 'focus'
            const isLong = step.kind === 'long-break'
            // widths: focus = wide, short break = narrow, long break = wide
            const width = isFocus ? 'w-9' : isLong ? 'w-9' : 'w-3'
            const base = 'h-2 rounded-full transition-all'
            let style: React.CSSProperties
            if (isDone) {
              style = { background: color, opacity: 0.85 }
            } else if (isCurrent) {
              style = { background: color, boxShadow: `0 0 0 3px ${color}25` }
            } else {
              style = { background: 'var(--color-line-strong)', opacity: 0.55 }
            }
            const labelMap: Record<TimerMode, string> = {
              focus: 'Focus',
              'short-break': 'Short break',
              'long-break': 'Long break',
            }
            return (
              <span
                key={i}
                className={`${base} ${width}`}
                style={style}
                title={`${labelMap[step.kind]}${isCurrent ? ' (current)' : isDone ? ' (done)' : ''}`}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-[color:var(--color-ink-muted)]">
          <span className="font-mono tabular-nums text-[color:var(--color-ink-soft)]">
            {mode === 'long-break'
              ? 'Long break'
              : `Focus ${focusNumber} of ${sessionsInCycle}`}
          </span>
          <span className="text-[color:var(--color-ink-faint)]">·</span>
          <span>
            Next: <span className="text-[color:var(--color-ink-soft)]">{nextLabel}</span>
          </span>
        </div>
        <div className="text-[11.5px] text-[color:var(--color-ink-faint)]">
          {completedFocusSessions === 0
            ? 'Start your first session'
            : `${completedFocusSessions} ${
                completedFocusSessions === 1 ? 'session' : 'sessions'
              } today`}
        </div>
      </div>
    </div>
  )
}
