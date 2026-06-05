import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAgentSync } from '../hooks/useAgent'
import { useTimer } from '../hooks/useTimer'
import { useVoiceControl } from '../hooks/useVoiceControl'
import { useAmbient } from '../hooks/useAmbient'
import { useWakeLock } from '../hooks/useWakeLock'
import { VoiceControl } from '../components/VoiceControl'
import { AmbientPlayer } from '../components/AmbientPlayer'
import { Timer } from '../components/Timer'
import { BlockList } from '../components/BlockList'
import { Stats } from '../components/Stats'
import { SettingsView } from '../components/SettingsView'
import { UserMenu } from '../components/UserMenu'
import type { AppBlockCount, BlockedItem, SessionRecord, Settings, UrlBlockCount } from '../types'
import { useAgentBlockStatsSync } from '../hooks/useBlockKillSync'
import { resetDisplayedStatsWithBaseline } from '../lib/statsStorage'
import { fetchAgentBlockBaseline, getCachedAgentState } from '../hooks/useAgent'
import { DEFAULT_BLOCKED, DEFAULT_SETTINGS } from '../types'

type View = 'timer' | 'block' | 'stats' | 'settings'

const VIEW_TO_PATH: Record<View, string> = {
  timer: '/',
  block: '/blocks',
  stats: '/stats',
  settings: '/settings',
}

const PATH_TO_VIEW: Record<string, View> = {
  '/': 'timer',
  '/blocks': 'block',
  '/stats': 'stats',
  '/settings': 'settings',
}

