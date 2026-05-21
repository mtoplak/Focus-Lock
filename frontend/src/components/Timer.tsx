import type { UseTimerResult } from '../hooks/useTimer'
import type { Settings, TimerMode } from '../types'

interface TimerProps {
  timer: UseTimerResult
  settings: Settings
  task: string
  onTaskChange: (task: string) => void
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

export function Timer({ timer, settings, task, onTaskChange }: TimerProps) {
  const { mode, setMode, secondsLeft, totalSeconds, isRunning, start, pause, reset, skip, completedFocusSessions } =
    timer

  const progress = totalSeconds === 0 ? 0 : 1 - secondsLeft / totalSeconds
  const radius = 138
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const sessionsInCycle = settings.sessionsUntilLongBreak
  const completedInCycle = completedFocusSessions % sessionsInCycle
  const modeColor = MODE_COLOR[mode]

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-8">
      <input
        type="text"
        value={task}
        onChange={(e) => onTaskChange(e.target.value)}
        placeholder="What are you working on?"
        className="w-full max-w-md border-b border-[color:var(--color-line)] bg-transparent px-1 py-2 text-center text-[15px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:border-[color:var(--color-accent)] focus:outline-none"
      />

      {/* mode tabs */}
      <div className="flex gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1">
        {(['focus', 'short-break', 'long-break'] as TimerMode[]).map((m) => {
          const active = mode === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                active
                  ? 'bg-[color:var(--color-ink)] text-white'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          )
        })}
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
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] transition hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)]"
          aria-label="Reset"
          title="Reset"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={isRunning ? pause : start}
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-ink)] px-9 py-2.5 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition hover:bg-[color:var(--color-ink-soft)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)]"
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] transition hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)]"
          aria-label="Skip"
          title="Skip"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 5v14l9-7-9-7z" />
            <rect x="16" y="5" width="2.5" height="14" rx="0.5" />
          </svg>
        </button>
      </div>

      {/* session segments + caption */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: sessionsInCycle }).map((_, i) => {
            const isDone = i < completedInCycle
            const isCurrent = i === completedInCycle && mode === 'focus'
            return (
              <span
                key={i}
                className={`h-2 w-10 rounded-full transition-all ${
                  isDone
                    ? 'bg-[color:var(--color-accent)]'
                    : isCurrent
                      ? 'bg-[color:var(--color-accent)]/35'
                      : 'bg-[color:var(--color-line-strong)]/70'
                }`}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-[color:var(--color-ink-muted)]">
          <span className="font-mono tabular-nums text-[color:var(--color-ink-soft)]">
            {Math.min(completedInCycle + (mode === 'focus' ? 1 : 0), sessionsInCycle)} of {sessionsInCycle}
          </span>
          <span className="text-[color:var(--color-ink-faint)]">·</span>
          <span>
            {completedFocusSessions === 0
              ? 'Start your first session'
              : `${completedFocusSessions} ${
                  completedFocusSessions === 1 ? 'session' : 'sessions'
                } today`}
          </span>
        </div>
      </div>
    </div>
  )
}
