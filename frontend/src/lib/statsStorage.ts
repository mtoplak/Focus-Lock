/** localStorage keys used for on-device stats. */
export const STATS_HISTORY_KEY = 'fl.history'
export const STATS_BLOCK_COUNTS_KEY = 'fl.blockCounts'
export const STATS_AGENT_SNAPSHOT_KEY = 'fl.blockAgentSnapshot'

export function clearAllStatsStorage(): void {
  try {
    localStorage.removeItem(STATS_HISTORY_KEY)
    localStorage.removeItem(STATS_BLOCK_COUNTS_KEY)
    localStorage.removeItem(STATS_AGENT_SNAPSHOT_KEY)
  } catch {
    // ignore
  }
}
