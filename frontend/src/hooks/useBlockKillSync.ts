import { useEffect } from 'react'
import type { AppBlockCount, UrlBlockCount } from '../types'
import { mergeBlockCountList, realignAgentBaseline } from '../lib/blockStatsMerge'
import { displayAppLabel } from '../lib/statsHelpers'
import {
  loadAgentBlockSnapshot,
  saveAgentBlockSnapshot,
  type AgentBlockSnapshot,
} from '../lib/statsStorage'
import { subscribeAgentState, type AgentState } from './useAgent'

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
        kill: realignAgentBaseline(killCounts, snapshot.kill),
        url: realignAgentBaseline(urlBlockCounts, snapshot.url),
      }

      setAppBlockCounts((prevList) =>
        mergeBlockCountList(prevList, killCounts, snapshot.kill, (key, existing) =>
          existing?.label ?? displayAppLabel(key),
        ),
      )

      setUrlBlockCounts((prevList) =>
        mergeBlockCountList(prevList, urlBlockCounts, snapshot.url, (key, existing) =>
          existing?.label ?? key,
        ),
      )

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
