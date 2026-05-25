import { useEffect, useMemo, useState } from 'react'
import { agentIconUrl, fetchInstalledApps, type InstalledApp } from '../hooks/useAgent'

interface AppPickerProps {
  /** Lowercased exe names already in the block list (to mark as "Added"). */
  alreadyBlocked: Set<string>
  onCancel: () => void
  onConfirm: (exeNames: string[]) => void
}

function AppIcon({ app }: { app: InstalledApp }) {
  const [failed, setFailed] = useState(false)
  const showImage = app.hasIcon && !failed
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-muted)]">
      {showImage ? (
        <img
          src={agentIconUrl(app.exe)}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
          onError={() => setFailed(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M9 9h6v6H9z" />
        </svg>
      )}
    </span>
  )
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; apps: InstalledApp[] }
  | { status: 'error'; message: string }

export function AppPicker({ alreadyBlocked, onCancel, onConfirm }: AppPickerProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [manualEntry, setManualEntry] = useState('')
  const [runningOnly, setRunningOnly] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const apps = await fetchInstalledApps()
        if (!cancelled) setLoad({ status: 'ready', apps })
      } catch (e) {
        if (!cancelled)
          setLoad({
            status: 'error',
            message: e instanceof Error ? e.message : 'Could not reach desktop agent',
          })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = () => {
    setLoad({ status: 'loading' })
    fetchInstalledApps()
      .then((apps) => setLoad({ status: 'ready', apps }))
      .catch((e) =>
        setLoad({
          status: 'error',
          message: e instanceof Error ? e.message : 'Could not reach desktop agent',
        }),
      )
  }

  const filtered = useMemo(() => {
    if (load.status !== 'ready') return []
    const q = query.trim().toLowerCase()
    return load.apps.filter((a) => {
      if (runningOnly && !a.running) return false
      if (!q) return true
      return a.displayName.toLowerCase().includes(q) || a.exe.toLowerCase().includes(q)
    })
  }, [load, query, runningOnly])

  const runningCount = useMemo(() => {
    if (load.status !== 'ready') return 0
    return load.apps.filter((a) => a.running).length
  }, [load])

  const toggle = (exe: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(exe)) next.delete(exe)
      else next.add(exe)
      return next
    })
  }

  const confirm = () => {
    const fromManual = manualEntry.trim()
    const all = new Set<string>(selected)
    if (fromManual) {
      const normalized = fromManual.toLowerCase().endsWith('.exe')
        ? fromManual
        : `${fromManual}.exe`
      all.add(normalized)
    }
    if (all.size === 0) {
      onCancel()
      return
    }
    onConfirm(Array.from(all))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--color-line)] px-5 py-4">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight text-[color:var(--color-ink)]">
              Pick apps to block
            </h3>
            <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-muted)]">
              Detected from your Start Menu and currently running apps.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1.5 text-[color:var(--color-ink-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="space-y-2.5 border-b border-[color:var(--color-line)] px-5 py-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter apps…"
              className="w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-2 pl-9 pr-3 text-[13px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:border-[color:var(--color-accent)]/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/15"
              autoFocus
            />
          </div>
          <div className="flex gap-0.5 rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-0.5 text-[11.5px]">
            <button
              type="button"
              onClick={() => setRunningOnly(false)}
              className={`flex-1 rounded px-2.5 py-1 font-medium transition ${
                !runningOnly
                  ? 'bg-[color:var(--color-ink)] text-white'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              All apps {load.status === 'ready' && <span className="opacity-60">({load.apps.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setRunningOnly(true)}
              className={`flex-1 rounded px-2.5 py-1 font-medium transition ${
                runningOnly
                  ? 'bg-[color:var(--color-ink)] text-white'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              Running now <span className="opacity-60">({runningCount})</span>
            </button>
          </div>
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto">
          {load.status === 'loading' && (
            <div className="flex h-full items-center justify-center px-6 py-12 text-[13px] text-[color:var(--color-ink-muted)]">
              Scanning Start Menu and running processes…
            </div>
          )}
          {load.status === 'error' && (
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] text-[color:var(--color-ink-muted)]">
                Could not reach the desktop agent.
              </p>
              <p className="mt-1 font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                {load.message}
              </p>
              <p className="mt-3 text-[12px] text-[color:var(--color-ink-muted)]">
                Make sure <span className="font-mono">focuslock-agent</span> is running.
              </p>
              <button
                type="button"
                onClick={refresh}
                className="mt-4 rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[12px] font-medium text-[color:var(--color-ink)] transition hover:bg-[color:var(--color-surface-2)]"
              >
                Retry
              </button>
            </div>
          )}
          {load.status === 'ready' && filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-[13px] text-[color:var(--color-ink-muted)]">
              {query
                ? `No matches for "${query}".`
                : runningOnly
                  ? 'No user apps running right now. Switch to "All apps" or launch one.'
                  : 'No apps detected. Use the manual entry below.'}
            </div>
          )}
          {load.status === 'ready' && filtered.length > 0 && (
            <ul className="divide-y divide-[color:var(--color-line)]">
              {filtered.map((app) => {
                const isSelected = selected.has(app.exe)
                const isAlreadyBlocked = alreadyBlocked.has(app.exe.toLowerCase())
                return (
                  <li key={app.exe}>
                    <button
                      type="button"
                      disabled={isAlreadyBlocked}
                      onClick={() => toggle(app.exe)}
                      className={`flex w-full items-center gap-3 px-5 py-3 text-left transition ${
                        isAlreadyBlocked
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-[color:var(--color-surface-2)]'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          isSelected
                            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-white'
                            : 'border-[color:var(--color-line-strong)] bg-transparent'
                        }`}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 8l3.5 3.5L13 5" />
                          </svg>
                        )}
                      </span>
                      <AppIcon app={app} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13.5px] font-medium text-[color:var(--color-ink)]">
                            {app.displayName}
                          </span>
                          {app.running && app.instances > 1 && (
                            <span className="rounded-full bg-[color:var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--color-ink-muted)]">
                              ×{app.instances}
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-[11.5px] text-[color:var(--color-ink-faint)]">
                          {app.exe}
                        </div>
                      </div>
                      {isAlreadyBlocked ? (
                        <span className="shrink-0 rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--color-ink-muted)]">
                          Added
                        </span>
                      ) : app.running ? (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          running
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--color-ink-muted)]">
                          installed
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="space-y-3 border-t border-[color:var(--color-line)] px-5 py-3.5">
          <details className="text-[12px]">
            <summary className="cursor-pointer text-[color:var(--color-ink-muted)] transition hover:text-[color:var(--color-ink)]">
              Don't see your app? Type it manually
            </summary>
            <input
              type="text"
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              placeholder="e.g. Steam.exe"
              className="mt-2 w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2 font-mono text-[12.5px] text-[color:var(--color-ink)] placeholder:font-sans placeholder:text-[color:var(--color-ink-faint)] focus:border-[color:var(--color-accent)]/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/15"
            />
          </details>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-[color:var(--color-ink-muted)]">
              {selected.size > 0
                ? `${selected.size} selected`
                : load.status === 'ready'
                  ? `${load.apps.length} detected`
                  : ''}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2 text-[12.5px] font-medium text-[color:var(--color-ink-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={selected.size === 0 && manualEntry.trim().length === 0}
                className="rounded-lg bg-[color:var(--color-ink)] px-4 py-2 text-[12.5px] font-medium text-white transition hover:bg-[color:var(--color-ink-soft)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add{selected.size > 1 ? ` ${selected.size}` : ''}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