const NAV: { id: View; label: string; icon: ReactNode }[] = [
  {
    id: 'timer',
    label: 'Timer',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
    ),
  },
  {
    id: 'block',
    label: 'Blocks',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M5 5l14 14" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1-.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

export function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const view: View = PATH_TO_VIEW[location.pathname] ?? 'timer'
  const setView = (next: View) => navigate(VIEW_TO_PATH[next])
  const [task, setTask] = useState('')
  const [settings, setSettings] = useLocalStorage<Settings>('fl.settings', DEFAULT_SETTINGS)
  const [blocked, setBlocked] = useLocalStorage<BlockedItem[]>('fl.blocked', DEFAULT_BLOCKED)
  const [history, setHistory] = useLocalStorage<SessionRecord[]>('fl.history', [])
  const [blockCounts, setBlockCounts] = useLocalStorage<AppBlockCount[]>('fl.blockCounts', [])
  const [urlBlockCounts, setUrlBlockCounts] = useLocalStorage<UrlBlockCount[]>(
    'fl.urlBlockCounts',
    [],
  )

  useAgentBlockStatsSync(setBlockCounts, setUrlBlockCounts)

  const resetStats = useCallback(() => {
    // Align the delta baseline with the agent's cumulative counters before
    // clearing displayed stats — otherwise the next /status poll re-imports
    // every URL/app block count as a "new" delta.
    const cached = getCachedAgentState()
    const immediate = {
      kill: cached.status === 'connected' ? (cached.killCounts ?? {}) : {},
      url: cached.status === 'connected' ? (cached.urlBlockCounts ?? {}) : {},
    }
    resetDisplayedStatsWithBaseline(immediate)
    setHistory([])
    setBlockCounts([])
    setUrlBlockCounts([])

    void fetchAgentBlockBaseline().then((baseline) => {
      resetDisplayedStatsWithBaseline(baseline)
    })
  }, [setHistory, setBlockCounts, setUrlBlockCounts])

  const recordFocus = useCallback(
    (focusMinutes: number) => {
      setHistory((prev) => {
        const date = todayISO()
        const existing = prev.find((r) => r.date === date)
        if (existing) {
          return prev.map((r) =>
            r.date === date
              ? {
                  ...r,
                  focusMinutes: r.focusMinutes + focusMinutes,
                  completedSessions: r.completedSessions + 1,
                }
              : r,
          )
        }
        return [...prev, { date, focusMinutes, completedSessions: 1 }]
      })
    },
    [setHistory],
  )

  const timer = useTimer(settings, recordFocus)
  const ambient = useAmbient()

  const isStrictLocked = settings.strictMode && timer.mode === 'focus' && timer.isRunning

  const voice = useVoiceControl(settings.voiceControlEnabled, {
    onStart: () => {
      if (!timer.isRunning) timer.start()
    },
    onPause: () => {
      if (!isStrictLocked) timer.pause()
    },
    onReset: () => {
      if (!isStrictLocked) timer.reset()
    },
    onSkip: () => {
      if (!isStrictLocked) timer.skip()
    },
    onSetMode: (m) => {
      if (!isStrictLocked) timer.setMode(m)
    },
    onNavigate: setView,
  })

  // Backfill settings fields added after earlier saves.
  useEffect(() => {
    if (settings.voiceControlEnabled === undefined || settings.strictMode === undefined) {
      setSettings({
        ...settings,
        voiceControlEnabled: settings.voiceControlEnabled ?? false,
        strictMode: settings.strictMode ?? false,
      })
    }
  }, [settings, setSettings])

  // Backfill `kind` on items saved before this field existed.
  useEffect(() => {
    const legacy = blocked as Array<Partial<BlockedItem> & { id: string; label: string; enabled: boolean }>
    if (legacy.some((b) => !b.kind)) {
      setBlocked(legacy.map((b) => ({ ...b, kind: b.kind ?? 'url' }) as BlockedItem))
    }
  }, [blocked, setBlocked])

  useAgentSync(blocked, timer.mode === 'focus' && timer.isRunning)

  // Keep the screen awake during a running focus session.
  const screenAwake = useWakeLock(timer.mode === 'focus' && timer.isRunning)

  return (
    <div className="flex min-h-dvh bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] md:h-dvh md:min-h-0 md:overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <h1 className="sr-only">Focus Lock</h1>
      <aside className="hidden w-60 shrink-0 border-r border-[color:var(--color-line)] px-5 py-7 md:flex md:flex-col">
        <div className="mb-9 flex items-center gap-2.5 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
            Focus Lock
          </span>
        </div>

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition ${
                  active
                    ? 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]'
                    : 'text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-surface-2)]/60 hover:text-[color:var(--color-ink-soft)]'
                }`}
              >
                <span className={active ? 'text-[color:var(--color-ink)]' : ''} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })}
        </nav>
        {voice.enabled && <VoiceControl voice={voice} placement="sidebar" />}
        <AmbientPlayer ambient={ambient} />
      </aside>

      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-2 border-b border-[color:var(--color-line)] bg-[color:var(--color-canvas)]/90 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-ink)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
          </div>
          <span className="truncate text-[14px] font-semibold tracking-tight">Focus Lock</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {voice.enabled && <VoiceControl voice={voice} placement="toolbar" />}
          <nav aria-label="Primary" className="flex gap-0.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-label={item.label}
                aria-current={view === item.id ? 'page' : undefined}
                className={`cursor-pointer rounded-md p-2 transition ${
                  view === item.id
                    ? 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]'
                    : 'text-[color:var(--color-ink-muted)]'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
              </button>
            ))}
          </nav>
          <UserMenu />
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className={`relative flex-1 px-5 pt-20 pb-16 outline-none md:px-12 md:pt-10 md:pb-10 ${
          (view === 'timer' || view === 'block') && !isStrictLocked
            ? 'overflow-y-auto md:overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        <div className="pointer-events-none absolute top-4 right-4 z-10 hidden md:block">
          <div className="pointer-events-auto">
            <UserMenu />
          </div>
        </div>

        {isStrictLocked && (
          <div className="mx-auto mb-6 flex max-w-2xl items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Strict mode locked</p>
              <p className="mt-0.5 text-[12px] opacity-80">
                You enabled strict mode, so this focus session can't be paused, reset, skipped, or edited until it ends.
                Block list and settings are read-only.
              </p>
            </div>
          </div>
        )}

        {view === 'timer' && (
          <div
            className={`flex w-full items-start justify-center ${
              isStrictLocked ? '' : 'md:h-full md:items-center'
            }`}
          >
            <Timer
              timer={timer}
              settings={settings}
              task={task}
              onTaskChange={setTask}
              strictLocked={isStrictLocked}
              screenAwake={screenAwake}
            />
          </div>
        )}
        {view === 'block' && (
          <BlockList
            items={blocked}
            onChange={setBlocked}
            mode={timer.mode}
            isRunning={timer.isRunning}
            strictLocked={isStrictLocked}
          />
        )}
        {view === 'stats' && (
          <Stats
            history={history}
            blockCounts={blockCounts}
            urlBlockCounts={urlBlockCounts}
            onResetStats={resetStats}
          />
        )}
        {view === 'settings' && (
          <SettingsView settings={settings} onChange={setSettings} strictLocked={isStrictLocked} />
        )}
      </main>
    </div>
  )
}
