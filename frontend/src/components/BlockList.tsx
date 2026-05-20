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
      <header className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Blokirane distrakcije</h2>
        <p className="mt-1 text-sm text-slate-400">
          Med fokus sejami bodo te strani in aplikacije nedosegljive.
        </p>
      </header>

      <div
        className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
          blockingNow
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : 'border-slate-800 bg-slate-900/60 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              blockingNow ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />
          {blockingNow
            ? `Aktivno blokiranje — ${activeCount} ${activeCount === 1 ? 'distrakcija' : 'distrakcij'}`
            : 'Blokiranje se aktivira med fokus sejo'}
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="npr. youtube.com"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-indigo-500 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-400"
        >
          Dodaj
        </button>
      </div>

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        {items.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-500">
            Seznam je prazen. Dodaj prvo distrakcijo zgoraj.
          </li>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              role="switch"
              aria-checked={item.enabled}
              onClick={() => toggle(item.id)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                item.enabled ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                  item.enabled ? 'left-4' : 'left-0.5'
                }`}
              />
            </button>
            <span
              className={`flex-1 truncate font-mono text-sm ${
                item.enabled ? 'text-slate-100' : 'text-slate-500 line-through'
              }`}
            >
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-rose-300"
              aria-label={`Odstrani ${item.label}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
