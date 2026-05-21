import { useState } from 'react'
import type { BlockedItem, TimerMode } from '../types'

interface BlockListProps {
  items: BlockedItem[]
  onChange: (items: BlockedItem[]) => void
  mode: TimerMode
  isRunning: boolean
}

export function BlockList({ items, onChange, mode, isRunning }: BlockListProps) {
  const [draft, setDraft] = useState('')

  const activeCount = items.filter((i) => i.enabled).length
  const blockingNow = mode === 'focus' && isRunning && activeCount > 0

  const add = () => {
    const trimmed = draft.trim().toLowerCase()
    if (!trimmed) return
    if (items.some((i) => i.label === trimmed)) {
      setDraft('')
      return
    }
    onChange([
      ...items,
      { id: crypto.randomUUID(), label: trimmed, enabled: true },
    ])
    setDraft('')
  }

  const toggle = (id: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)))
  }

  const remove = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
  }

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
        className={`mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px] ${
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
              Blocking active —{' '}
              <span className="font-medium">{activeCount}</span>{' '}
              {activeCount === 1 ? 'distraction' : 'distractions'}
            </>
          ) : (
            'Blocking activates during focus sessions'
          )}
        </span>
        <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
          {activeCount}/{items.length}
        </span>
      </div>

      {/* add input */}
      <div className="mb-5 flex gap-2">
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
            placeholder="e.g. youtube.com"
            className="w-full rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-2.5 pl-10 pr-3 font-mono text-[13.5px] text-[color:var(--color-ink)] placeholder:font-sans placeholder:text-[color:var(--color-ink-faint)] focus:border-[color:var(--color-accent)]/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/15"
          />
        </div>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-[color:var(--color-ink)] px-5 text-[13px] font-medium text-white transition hover:bg-[color:var(--color-ink-soft)] active:scale-[0.98]"
        >
          Add
        </button>
      </div>

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
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                item.enabled
                  ? 'bg-[color:var(--color-accent)]'
                  : 'bg-[color:var(--color-line-strong)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  item.enabled ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
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
              className="rounded-md p-1.5 text-[color:var(--color-ink-faint)] opacity-0 transition hover:bg-[color:var(--color-surface-3)] hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Remove ${item.label}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
