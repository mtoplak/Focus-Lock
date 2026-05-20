export type TimerMode = 'focus' | 'short-break' | 'long-break'

export interface Settings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
}

export interface BlockedItem {
  id: string
  label: string
  enabled: boolean
}

export interface SessionRecord {
  date: string
  focusMinutes: number
  completedSessions: number
}

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  soundEnabled: true,
}

export const DEFAULT_BLOCKED: BlockedItem[] = [
  { id: '1', label: 'youtube.com', enabled: true },
  { id: '2', label: 'instagram.com', enabled: true },
  { id: '3', label: 'tiktok.com', enabled: true },
  { id: '4', label: 'reddit.com', enabled: false },
  { id: '5', label: 'twitter.com', enabled: false },
]
