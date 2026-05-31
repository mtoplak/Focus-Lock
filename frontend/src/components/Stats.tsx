import { useState } from 'react'
import { useAgent } from '../hooks/useAgent'
import {
  computeLongestStreak,
  computePersonalBest,
  formatMinutes,
  formatShortDate,
  topBlockedApps,
  topBlockedUrls,
} from '../lib/statsHelpers'
import type { AppBlockCount, SessionRecord, UrlBlockCount } from '../types'

interface StatsProps {
  history: SessionRecord[]
  blockCounts: AppBlockCount[]
  urlBlockCounts: UrlBlockCount[]
  onResetStats: () => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

const getLast7Days = () => {
  const today = new Date()
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })
}

const computeStreak = (history: SessionRecord[]) => {
  if (history.length === 0) return 0
  const map = new Map(history.map((r) => [r.date, r]))
  let streak = 0
  const day = new Date()
  while (true) {
    const key = isoDate(day)
    const rec = map.get(key)
    if (rec && rec.completedSessions > 0) {
      streak += 1
      day.setDate(day.getDate() - 1)
    } else if (streak === 0 && key === isoDate(new Date())) {
      day.setDate(day.getDate() - 1)
      const prev = map.get(isoDate(day))
      if (!prev || prev.completedSessions === 0) return 0
    } else {
      break
    }
  }
  return streak
}

export function Stats({ history, blockCounts, urlBlockCounts, onResetStats }: StatsProps) {
  const agent = useAgent()
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const today = isoDate(new Date())
  const todayRec = history.find((r) => r.date === today)
  const todaySessions = todayRec?.completedSessions ?? 0
  const todayMinutes = todayRec?.focusMinutes ?? 0

  const totalSessions = history.reduce((sum, r) => sum + r.completedSessions, 0)
  const totalMinutes = history.reduce((sum, r) => sum + r.focusMinutes, 0)
  const streak = computeStreak(history)
  const longestStreak = computeLongestStreak(history)
  const personalBest = computePersonalBest(history)
  const topApps = topBlockedApps(blockCounts)
  const topUrls = topBlockedUrls(urlBlockCounts)

  const last7 = getLast7Days()
  const last7Data = last7.map((d) => {
    const rec = history.find((r) => r.date === isoDate(d))
    return { date: d, minutes: rec?.focusMinutes ?? 0, sessions: rec?.completedSessions ?? 0 }
  })
  const maxMinutes = Math.max(60, ...last7Data.map((d) => d.minutes))
  const weekTotal = last7Data.reduce((sum, d) => sum + d.minutes, 0)
  const weekBest = last7Data.reduce(
    (best, d) => (d.minutes > best.minutes ? d : best),
    last7Data[0],
  )
  const activeDays = history.filter((r) => r.completedSessions > 0).length
  const maxBlockCount = Math.max(1, ...topApps.map((a) => a.count))
  const maxUrlCount = Math.max(1, ...topUrls.map((u) => u.count))

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <h2 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Stats
        </h2>
        <p className="mt-1 text-[14px] text-[color:var(--color-ink-muted)]">
          Track your progress over time.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today — sessions" value={todaySessions.toString()} />
        <StatCard label="Today — focus" value={formatMinutes(todayMinutes)} />
        <StatCard
          label="Current streak"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          accent
        />
        <StatCard label="Total sessions" value={totalSessions.toString()} />
      </div>

      <section className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
              Last 7 days
            </h3>
            <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-faint)]">
              {weekBest.minutes > 0
                ? `Best this week — ${formatMinutes(weekBest.minutes)}`
                : 'No completed days yet'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-semibold tabular-nums text-[color:var(--color-ink)]">
              {formatMinutes(weekTotal)}
            </div>
            <div className="text-[11px] tracking-wider text-[color:var(--color-ink-faint)] uppercase">
              Total
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-2.5">
          {last7Data.map((d, i) => {
            const heightPct = (d.minutes / maxMinutes) * 100
            const isToday = isoDate(d.date) === today
            const hasData = d.minutes > 0
            const barHeight = hasData ? `${Math.max(heightPct, 6)}%` : '0%'
            return (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative h-40 w-full">
                  <span
                    className="pointer-events-none absolute inset-0 rounded-md bg-[color:var(--color-surface-2)]"
                    aria-hidden
                  />
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-md transition-all duration-300 ${
                      hasData
                        ? isToday
                          ? 'bg-[color:var(--color-accent)]'
                          : 'bg-[color:var(--color-accent)]/35'
                        : ''
                    }`}
                    style={{ height: barHeight }}
                  >
                    {hasData && (
                      <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-ink)] px-2 py-1 font-mono text-[10px] text-white opacity-0 shadow-sm transition group-hover:opacity-100">
                        {formatMinutes(d.minutes)}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] tracking-wide transition ${
                    isToday
                      ? 'font-semibold text-[color:var(--color-ink)]'
                      : 'text-[color:var(--color-ink-faint)] group-hover:text-[color:var(--color-ink-muted)]'
                  }`}
                >
                  {DAY_LABELS[(d.date.getDay() + 6) % 7]}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <h3 className="mb-4 text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          All-time
        </h3>
        <dl className="divide-y divide-[color:var(--color-line)]">
          <Row label="Completed focus sessions" value={totalSessions.toString()} />
          <Row label="Total focus time" value={formatMinutes(totalMinutes)} />
          <Row label="Active days" value={activeDays.toString()} />
          <Row
            label="Longest streak"
            value={
              longestStreak === 0
                ? '—'
                : `${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`
            }
          />
          <Row
            label="Personal best"
            value={
              personalBest
                ? `${formatMinutes(personalBest.focusMinutes)} · ${formatShortDate(personalBest.date)}`
                : '—'
            }
          />
        </dl>
      </section>

      <section className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <h3 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Most blocked apps
        </h3>
        <p className="mt-1 mb-5 text-[12.5px] text-[color:var(--color-ink-muted)]">
          Times the desktop agent closed an app during focus (saved on this device).
        </p>

        <BlockedCountList
          items={topApps.map((a) => ({ key: a.key, label: a.label, count: a.count }))}
          maxCount={maxBlockCount}
          emptyMessage={
            agent.status === 'connected'
              ? 'No blocked apps closed yet. Add apps on the Blocks tab and run a focus session.'
              : 'Start the desktop agent to track blocked apps during focus.'
          }
        />
      </section>

      <section className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <h3 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Most blocked sites
        </h3>
        <p className="mt-1 mb-5 text-[12.5px] text-[color:var(--color-ink-muted)]">
          DNS lookup attempts to blocked domains during focus (requires agent admin + DNS blocking).
        </p>

        <BlockedCountList
          items={topUrls.map((u) => ({ key: u.key, label: u.label, count: u.count }))}
          maxCount={maxUrlCount}
          monoLabel
          emptyMessage={
            agent.status === 'connected'
              ? 'No blocked site lookups yet. Add URLs on the Blocks tab, run focus as admin, and visit a blocked site.'
              : 'Start the desktop agent to track blocked sites during focus.'
          }
        />
      </section>

      <div className="mt-8 flex flex-col items-start gap-2 border-t border-[color:var(--color-line)] pt-6">
        <button
          type="button"
          onClick={() => setConfirmResetOpen(true)}
          className="rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2 text-[13px] font-medium text-[color:var(--color-ink-muted)] transition hover:border-red-300/60 hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-200"
        >
          Reset all stats
        </button>
        <p className="text-[12px] text-[color:var(--color-ink-faint)]">
          Clears focus history, blocked-app counts, and blocked-site counts on this device only.
        </p>
      </div>

      {confirmResetOpen && (
        <ResetStatsDialog
          onCancel={() => setConfirmResetOpen(false)}
          onConfirm={() => {
            onResetStats()
            setConfirmResetOpen(false)
          }}
        />
      )}
    </div>
  )
}

function ResetStatsDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-stats-title"
        aria-describedby="reset-stats-desc"
      >
        <h3
          id="reset-stats-title"
          className="text-[17px] font-semibold tracking-tight text-[color:var(--color-ink)]"
        >
          Reset all stats?
        </h3>
        <p id="reset-stats-desc" className="mt-2 text-[14px] leading-relaxed text-[color:var(--color-ink-muted)]">
          This permanently deletes your focus history, streaks, personal best, blocked-app counts,
          and blocked-site counts from this browser. It cannot be undone.
        </p>
        <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-faint)]">
          Settings, your block list, and sign-in are not affected. Restart the desktop agent to
          clear its in-memory counters.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2 text-[13px] font-medium text-[color:var(--color-ink-muted)] transition hover:text-[color:var(--color-ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-red-700"
          >
            Reset stats
          </button>
        </div>
      </div>
    </div>
  )
}

