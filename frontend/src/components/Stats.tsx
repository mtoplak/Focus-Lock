import type { SessionRecord } from '../types'

interface StatsProps {
  history: SessionRecord[]
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

const formatMinutes = (mins: number) => {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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

export function Stats({ history }: StatsProps) {
  const today = isoDate(new Date())
  const todayRec = history.find((r) => r.date === today)
  const todaySessions = todayRec?.completedSessions ?? 0
  const todayMinutes = todayRec?.focusMinutes ?? 0

  const totalSessions = history.reduce((sum, r) => sum + r.completedSessions, 0)
  const totalMinutes = history.reduce((sum, r) => sum + r.focusMinutes, 0)
  const streak = computeStreak(history)

  const last7 = getLast7Days()
  const last7Data = last7.map((d) => {
    const rec = history.find((r) => r.date === isoDate(d))
    return { date: d, minutes: rec?.focusMinutes ?? 0, sessions: rec?.completedSessions ?? 0 }
  })
  const maxMinutes = Math.max(60, ...last7Data.map((d) => d.minutes))
  const weekTotal = last7Data.reduce((sum, d) => sum + d.minutes, 0)
  const bestDay = last7Data.reduce(
    (best, d) => (d.minutes > best.minutes ? d : best),
    last7Data[0],
  )
  const activeDays = history.filter((r) => r.completedSessions > 0).length

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

      {/* stat grid */}
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

      {/* week chart */}
      <section className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
              Last 7 days
            </h3>
            <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-faint)]">
              {bestDay.minutes > 0
                ? `Best day — ${formatMinutes(bestDay.minutes)}`
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
        <div className="flex h-48 items-end justify-between gap-2.5">
          {last7Data.map((d, i) => {
            const heightPct = (d.minutes / maxMinutes) * 100
            const isToday = isoDate(d.date) === today
            const hasData = d.minutes > 0
            return (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <span className="absolute inset-x-0 bottom-0 top-0 rounded-md bg-[color:var(--color-surface-2)]" />
                  <div
                    className={`relative w-full rounded-md transition-all duration-300 ${
                      hasData
                        ? isToday
                          ? 'bg-[color:var(--color-accent)]'
                          : 'bg-[color:var(--color-accent)]/35'
                        : ''
                    }`}
                    style={{ height: hasData ? `${Math.max(heightPct, 4)}%` : '0%' }}
                  >
                    {hasData && (
                      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--color-ink)] px-2 py-1 font-mono text-[10px] text-white opacity-0 shadow-sm transition group-hover:opacity-100">
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

      {/* all-time totals */}
      <section className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <h3 className="mb-4 text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          All-time
        </h3>
        <dl className="divide-y divide-[color:var(--color-line)]">
          <Row label="Completed focus sessions" value={totalSessions.toString()} />
          <Row label="Total focus time" value={formatMinutes(totalMinutes)} />
          <Row label="Active days" value={activeDays.toString()} />
        </dl>
      </section>
    </div>
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
    <div className="flex items-baseline justify-between py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[13.5px] text-[color:var(--color-ink-muted)]">{label}</dt>
      <dd className="font-mono text-[13.5px] tabular-nums text-[color:var(--color-ink)]">
        {value}
      </dd>
    </div>
  )
}
