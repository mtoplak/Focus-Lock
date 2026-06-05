import { useState } from 'react'
import { AMBIENT_TRACKS, type UseAmbientResult } from '../hooks/useAmbient'

interface AmbientPlayerProps {
  ambient: UseAmbientResult
}

export function AmbientPlayer({ ambient }: AmbientPlayerProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { state, setTrack, setVolume, togglePlay, fileError } = ambient

  const currentTrack = AMBIENT_TRACKS.find((t) => t.id === state.track) ?? AMBIENT_TRACKS[0]
  const canPlay = state.track !== 'off'

  return (
    <div className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-2.5">
      <div className="mb-2 flex items-center justify-between px-1 text-[10.5px] font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)]">
        <span>Ambient</span>
        {fileError && (
          <span role="status" className="text-amber-600 dark:text-amber-400" title="Audio file not found">
            file missing
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!canPlay}
          aria-label={state.playing ? 'Pause ambient' : 'Play ambient'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-ink)] text-white transition hover:bg-[color:var(--color-ink-soft)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {state.playing ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 5l12 7-12 7V5z" />
            </svg>
          )}
        </button>

        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            aria-label={`Ambient track: ${currentTrack.label}. Change track`}
            className="flex w-full items-center justify-between gap-1 rounded-md px-2 py-1 text-left text-[12px] font-medium text-[color:var(--color-ink)] transition hover:bg-[color:var(--color-surface-2)]"
          >
            <span className="truncate">{currentTrack.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {pickerOpen && (
            <>
              <button
                type="button"
                aria-label="Close picker"
                onClick={() => setPickerOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <ul className="absolute bottom-full left-0 z-20 mb-1 w-full min-w-[160px] overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] shadow-lg">
                {AMBIENT_TRACKS.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTrack(t.id)
                        setPickerOpen(false)
                      }}
                      aria-current={t.id === state.track ? 'true' : undefined}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[12.5px] transition ${
                        t.id === state.track
                          ? 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]'
                          : 'text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-surface-2)]/60 hover:text-[color:var(--color-ink)]'
                      }`}
                    >
                      <span>{t.label}</span>
                      {t.kind === 'file' && (
                        <span className="font-mono text-[9.5px] uppercase tracking-wider text-[color:var(--color-ink-faint)]">
                          mp3
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={state.volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        disabled={!canPlay}
        aria-label="Ambient volume"
        className="mt-2 w-full accent-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  )
}
