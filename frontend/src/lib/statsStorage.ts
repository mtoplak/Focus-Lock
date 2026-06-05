/** localStorage keys used for on-device stats. */
export const STATS_HISTORY_KEY = 'fl.history'
export const STATS_BLOCK_COUNTS_KEY = 'fl.blockCounts'
export const STATS_URL_BLOCK_COUNTS_KEY = 'fl.urlBlockCounts'
export const STATS_AGENT_SNAPSHOT_KEY = 'fl.blockAgentSnapshot'

export type AgentBlockSnapshot = {
  kill: Record<string, number>
  url: Record<string, number>
}

export function clearDisplayedStatsStorage(): void {
  try {
    localStorage.removeItem(STATS_HISTORY_KEY)
    localStorage.removeItem(STATS_BLOCK_COUNTS_KEY)
    localStorage.removeItem(STATS_URL_BLOCK_COUNTS_KEY)
  } catch {
    // ignore
  }
}

/** Clears displayed stats and all agent sync baselines. */
export function clearAllStatsStorage(): void {
  clearDisplayedStatsStorage()
  try {
    localStorage.removeItem(STATS_AGENT_SNAPSHOT_KEY)
  } catch {
    // ignore
  }
}

/**
 * Reset on-device stats while keeping the agent delta baseline aligned so
 * cumulative agent counters are not re-imported on the next poll.
 */
export function resetDisplayedStatsWithBaseline(baseline: AgentBlockSnapshot): void {
  clearDisplayedStatsStorage()
  saveAgentBlockSnapshot(baseline)
}

export function loadAgentBlockSnapshot(): AgentBlockSnapshot {
  try {
    const raw = localStorage.getItem(STATS_AGENT_SNAPSHOT_KEY)
    if (!raw) return { kill: {}, url: {} }
    const parsed = JSON.parse(raw) as AgentBlockSnapshot | Record<string, number>
    if ('kill' in parsed && 'url' in parsed) {
      return parsed as AgentBlockSnapshot
    }
    // Legacy: snapshot was kill-only map.
    return { kill: parsed as Record<string, number>, url: {} }
  } catch {
    return { kill: {}, url: {} }
  }
}

export function saveAgentBlockSnapshot(snapshot: AgentBlockSnapshot): void {
  try {
    localStorage.setItem(STATS_AGENT_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore quota errors
  }
}
