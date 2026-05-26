import { useEffect } from 'react'
import type { AppBlockCount } from '../types'
import { displayAppLabel } from '../lib/statsHelpers'
import { STATS_AGENT_SNAPSHOT_KEY } from '../lib/statsStorage'
import { subscribeAgentState, type AgentState } from './useAgent'

type BlockCountMap = Record<string, AppBlockCount>

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}

function loadAgentSnapshot(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STATS_AGENT_SNAPSHOT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function saveAgentSnapshot(snapshot: Record<string, number>): void {
  try {
    localStorage.setItem(STATS_AGENT_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore quota errors
  }
}

function mergeKillCounts(
  prev: BlockCountMap,
  killCounts: Record<string, number>,
  baseline: Record<string, number>,
): BlockCountMap {
  const next = { ...prev }

  for (const [key, agentCount] of Object.entries(killCounts)) {
    const seen = baseline[key] ?? 0
    const delta = agentCount - seen
    if (delta > 0) {
      const existing = next[key]
      next[key] = {
        key,
        label: existing?.label ?? displayAppLabel(key),
        count: (existing?.count ?? 0) + delta,
      }
    }
  }

  return next
}

/**
 * Merges per-session kill counts from the desktop agent into local block stats.
 * Uses a persisted agent snapshot so refresh / reconnect does not double-count.
 */
export function useBlockKillSync(
  setBlockCounts: (updater: (prev: AppBlockCount[]) => AppBlockCount[]) => void,
) {
  useEffect(() => {
    const onAgent = (state: AgentState) => {
      if (state.status !== 'connected') return

      const killCounts = state.killCounts ?? {}
      let baseline = loadAgentSnapshot()

      // Agent process restarted — its in-memory counters reset to 0.
      if (sumCounts(killCounts) < sumCounts(baseline)) {
        baseline = {}
      }

      setBlockCounts((prevList) => {
        const map = Object.fromEntries(prevList.map((r) => [r.key, r]))
        const next = mergeKillCounts(map, killCounts, baseline)
        saveAgentSnapshot(killCounts)
        return Object.values(next)
      })
    }

    return subscribeAgentState(onAgent)
  }, [setBlockCounts])
}
