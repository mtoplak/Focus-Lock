import { useMemo, useState } from 'react'
import type { BlockKind, BlockedItem, TimerMode } from '../types'
import { useAgent } from '../hooks/useAgent'
import { AppPicker } from './AppPicker'

interface BlockListProps {
  items: BlockedItem[]
  onChange: (items: BlockedItem[]) => void
  mode: TimerMode
  isRunning: boolean
  strictLocked?: boolean
}

const KIND_LABEL: Record<BlockKind, string> = {
  url: 'Site',
  app: 'App',
}

const KIND_PLACEHOLDER: Record<BlockKind, string> = {
  url: 'e.g. youtube.com',
  app: 'e.g. Spotify.exe',
}

export function BlockList({ items, onChange, mode, isRunning, strictLocked = false }: BlockListProps) {
  const [draft, setDraft] = useState('')
  const [draftKind, setDraftKind] = useState<BlockKind>('url')
  const [pickerOpen, setPickerOpen] = useState(false)
  const agent = useAgent()

  const blockedAppSet = useMemo(
    () =>
      new Set(items.filter((i) => i.kind === 'app').map((i) => i.label.toLowerCase())),
    [items],
  )

  const addAppsFromPicker = (exeNames: string[]) => {
    const existing = new Set(
      items.filter((i) => i.kind === 'app').map((i) => i.label.toLowerCase()),
    )
    const fresh: BlockedItem[] = []
    for (const exe of exeNames) {
      if (existing.has(exe.toLowerCase())) continue
      fresh.push({
        id: crypto.randomUUID(),
        label: exe,
        kind: 'app',
        enabled: true,
      })
      existing.add(exe.toLowerCase())
    }
    if (fresh.length > 0) onChange([...items, ...fresh])
    setPickerOpen(false)
  }

  const activeCount = items.filter((i) => i.enabled).length
  const activeApps = items.filter((i) => i.enabled && i.kind === 'app').length
  const activeUrls = items.filter((i) => i.enabled && i.kind === 'url').length
  const blockingNow = mode === 'focus' && isRunning && activeCount > 0
  const urlNeedsAdmin = agent.urlBlocking?.kind === 'needs-admin' && activeUrls > 0
  const urlBlockingError =
    agent.urlBlocking?.kind === 'error' && activeUrls > 0 ? agent.urlBlocking.message : undefined

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    const normalized = draftKind === 'url' ? trimmed.toLowerCase() : trimmed
    if (items.some((i) => i.label === normalized && i.kind === draftKind)) {
      setDraft('')
      return
    }
    onChange([
      ...items,
      { id: crypto.randomUUID(), label: normalized, kind: draftKind, enabled: true },
    ])
    setDraft('')
  }

  const toggle = (id: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)))
  }

  const remove = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

  const agentStatusText =
    agent.status === 'connected'
      ? `Desktop agent connected${agent.lastKill ? ` — last block: ${agent.lastKill}` : ''}`
      : agent.status === 'connecting'
        ? 'Looking for desktop agent…'
        : 'Desktop agent not running — apps will not be blocked'

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-7">
        <h2 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Blocked distractions
        </h2>
        <p className="mt-1 text-[14px] text-[color:var(--color-ink-muted)]">
          These sites and apps will be unreachable during focus sessions.
        </p>
      </header>

      {/* status banner */}
      <div
        className={`mb-3 flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px] ${
          blockingNow
            ? 'border-[color:var(--color-success)]/25 bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]'
            : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {blockingNow && (
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-success)] opacity-60" />
          )}
          <span
            className={`relative h-2 w-2 rounded-full ${
              blockingNow ? 'bg-[color:var(--color-success)]' : 'bg-[color:var(--color-line-strong)]'
            }`}
          />
        </span>
        <span className="flex-1">
          {blockingNow ? (
            <>
              Blocking active — <span className="font-medium">{activeUrls}</span>{' '}
              {activeUrls === 1 ? 'site' : 'sites'},{' '}
              <span className="font-medium">{activeApps}</span>{' '}
              {activeApps === 1 ? 'app' : 'apps'}
            </>
          ) : (
            'Blocking activates during focus sessions'
          )}
        </span>
        <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
          {activeCount}/{items.length}
        </span>
      </div>

      {/* URL blocking status: only show when relevant */}
      {urlNeedsAdmin && (
        <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[12.5px] text-amber-700 dark:text-amber-300">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-medium">URL blocking needs admin</p>
            <p className="mt-0.5 text-[12px] opacity-80">
              DNS blocking requires elevation. Stop the agent and relaunch the terminal as administrator
              (right-click PowerShell → &quot;Run as administrator&quot;), then{' '}
              <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[11px]">cargo run</code> again.
              App blocking continues to work as-is.
            </p>
          </div>
        </div>
      )}

      {urlBlockingError && (
        <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[12.5px] text-amber-700 dark:text-amber-300">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-medium">URL blocking unavailable</p>
            <p className="mt-0.5 text-[12px] opacity-80">{urlBlockingError}</p>
          </div>
        </div>
      )}

      {/* agent status */}
      {activeApps > 0 && (
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-[12.5px] ${
            agent.status === 'connected'
              ? 'border-sky-500/25 bg-sky-500/5 text-sky-700 dark:text-sky-300'
              : agent.status === 'connecting'
                ? 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              agent.status === 'connected'
                ? 'bg-sky-500'
                : agent.status === 'connecting'
                  ? 'bg-[color:var(--color-line-strong)]'
                  : 'bg-amber-500'
            }`}
          />
          <span className="flex-1">{agentStatusText}</span>
          {agent.status === 'disconnected' && (
            <span className="font-mono text-[11px] opacity-70">
              waiting on 127.0.0.1:7777
            </span>
          )}
        </div>
      )}
      {activeApps === 0 && <div className="mb-6" />}

      {/* add input */}
      <fieldset
        disabled={strictLocked}
        className="mb-5 flex gap-2 disabled:opacity-50"
        title={strictLocked ? 'Locked by strict mode' : undefined}
      >
        <div className="flex gap-0.5 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-0.5">
          {(['url', 'app'] as BlockKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDraftKind(k)}
              className={`rounded-md px-3 py-2 text-[12.5px] font-medium transition disabled:cursor-not-allowed ${
                draftKind === k
                  ? 'bg-[color:var(--color-ink)] text-white'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {draftKind === 'url' ? (
          <>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder={KIND_PLACEHOLDER[draftKind]}
                className="w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-2.5 pl-10 pr-3 font-mono text-[13.5px] text-[color:var(--color-ink)] placeholder:font-sans placeholder:text-[color:var(--color-ink-faint)] focus:border-[color:var(--color-accent)]/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/15 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="button"
              onClick={add}
              className="rounded-lg bg-[color:var(--color-ink)] px-5 text-[13px] font-medium text-white transition hover:bg-[color:var(--color-ink-soft)] active:scale-[0.98] disabled:cursor-not-allowed"
            >
              Add
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={agent.status !== 'connected'}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-4 py-2.5 text-[13px] font-medium text-[color:var(--color-ink-muted)] transition hover:border-[color:var(--color-accent)]/40 hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
            title={agent.status !== 'connected' ? 'Desktop agent not running' : undefined}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 17.5h7M17.5 14v7" />
            </svg>
            {agent.status === 'connected'
              ? 'Pick from your installed apps'
              : 'Start the desktop agent to pick apps'}
          </button>
        )}
      </fieldset>

      {/* list */}
      <ul className="overflow-hidden rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        {items.length === 0 && (
          <li className="px-5 py-12 text-center">
            <p className="text-[14px] text-[color:var(--color-ink-muted)]">List is empty.</p>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-faint)]">
              Add your first distraction above.
            </p>
          </li>
        )}
        {items.map((item, idx) => (
          <li
            key={item.id}
            className={`group flex items-center gap-3.5 px-4 py-3 transition hover:bg-[color:var(--color-surface-2)]/60 ${
              idx !== 0 ? 'border-t border-[color:var(--color-line)]' : ''
            }`}
          >
            <button
              type="button"
              role="switch"
              aria-checked={item.enabled}
              onClick={() => toggle(item.id)}
              disabled={strictLocked}
              title={strictLocked ? 'Locked by strict mode' : undefined}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                item.enabled
                  ? 'bg-[color:var(--color-accent)]'
                  : 'bg-[color:var(--color-line-strong)]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  item.enabled ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
            <span
              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${
                item.kind === 'app'
                  ? 'border-violet-500/30 bg-violet-500/5 text-violet-600 dark:text-violet-300'
                  : 'border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-300'
              }`}
            >
              {item.kind === 'app' ? 'APP' : 'URL'}
            </span>
            <span
              className={`flex-1 truncate font-mono text-[13.5px] tracking-tight transition ${
                item.enabled
                  ? 'text-[color:var(--color-ink)]'
                  : 'text-[color:var(--color-ink-faint)] line-through'
              }`}
            >
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              disabled={strictLocked}
              title={strictLocked ? 'Locked by strict mode' : undefined}
              className="rounded-md p-1.5 text-[color:var(--color-ink-faint)] opacity-0 transition hover:bg-[color:var(--color-surface-3)] hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 disabled:hidden"
              aria-label={`Remove ${item.label}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {pickerOpen && (
        <AppPicker
          alreadyBlocked={blockedAppSet}
          onCancel={() => setPickerOpen(false)}
          onConfirm={addAppsFromPicker}
        />
      )}
    </div>
  )
}
