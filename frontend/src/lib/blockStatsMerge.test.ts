import { describe, expect, it } from 'vitest'
import { mergeBlockCountList, realignAgentBaseline } from './blockStatsMerge'
import type { UrlBlockCount } from '../types'

describe('blockStatsMerge', () => {
  it('imports only new agent deltas since the baseline snapshot', () => {
    const prev: UrlBlockCount[] = []
    const agentCounts = { 'youtube.com': 12 }
    const baseline = { 'youtube.com': 12 }

    const next = mergeBlockCountList(prev, agentCounts, baseline, (key) => key)

    expect(next).toEqual([])
  })

  it('adds counts when the agent total increased since baseline', () => {
    const prev: UrlBlockCount[] = [{ key: 'youtube.com', label: 'youtube.com', count: 2 }]
    const agentCounts = { 'youtube.com': 5 }
    const baseline = { 'youtube.com': 2 }

    const next = mergeBlockCountList(prev, agentCounts, baseline, (key) => key)

    expect(next).toEqual([{ key: 'youtube.com', label: 'youtube.com', count: 5 }])
  })

  it('re-imports everything when baseline was cleared but agent totals remain', () => {
    const prev: UrlBlockCount[] = []
    const agentCounts = { 'youtube.com': 12 }
    const baseline = {}

    const next = mergeBlockCountList(prev, agentCounts, baseline, (key) => key)

    expect(next).toEqual([{ key: 'youtube.com', label: 'youtube.com', count: 12 }])
  })

  it('drops a stale baseline after agent restart', () => {
    const realigned = realignAgentBaseline({ 'youtube.com': 1 }, { 'youtube.com': 50 })
    expect(realigned).toEqual({})
  })
})
