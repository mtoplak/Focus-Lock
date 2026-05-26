export type TimerMode = 'focus' | 'short-break' | 'long-break'

export type BlockKind = 'app' | 'url'

export interface Settings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
  voiceControlEnabled: boolean
  strictMode: boolean
}

export interface BlockedItem {
  id: string
  label: string
  kind: BlockKind
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
  notificationsEnabled: true,
  voiceControlEnabled: false,
  strictMode: false,
}

export const DEFAULT_BLOCKED: BlockedItem[] = [
  { id: '1', label: 'youtube.com', kind: 'url', enabled: true },
  { id: '2', label: 'instagram.com', kind: 'url', enabled: true },
  { id: '3', label: 'tiktok.com', kind: 'url', enabled: true },
  { id: '4', label: 'reddit.com', kind: 'url', enabled: false },
  { id: '5', label: 'twitter.com', kind: 'url', enabled: false },
  { id: '6', label: 'Spotify.exe', kind: 'app', enabled: false },
  { id: '7', label: 'Discord.exe', kind: 'app', enabled: false },
]
