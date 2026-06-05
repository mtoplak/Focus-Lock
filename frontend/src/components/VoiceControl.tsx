import type { VoiceControlState } from '../hooks/useVoiceControl'

interface VoiceControlProps {
  voice: VoiceControlState
  /** `sidebar` — desktop nav column; `toolbar` — mobile header chip. */
  placement?: 'sidebar' | 'toolbar'
}

export function VoiceControl({ voice, placement = 'sidebar' }: VoiceControlProps) {
  if (!voice.enabled) return null

  const statusLabel =
    voice.status === 'listening'
      ? 'Listening…'
      : voice.status === 'processing'
        ? 'Processing…'
        : voice.lastMatch
          ? `Done: ${voice.lastMatch.label}`
          : voice.errorMessage
            ? voice.errorMessage
            : 'Tap mic and say a command'

  const isToolbar = placement === 'toolbar'

  const micButton = (
    <button
      type="button"
      onClick={voice.toggleListening}
      aria-pressed={voice.listening}
      aria-label={
        voice.listening
          ? `Stop listening. ${statusLabel}`
          : `Start voice command. ${statusLabel}`
      }
      title={statusLabel}
      className={`flex shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)] ${
        isToolbar ? 'h-9 w-9' : 'h-11 w-11'
      } ${
        voice.listening
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent-strong)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)]'
      }`}
    >
        {voice.listening ? (
          <span className="relative flex h-3 w-3">
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-accent)] opacity-50" />
            <span className="relative h-3 w-3 rounded-full bg-[color:var(--color-accent)]" />
          </span>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
            <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
            <path d="M12 19v3" />
          </svg>
        )}
    </button>
  )

  const statusClass = voice.errorMessage
    ? 'text-amber-700 dark:text-amber-300'
    : voice.lastMatch
      ? 'text-[color:var(--color-success-strong)]'
      : 'text-[color:var(--color-ink-muted)]'

  if (isToolbar) {
    return (
      <div className="flex max-w-[9.5rem] items-center gap-2 sm:max-w-[11rem]">
        {micButton}
        <p role="status" className={`min-w-0 truncate text-[11px] leading-tight ${statusClass}`}>
          {statusLabel}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-auto flex w-full flex-col gap-3 border-t border-[color:var(--color-line)] pt-5">
      <p className="px-1 text-[11px] font-medium tracking-wide text-[color:var(--color-ink-faint)] uppercase">
        Voice
      </p>
      <div className="flex items-start gap-3 px-1">
        {micButton}
        <div className="min-w-0 flex-1 pt-1.5">
          <p role="status" className={`text-[12.5px] leading-snug ${statusClass}`}>
            {statusLabel}
          </p>
          {voice.lastTranscript && voice.status !== 'listening' && (
            <p className="mt-1 truncate font-mono text-[10px] text-[color:var(--color-ink-faint)]">
              “{voice.lastTranscript.trim()}”
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--color-ink-faint)]">
            e.g. start, pause, open blocks
          </p>
        </div>
      </div>
    </div>
  )
}