function BlockedCountList({
  items,
  maxCount,
  emptyMessage,
  monoLabel = false,
}: {
  items: Array<{ key: string; label: string; count: number }>
  maxCount: number
  emptyMessage: string
  monoLabel?: boolean
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-[color:var(--color-ink-muted)]">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span
              className={`truncate text-[13.5px] font-medium text-[color:var(--color-ink)] ${
                monoLabel ? 'font-mono text-[12.5px]' : ''
              }`}
            >
              {item.label}
            </span>
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-[color:var(--color-ink-muted)]">
              {item.count}×
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[color:var(--color-surface-2)]">
            <div
              className="h-full rounded-full bg-[color:var(--color-accent)]/70 transition-all"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? 'border-[color:var(--color-accent)]/25 bg-[color:var(--color-accent-tint)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)]'
      }`}
    >
      <div className="text-[11px] tracking-[0.08em] text-[color:var(--color-ink-muted)] uppercase">
        {label}
      </div>
      <div
        className={`mt-1.5 text-[22px] font-semibold tabular-nums tracking-tight ${
          accent ? 'text-[color:var(--color-accent-strong)]' : 'text-[color:var(--color-ink)]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[13.5px] text-[color:var(--color-ink-muted)]">{label}</dt>
      <dd className="text-right font-mono text-[13.5px] tabular-nums text-[color:var(--color-ink)]">
        {value}
      </dd>
    </div>
  )
}
