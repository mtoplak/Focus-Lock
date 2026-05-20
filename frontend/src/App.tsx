import { useCallback, useState, type ReactNode } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTimer } from './hooks/useTimer'
import { Timer } from './components/Timer'
import { BlockList } from './components/BlockList'
import { Stats } from './components/Stats'
import { SettingsView } from './components/SettingsView'
import type { BlockedItem, SessionRecord, Settings } from './types'
import { DEFAULT_BLOCKED, DEFAULT_SETTINGS } from './types'

type View = 'timer' | 'block' | 'stats' | 'settings'

const NAV: { id: View; label: string; icon: ReactNode }[] = [
  {
    id: 'timer',
    label: 'Časovnik',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
    ),
  },
  {
    id: 'block',
    label: 'Blokade',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M5 5l14 14" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Statistika',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Nastavitve',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
  },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

function App() {
  const [view, setView] = useState<View>('timer')
  const [task, setTask] = useState('')
  const [settings, setSettings] = useLocalStorage<Settings>('fl.settings', DEFAULT_SETTINGS)
  const [blocked, setBlocked] = useLocalStorage<BlockedItem[]>('fl.blocked', DEFAULT_BLOCKED)
  const [history, setHistory] = useLocalStorage<SessionRecord[]>('fl.history', [])

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

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      <aside className="hidden w-60 shrink-0 border-r border-slate-900 bg-slate-950/80 p-6 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-50">Focus Lock</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                view === item.id
                  ? 'bg-slate-900 text-slate-50'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <span className={view === item.id ? 'text-indigo-300' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-xs text-slate-400">
          <div className="mb-1 font-medium text-slate-200">Ostani fokusiran</div>
          Tvoja produktivnost na enem mestu.
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between border-b border-slate-900 bg-slate-950/95 px-4 py-3 backdrop-blur md:hidden">
        <span className="text-sm font-semibold tracking-tight">Focus Lock</span>
        <nav className="flex gap-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-label={item.label}
              className={`rounded-lg p-2 transition ${
                view === item.id ? 'bg-slate-900 text-indigo-300' : 'text-slate-400'
              }`}
            >
              {item.icon}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-20 pb-12 md:px-10 md:pt-12">
        {view === 'timer' && (
          <div className="flex w-full items-center justify-center">
            <Timer timer={timer} settings={settings} task={task} onTaskChange={setTask} />
          </div>
        )}
        {view === 'block' && (
          <BlockList
            items={blocked}
            onChange={setBlocked}
            mode={timer.mode}
            isRunning={timer.isRunning}
          />
        )}
        {view === 'stats' && <Stats history={history} />}
        {view === 'settings' && <SettingsView settings={settings} onChange={setSettings} />}
      </main>
    </div>
  )
}

export default App
