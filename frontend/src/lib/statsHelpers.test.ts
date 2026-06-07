import { describe, expect, it } from 'vitest'
import {
  computeLongestStreak,
  computePersonalBest,
  displayAppLabel,
  formatMinutes,
  topBlockedApps,
  topBlockedUrls,
} from './statsHelpers'
import type { AppBlockCount, SessionRecord, UrlBlockCount } from '../types'

describe('statsHelpers', () => {
  describe('formatMinutes', () => {
    it('formats sub-hour and hour+minute durations', () => {
      expect(formatMinutes(25)).toBe('25m')
      expect(formatMinutes(60)).toBe('1h')
      expect(formatMinutes(90)).toBe('1h 30m')
    })
  })

  describe('computeLongestStreak', () => {
    it('returns 0 for empty or inactive history', () => {
      expect(computeLongestStreak([])).toBe(0)
      expect(
        computeLongestStreak([{ date: '2026-06-01', focusMinutes: 0, completedSessions: 0 }]),
      ).toBe(0)
    })

    it('counts the longest consecutive active-day run', () => {
      const history: SessionRecord[] = [
        { date: '2026-06-01', focusMinutes: 25, completedSessions: 1 },
        { date: '2026-06-02', focusMinutes: 50, completedSessions: 2 },
        { date: '2026-06-03', focusMinutes: 25, completedSessions: 1 },
        { date: '2026-06-05', focusMinutes: 25, completedSessions: 1 },
      ]
      expect(computeLongestStreak(history)).toBe(3)
    })
  })

  describe('computePersonalBest', () => {
    it('returns the day with the most focus minutes', () => {
      const history: SessionRecord[] = [
        { date: '2026-06-01', focusMinutes: 25, completedSessions: 1 },
        { date: '2026-06-02', focusMinutes: 75, completedSessions: 3 },
        { date: '2026-06-03', focusMinutes: 50, completedSessions: 2 },
      ]
      expect(computePersonalBest(history)).toEqual({ date: '2026-06-02', focusMinutes: 75 })
    })

    it('breaks ties by completed session count', () => {
      const history: SessionRecord[] = [
        { date: '2026-06-01', focusMinutes: 50, completedSessions: 1 },
        { date: '2026-06-02', focusMinutes: 50, completedSessions: 3 },
      ]
      expect(computePersonalBest(history)?.date).toBe('2026-06-02')
    })

    it('returns null when no positive focus time exists', () => {
      expect(
        computePersonalBest([{ date: '2026-06-01', focusMinutes: 0, completedSessions: 0 }]),
      ).toBeNull()
    })
  })

  describe('topBlockedApps / topBlockedUrls', () => {
    it('sorts by count descending and limits results', () => {
      const apps: AppBlockCount[] = [
        { key: 'discord.exe', label: 'Discord', count: 3 },
        { key: 'spotify.exe', label: 'Spotify', count: 10 },
        { key: 'slack.exe', label: 'Slack', count: 7 },
      ]
      expect(topBlockedApps(apps, 2).map((a) => a.key)).toEqual(['spotify.exe', 'slack.exe'])

      const urls: UrlBlockCount[] = [
        { key: 'reddit.com', label: 'reddit.com', count: 2 },
        { key: 'youtube.com', label: 'youtube.com', count: 15 },
      ]
      expect(topBlockedUrls(urls)[0].key).toBe('youtube.com')
    })

    it('does not mutate the input array', () => {
      const urls: UrlBlockCount[] = [
        { key: 'b.com', label: 'b.com', count: 1 },
        { key: 'a.com', label: 'a.com', count: 2 },
      ]
      topBlockedUrls(urls)
      expect(urls[0].key).toBe('b.com')
    })
  })

  describe('displayAppLabel', () => {
    it('prefers a non-empty fallback label', () => {
      expect(displayAppLabel('discord.exe', 'Discord')).toBe('Discord')
    })

    it('title-cases the exe stem when no fallback is provided', () => {
      expect(displayAppLabel('discord.exe')).toBe('Discord')
      expect(displayAppLabel('SPOTIFY.EXE')).toBe('SPOTIFY')
    })
  })
})
