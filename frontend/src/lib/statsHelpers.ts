import type { AppBlockCount, SessionRecord } from '../types'

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Longest run of consecutive calendar days with at least one completed focus session. */
export function computeLongestStreak(history: SessionRecord[]): number {
  const activeDates = [
    ...new Set(
      history.filter((r) => r.completedSessions > 0).map((r) => r.date),
    ),
  ].sort()

  if (activeDates.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < activeDates.length; i += 1) {
    const prev = parseIsoDate(activeDates[i - 1])
    const next = parseIsoDate(activeDates[i])
    const diffDays = Math.round((next.getTime() - prev.getTime()) / 86_400_000)

    if (diffDays === 1) {
      current += 1
      longest = Math.max(longest, current)
    } else if (diffDays > 0) {
      current = 1
    }
  }

  return longest
}

export function computePersonalBest(
  history: SessionRecord[],
): { date: string; focusMinutes: number } | null {
  if (history.length === 0) return null
  const best = history.reduce((top, row) => {
    if (row.focusMinutes > top.focusMinutes) return row
    if (row.focusMinutes === top.focusMinutes && row.completedSessions > top.completedSessions) {
      return row
    }
    return top
  })
  if (best.focusMinutes <= 0) return null
  return { date: best.date, focusMinutes: best.focusMinutes }
}

export function topBlockedApps(counts: AppBlockCount[], limit = 5): AppBlockCount[] {
  return [...counts].sort((a, b) => b.count - a.count).slice(0, limit)
}

export function displayAppLabel(key: string, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback
  const base = key.replace(/\.exe$/i, '')
  if (!base) return key
  return base.charAt(0).toUpperCase() + base.slice(1)
}
