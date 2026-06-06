import { beforeEach, describe, expect, it } from 'vitest'
import {
  STATS_AGENT_SNAPSHOT_KEY,
  STATS_BLOCK_COUNTS_KEY,
  STATS_HISTORY_KEY,
  STATS_URL_BLOCK_COUNTS_KEY,
  loadAgentBlockSnapshot,
  resetDisplayedStatsWithBaseline,
  saveAgentBlockSnapshot,
} from './statsStorage'

describe('statsStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists and loads agent block snapshots', () => {
    saveAgentBlockSnapshot({
      kill: { 'discord.exe': 3 },
      url: { 'youtube.com': 10 },
    })

    expect(loadAgentBlockSnapshot()).toEqual({
      kill: { 'discord.exe': 3 },
      url: { 'youtube.com': 10 },
    })
  })

  it('resetDisplayedStatsWithBaseline clears displayed stats but keeps aligned snapshot', () => {
    localStorage.setItem(STATS_HISTORY_KEY, JSON.stringify([{ date: '2026-06-04', focusMinutes: 25 }]))
    localStorage.setItem(
      STATS_URL_BLOCK_COUNTS_KEY,
      JSON.stringify([{ key: 'youtube.com', label: 'youtube.com', count: 12 }]),
    )
    localStorage.setItem(STATS_BLOCK_COUNTS_KEY, JSON.stringify([]))

    resetDisplayedStatsWithBaseline({
      kill: {},
      url: { 'youtube.com': 12 },
    })

    expect(localStorage.getItem(STATS_HISTORY_KEY)).toBeNull()
    expect(localStorage.getItem(STATS_URL_BLOCK_COUNTS_KEY)).toBeNull()
    expect(localStorage.getItem(STATS_BLOCK_COUNTS_KEY)).toBeNull()
    expect(loadAgentBlockSnapshot()).toEqual({
      kill: {},
      url: { 'youtube.com': 12 },
    })
    expect(localStorage.getItem(STATS_AGENT_SNAPSHOT_KEY)).not.toBeNull()
  })
})
