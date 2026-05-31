import { useEffect } from 'react'
import type { AppBlockCount, UrlBlockCount } from '../types'
import { displayAppLabel } from '../lib/statsHelpers'
import {
  loadAgentBlockSnapshot,
  saveAgentBlockSnapshot,
  type AgentBlockSnapshot,
} from '../lib/statsStorage'
import { subscribeAgentState, type AgentState } from './useAgent'

type CountMap<T extends AppBlockCount | UrlBlockCount> = Record<string, T>

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}

function mergeCounts<T extends AppBlockCount | UrlBlockCount>(
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

function realignBaseline(
  agentCounts: Record<string, number>,
  baseline: Record<string, number>,
): Record<string, number> {
  if (sumCounts(agentCounts) < sumCounts(baseline)) {
    return {}
  }
  return baseline
}

/**
 * Merges app kill + URL block counts from the desktop agent into local stats.
 */
export function useAgentBlockStatsSync(
  setAppBlockCounts: (updater: (prev: AppBlockCount[]) => AppBlockCount[]) => void,
  setUrlBlockCounts: (updater: (prev: UrlBlockCount[]) => UrlBlockCount[]) => void,
) {
  useEffect(() => {
    const onAgent = (state: AgentState) => {
      if (state.status !== 'connected') return

      const killCounts = state.killCounts ?? {}
      const urlBlockCounts = state.urlBlockCounts ?? {}

      let snapshot = loadAgentBlockSnapshot()
      snapshot = {
        kill: realignBaseline(killCounts, snapshot.kill),
        url: realignBaseline(urlBlockCounts, snapshot.url),
      }

      setAppBlockCounts((prevList) => {
        const map = Object.fromEntries(prevList.map((r) => [r.key, r]))
        const next = mergeCounts(map, killCounts, snapshot.kill, (key, existing) =>
          existing?.label ?? displayAppLabel(key),
        )
        return Object.values(next)
      })

      setUrlBlockCounts((prevList) => {
        const map = Object.fromEntries(prevList.map((r) => [r.key, r]))
        const next = mergeCounts(map, urlBlockCounts, snapshot.url, (key, existing) =>
          existing?.label ?? key,
        )
        return Object.values(next)
      })

      const nextSnapshot: AgentBlockSnapshot = {
        kill: killCounts,
        url: urlBlockCounts,
      }
      saveAgentBlockSnapshot(nextSnapshot)
    }

    return subscribeAgentState(onAgent)
  }, [setAppBlockCounts, setUrlBlockCounts])
}

/** @deprecated Use useAgentBlockStatsSync */
export function useBlockKillSync(
  setBlockCounts: (updater: (prev: AppBlockCount[]) => AppBlockCount[]) => void,
) {
  useAgentBlockStatsSync(setBlockCounts, () => {})
}
