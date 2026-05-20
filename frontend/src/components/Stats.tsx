import type { SessionRecord } from '../types'

interface StatsProps {
  history: SessionRecord[]
}

const DAY_LABELS = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned']

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
      // today not done yet — check yesterday
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

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Statistika</h2>
        <p className="mt-1 text-sm text-slate-400">
          Spremljaj svoj napredek in motivacijo skozi čas.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Danes — seje" value={todaySessions.toString()} />
        <StatCard label="Danes — fokus" value={formatMinutes(todayMinutes)} />
        <StatCard label="Niz dni" value={`${streak} ${streak === 1 ? 'dan' : 'dni'}`} accent />
        <StatCard label="Skupaj sej" value={totalSessions.toString()} />
      </div>

      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h3 className="text-base font-medium text-slate-100">Zadnjih 7 dni</h3>
          <span className="text-sm text-slate-400">{formatMinutes(weekTotal)} skupaj</span>
        </div>
        <div className="flex h-48 items-end justify-between gap-3">
          {last7Data.map((d, i) => {
            const heightPct = (d.minutes / maxMinutes) * 100
            const isToday = isoDate(d.date) === today
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isToday ? 'bg-indigo-400' : 'bg-indigo-500/40'
                    } ${d.minutes === 0 ? 'min-h-[2px]' : ''}`}
                    style={{ height: `${Math.max(heightPct, d.minutes === 0 ? 0 : 4)}%` }}
                    title={`${formatMinutes(d.minutes)} • ${d.sessions} sej`}
                  />
                </div>
                <span
                  className={`text-xs ${isToday ? 'font-medium text-slate-200' : 'text-slate-500'}`}
                >
                  {DAY_LABELS[(d.date.getDay() + 6) % 7]}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="mb-4 text-base font-medium text-slate-100">Vse skupaj</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <dt className="text-slate-400">Dokončane fokus seje</dt>
          <dd className="text-right font-mono text-slate-100">{totalSessions}</dd>
          <dt className="text-slate-400">Skupni čas fokusa</dt>
          <dd className="text-right font-mono text-slate-100">{formatMinutes(totalMinutes)}</dd>
          <dt className="text-slate-400">Aktivni dnevi</dt>
          <dd className="text-right font-mono text-slate-100">
            {history.filter((r) => r.completedSessions > 0).length}
          </dd>
        </dl>
      </section>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? 'border-indigo-500/30 bg-indigo-500/10'
          : 'border-slate-800 bg-slate-900/40'
      }`}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div
        className={`mt-1.5 text-2xl font-semibold tabular-nums ${
          accent ? 'text-indigo-200' : 'text-slate-50'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
