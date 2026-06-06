import { useState } from 'react'
import type { BlockedItem, ScheduleBlock } from '../types'
import { isScheduleActiveAt } from '../hooks/useSchedule'

interface ScheduleProps {
  schedules: ScheduleBlock[]
  onChange: (schedules: ScheduleBlock[]) => void
  blocked: BlockedItem[]
  strictLocked?: boolean
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS = [1, 2, 3, 4, 5]
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

const formatDays = (days: number[]): string => {
  const set = new Set(days)
  if (set.size === 7) return 'Every day'
  if (set.size === 5 && WEEKDAYS.every((d) => set.has(d))) return 'Weekdays'
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends'
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => set.has(d))
    .map((d) => DAY_LABELS[d])
    .join(', ')
}

export function Schedule({ schedules, onChange, blocked, strictLocked = false }: ScheduleProps) {
  const [days, setDays] = useState<number[]>(EVERY_DAY)
  const [start, setStart] = useState('17:00')
  const [end, setEnd] = useState('19:00')
  const [label, setLabel] = useState('')

  const now = new Date()
  const activeApps = blocked.filter((b) => b.enabled && b.kind === 'app').length
  const activeUrls = blocked.filter((b) => b.enabled && b.kind === 'url').length
  const activeNow = schedules.some((s) => isScheduleActiveAt(s, now))

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    )
  }

  const add = () => {
    if (days.length === 0 || !start || !end || start === end) return
    onChange([
      ...schedules,
      {
        id: crypto.randomUUID(),
        label: label.trim(),
        days: [...days].sort((a, b) => a - b),
        start,
        end,
        enabled: true,
      },
    ])
    setLabel('')
  }

  const toggle = (id: string) => {
    onChange(schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }

  const remove = (id: string) => {
    onChange(schedules.filter((s) => s.id !== id))
  }

  const canAdd = days.length > 0 && !!start && !!end && start !== end

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-7">
        <h2 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Scheduled blocking
        </h2>
        <p className="mt-1 text-[14px] text-[color:var(--color-ink-muted)]">
          Set recurring time windows. Your enabled blocks turn on automatically — no timer needed.
        </p>
      </header>

      {/* status banner */}
      <div
        role="status"
        className={`mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px] ${
          activeNow
            ? 'border-[color:var(--color-success)]/25 bg-[color:var(--color-success-soft)] text-[color:var(--color-success-strong)]'
            : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]'
        }`}
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {activeNow && (
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-success)] opacity-60" />
          )}
          <span
            className={`relative h-2 w-2 rounded-full ${
              activeNow ? 'bg-[color:var(--color-success)]' : 'bg-[color:var(--color-line-strong)]'
            }`}
          />
        </span>
        <span className="flex-1">
          {activeNow ? (
            <>
              A schedule is active now — blocking <span className="font-medium">{activeUrls}</span>{' '}
              {activeUrls === 1 ? 'site' : 'sites'}, <span className="font-medium">{activeApps}</span>{' '}
              {activeApps === 1 ? 'app' : 'apps'}
            </>
          ) : (
            'No schedule active right now'
          )}
        </span>
      </div>

      {/* add form */}
      <fieldset
        disabled={strictLocked}
        className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 disabled:opacity-50"
        title={strictLocked ? 'Locked by strict mode' : undefined}
      >
        <div className="mb-4">
          <label className="mb-2 block text-[11.5px] font-medium tracking-wide text-[color:var(--color-ink-muted)]">
            Days
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {DAY_LABELS.map((name, d) => {
              const on = days.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={on}
                  className={`h-8 w-11 rounded-md text-[12px] font-medium transition ${
                    on
                      ? 'bg-[color:var(--color-ink)] text-white'
                      : 'border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
                  }`}
                >
                  {name}
                </button>
              )
            })}
            <div className="ml-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setDays(EVERY_DAY)}
                className="rounded-md border border-[color:var(--color-line)] px-2.5 py-1 text-[11.5px] text-[color:var(--color-ink-muted)] transition hover:text-[color:var(--color-ink)]"
              >
                Every day
              </button>
              <button
                type="button"
                onClick={() => setDays(WEEKDAYS)}
                className="rounded-md border border-[color:var(--color-line)] px-2.5 py-1 text-[11.5px] text-[color:var(--color-ink-muted)] transition hover:text-[color:var(--color-ink)]"
              >
                Weekdays
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="sched-start"
              className="mb-2 block text-[11.5px] font-medium tracking-wide text-[color:var(--color-ink-muted)]"
            >
              From
            </label>
            <input
              id="sched-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3 py-2 font-mono text-[13.5px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)]/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/15"
            />
          </div>
          <div>
            <label
              htmlFor="sched-end"
              className="mb-2 block text-[11.5px] font-medium tracking-wide text-[color:var(--color-ink-muted)]"
            >
              To
            </label>
            <input
              id="sched-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3 py-2 font-mono text-[13.5px] text-[color:var(--color-ink)] focus:border-[color:var(--color-accent)]/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/15"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label
              htmlFor="sched-label"
              className="mb-2 block text-[11.5px] font-medium tracking-wide text-[color:var(--color-ink-muted)]"
            >
              Label (optional)
            </label>
            <input
              id="sched-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canAdd && add()}
              placeholder="e.g. Evening focus"
              className="w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3 py-2 text-[13.5px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:border-[color:var(--color-accent)]/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/15"
            />
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="rounded-lg bg-[color:var(--color-ink)] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[color:var(--color-ink-soft)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add schedule
          </button>
        </div>
        {start === end && (
          <p className="mt-3 text-[12px] text-amber-600 dark:text-amber-400">
            Start and end times must differ.
          </p>
        )}
      </fieldset>

      {/* list */}
      <ul className="overflow-hidden rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        {schedules.length === 0 && (
          <li className="px-5 py-12 text-center">
            <p className="text-[14px] text-[color:var(--color-ink-muted)]">No schedules yet.</p>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-faint)]">
              Add a recurring window above to block automatically.
            </p>
          </li>
        )}
        {schedules.map((s, idx) => {
          const active = isScheduleActiveAt(s, now)
          return (
            <li
              key={s.id}
              className={`group flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-[color:var(--color-surface-2)]/60 ${
                idx !== 0 ? 'border-t border-[color:var(--color-line)]' : ''
              }`}
            >
              <button
                type="button"
                role="switch"
                aria-checked={s.enabled}
                aria-label={`Enable schedule ${s.label || `${s.start}–${s.end}`}`}
                onClick={() => toggle(s.id)}
                disabled={strictLocked}
                title={strictLocked ? 'Locked by strict mode' : undefined}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                  s.enabled ? 'bg-[color:var(--color-accent)]' : 'bg-[color:var(--color-line-strong)]'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                    s.enabled ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[14px] font-medium tabular-nums text-[color:var(--color-ink)]">
                    {s.start}–{s.end}
                  </span>
                  {s.enabled && active && (
                    <span className="rounded-md border border-[color:var(--color-success)]/30 bg-[color:var(--color-success-soft)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[color:var(--color-success-strong)]">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[12.5px] text-[color:var(--color-ink-muted)]">
                  {formatDays(s.days)}
                  {s.label ? ` · ${s.label}` : ''}
                </div>
              </div>

              <button
                type="button"
                onClick={() => remove(s.id)}
                disabled={strictLocked}
                title={strictLocked ? 'Locked by strict mode' : undefined}
                className="rounded-md p-1.5 text-[color:var(--color-ink-faint)] opacity-0 transition hover:bg-[color:var(--color-surface-3)] hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 disabled:hidden"
                aria-label={`Remove schedule ${s.label || `${s.start}–${s.end}`}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>

      {schedules.length > 0 && (
        <p className="mt-4 text-[12.5px] text-[color:var(--color-ink-faint)]">
          Edit which sites and apps get blocked in the{' '}
          <span className="font-medium text-[color:var(--color-ink-muted)]">Blocks</span> tab.
        </p>
      )}
    </div>
  )
}
