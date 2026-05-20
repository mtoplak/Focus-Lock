import type { UseTimerResult } from '../hooks/useTimer'
import type { Settings, TimerMode } from '../types'

interface TimerProps {
  timer: UseTimerResult
  settings: Settings
  task: string
  onTaskChange: (task: string) => void
}

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Fokus',
  'short-break': 'Kratek odmor',
  'long-break': 'Dolg odmor',
}

const MODE_COLOR: Record<TimerMode, string> = {
  focus: 'stroke-indigo-400',
  'short-break': 'stroke-emerald-400',
  'long-break': 'stroke-sky-400',
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
  const radius = 130
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const sessionsInCycle = settings.sessionsUntilLongBreak
  const completedInCycle = completedFocusSessions % sessionsInCycle

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex w-full max-w-lg flex-col items-center">
        <input
          type="text"
          value={task}
          onChange={(e) => onTaskChange(e.target.value)}
          placeholder="Na čem delaš?"
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-center text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none"
        />
      </div>

      <div className="flex gap-2 rounded-full border border-slate-800 bg-slate-900/60 p-1">
        {(['focus', 'short-break', 'long-break'] as TimerMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              mode === m
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="relative">
        <svg width="320" height="320" viewBox="0 0 320 320" className="-rotate-90">
          <circle
            cx="160"
            cy="160"
            r={radius}
            className="fill-none stroke-slate-800"
            strokeWidth="10"
          />
          <circle
            cx="160"
            cy="160"
            r={radius}
            className={`fill-none ${MODE_COLOR[mode]} transition-[stroke-dashoffset] duration-500 ease-linear`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
            {MODE_LABELS[mode]}
          </span>
          <span className="mt-1 font-mono text-6xl font-light tabular-nums text-slate-50">
            {formatTime(secondsLeft)}
          </span>
          {task && (
            <span className="mt-2 max-w-[200px] truncate text-sm text-slate-400">{task}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
          aria-label="Ponastavi"
        >
          Ponastavi
        </button>
        <button
          type="button"
          onClick={isRunning ? pause : start}
          className="rounded-lg bg-indigo-500 px-8 py-2.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none"
        >
          {isRunning ? 'Pavza' : 'Začni'}
        </button>
        <button
          type="button"
          onClick={skip}
          className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
        >
          Preskoči
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {Array.from({ length: sessionsInCycle }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < completedInCycle ? 'bg-indigo-400' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500">
          {completedFocusSessions} {completedFocusSessions === 1 ? 'seja' : 'sej'} dokončanih danes
        </span>
      </div>
    </div>
  )
}
