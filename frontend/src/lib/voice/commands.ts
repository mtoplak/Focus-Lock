import type { TimerMode } from '../../types'

export type VoiceAppView = 'timer' | 'block' | 'stats' | 'settings'

export type VoiceCommandId =
  | 'start'
  | 'pause'
  | 'reset'
  | 'skip'
  | 'mode-focus'
  | 'mode-short-break'
  | 'mode-long-break'
  | 'nav-timer'
  | 'nav-blocks'
  | 'nav-stats'
  | 'nav-settings'

export type VoiceCommandMatch = {
  id: VoiceCommandId
  label: string
}

export type VoiceCommandHelpEntry = {
  id: VoiceCommandId
  label: string
  action: string
  phrases: string[]
}

export type VoiceCommandHelpGroup = {
  title: string
  commands: VoiceCommandHelpEntry[]
}

const VOICE_ACTIONS: Record<VoiceCommandId, string> = {
  start: 'Start the timer',
  pause: 'Pause the timer',
  reset: 'Reset the current session',
  skip: 'Skip to the next segment',
  'mode-focus': 'Switch to focus mode',
  'mode-short-break': 'Switch to short break',
  'mode-long-break': 'Switch to long break',
  'nav-timer': 'Open the Timer page',
  'nav-blocks': 'Open the Blocks page',
  'nav-stats': 'Open the Stats page',
  'nav-settings': 'Open the Settings page',
}

const HELP_GROUP_ORDER: Array<{ title: string; ids: VoiceCommandId[] }> = [
  {
    title: 'Timer',
    ids: ['start', 'pause', 'reset', 'skip', 'mode-focus', 'mode-short-break', 'mode-long-break'],
  },
  {
    title: 'Navigation',
    ids: ['nav-timer', 'nav-blocks', 'nav-stats', 'nav-settings'],
  },
]

/** Phrase → command (first match wins after normalization). */
/** Longer phrases first so "short break" is not partially matched as "break" only. */
const PHRASES: Array<{ phrases: string[]; id: VoiceCommandId; label: string }> = [
  {
    phrases: ['short break', 'short break mode'],
    id: 'mode-short-break',
    label: 'Short break',
  },
  {
    phrases: ['long break', 'long break mode'],
    id: 'mode-long-break',
    label: 'Long break',
  },
  {
    phrases: ['open settings', 'go to settings', 'show settings'],
    id: 'nav-settings',
    label: 'Settings',
  },
  {
    phrases: ['open blocks', 'go to blocks', 'show blocks'],
    id: 'nav-blocks',
    label: 'Blocks',
  },
  {
    phrases: ['open stats', 'go to stats', 'show stats', 'statistics'],
    id: 'nav-stats',
    label: 'Stats',
  },
  {
    phrases: ['open timer', 'go to timer', 'show timer', 'home'],
    id: 'nav-timer',
    label: 'Timer',
  },
  { phrases: ['settings'], id: 'nav-settings', label: 'Settings' },
  { phrases: ['blocks'], id: 'nav-blocks', label: 'Blocks' },
  { phrases: ['stats'], id: 'nav-stats', label: 'Stats' },
  { phrases: ['timer'], id: 'nav-timer', label: 'Timer' },
  { phrases: ['start', 'begin', 'resume', 'go'], id: 'start', label: 'Start' },
  { phrases: ['pause', 'hold'], id: 'pause', label: 'Pause' },
  { phrases: ['reset', 'restart'], id: 'reset', label: 'Reset' },
  { phrases: ['skip', 'next'], id: 'skip', label: 'Skip' },
  { phrases: ['focus', 'focus mode'], id: 'mode-focus', label: 'Focus mode' },
]

function normalize(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchVoiceCommand(transcript: string): VoiceCommandMatch | null {
  const normalized = normalize(transcript)
  if (!normalized) return null

  for (const entry of PHRASES) {
    for (const phrase of entry.phrases) {
      if (normalized === phrase) {
        return { id: entry.id, label: entry.label }
      }
    }
  }

  return null
}

export function timerModeFromCommand(id: VoiceCommandId): TimerMode | null {
  if (id === 'mode-focus') return 'focus'
  if (id === 'mode-short-break') return 'short-break'
  if (id === 'mode-long-break') return 'long-break'
  return null
}

export function appViewFromCommand(id: VoiceCommandId): VoiceAppView | null {
  if (id === 'nav-timer') return 'timer'
  if (id === 'nav-blocks') return 'block'
  if (id === 'nav-stats') return 'stats'
  if (id === 'nav-settings') return 'settings'
  return null
}

/** Merged phrase list per command — used for Settings help UI. */
export function getVoiceCommandReference(): VoiceCommandHelpGroup[] {
  const merged = new Map<VoiceCommandId, { label: string; phrases: Set<string> }>()

  for (const entry of PHRASES) {
    const existing = merged.get(entry.id)
    if (existing) {
      for (const phrase of entry.phrases) existing.phrases.add(phrase)
    } else {
      merged.set(entry.id, { label: entry.label, phrases: new Set(entry.phrases) })
    }
  }

  return HELP_GROUP_ORDER.map((group) => ({
    title: group.title,
    commands: group.ids.map((id) => {
      const data = merged.get(id)
      if (!data) {
        return { id, label: id, action: VOICE_ACTIONS[id], phrases: [] }
      }
      return {
        id,
        label: data.label,
        action: VOICE_ACTIONS[id],
        phrases: [...data.phrases].sort((a, b) => a.localeCompare(b)),
      }
    }),
  }))
}
