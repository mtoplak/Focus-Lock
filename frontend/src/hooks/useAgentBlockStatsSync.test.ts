import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppBlockCount, UrlBlockCount } from '../types'
import { resetDisplayedStatsWithBaseline } from '../lib/statsStorage'
import { useAgentBlockStatsSync } from './useBlockKillSync'
import type { AgentState } from './useAgent'

const agentListeners = vi.hoisted(() => [] as Array<(state: AgentState) => void>)

vi.mock('./useAgent', () => ({
  subscribeAgentState: (listener: (state: AgentState) => void) => {
    agentListeners.push(listener)
    return () => {
      const idx = agentListeners.indexOf(listener)
      if (idx >= 0) agentListeners.splice(idx, 1)
    }
  },
}))

function emitAgent(state: AgentState): void {
  for (const listener of agentListeners) {
    listener(state)
  }
}

function useStatsState() {
  const [blockCounts, setBlockCounts] = useState<AppBlockCount[]>([])
  const [urlBlockCounts, setUrlBlockCounts] = useState<UrlBlockCount[]>([])
  useAgentBlockStatsSync(setBlockCounts, setUrlBlockCounts)
  return { blockCounts, urlBlockCounts, setBlockCounts, setUrlBlockCounts }
}

function resetDisplayedStatsLikeHomePage(
  baseline: { kill: Record<string, number>; url: Record<string, number> },
  clear: () => void,
): void {
  resetDisplayedStatsWithBaseline(baseline)
  clear()
}

describe('useAgentBlockStatsSync', () => {
  beforeEach(() => {
    localStorage.clear()
    agentListeners.length = 0
  })

  it('merges new URL block deltas from the agent', () => {
    const { result } = renderHook(() => useStatsState())

    act(() => {
      emitAgent({
        status: 'connected',
        urlBlockCounts: { 'youtube.com': 5 },
      })
    })

    expect(result.current.urlBlockCounts).toEqual([
      { key: 'youtube.com', label: 'youtube.com', count: 5 },
    ])
  })

  it('does not re-import cumulative agent totals after a baseline-aligned reset', () => {
    const { result } = renderHook(() => useStatsState())

    act(() => {
      emitAgent({
        status: 'connected',
        urlBlockCounts: { 'youtube.com': 12 },
      })
    })

    expect(result.current.urlBlockCounts).toHaveLength(1)

    act(() => {
      resetDisplayedStatsLikeHomePage(
        { kill: {}, url: { 'youtube.com': 12 } },
        () => {
          result.current.setUrlBlockCounts([])
          result.current.setBlockCounts([])
        },
      )
    })

    act(() => {
      emitAgent({
        status: 'connected',
        urlBlockCounts: { 'youtube.com': 12 },
      })
    })

    expect(result.current.urlBlockCounts).toEqual([])
  })

  it('imports only new blocks after reset when the agent count increases', () => {
    const { result } = renderHook(() => useStatsState())

    act(() => {
      emitAgent({
        status: 'connected',
        urlBlockCounts: { 'youtube.com': 12 },
      })
    })

    act(() => {
      resetDisplayedStatsLikeHomePage(
        { kill: {}, url: { 'youtube.com': 12 } },
        () => {
          result.current.setUrlBlockCounts([])
          result.current.setBlockCounts([])
        },
      )
    })

    act(() => {
      emitAgent({
        status: 'connected',
        urlBlockCounts: { 'youtube.com': 15 },
      })
    })

    expect(result.current.urlBlockCounts).toEqual([
      { key: 'youtube.com', label: 'youtube.com', count: 3 },
    ])
  })
})
