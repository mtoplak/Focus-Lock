import type { AppBlockCount, UrlBlockCount } from '../types'

type CountMap<T extends AppBlockCount | UrlBlockCount> = Record<string, T>

export function sumAgentCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}

/** If the agent restarted and totals dropped, discard a stale baseline. */
export function realignAgentBaseline(
  agentCounts: Record<string, number>,
  baseline: Record<string, number>,
): Record<string, number> {
  if (sumAgentCounts(agentCounts) < sumAgentCounts(baseline)) {
    return {}
  }
  return baseline
}

export function mergeAgentBlockCounts<T extends AppBlockCount | UrlBlockCount>(
  prev: CountMap<T>,
  agentCounts: Record<string, number>,
  baseline: Record<string, number>,
  labelFor: (key: string, existing?: T) => string,
): CountMap<T> {
  const next = { ...prev }

  for (const [key, agentCount] of Object.entries(agentCounts)) {
    const seen = baseline[key] ?? 0
    const delta = agentCount - seen
    if (delta > 0) {
      const existing = next[key]
      next[key] = {
        key,
        label: labelFor(key, existing),
        count: (existing?.count ?? 0) + delta,
      } as T
    }
  }

  return next
}

export function mergeBlockCountList<T extends AppBlockCount | UrlBlockCount>(
  prevList: T[],
  agentCounts: Record<string, number>,
  baseline: Record<string, number>,
  labelFor: (key: string, existing?: T) => string,
): T[] {
  const map = Object.fromEntries(prevList.map((r) => [r.key, r]))
  return Object.values(mergeAgentBlockCounts(map, agentCounts, baseline, labelFor))
}
