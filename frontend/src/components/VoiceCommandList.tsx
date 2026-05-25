import { getVoiceCommandReference } from '../lib/voice/commands'

const GROUPS = getVoiceCommandReference()

export function VoiceCommandList() {
  return (
    <div className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-4">
      <p className="text-[12.5px] leading-relaxed text-[color:var(--color-ink-muted)]">
        Tap the mic in the sidebar (desktop) or top bar (mobile), then say a phrase{' '}
        <span className="text-[color:var(--color-ink-soft)]">exactly</span> as listed (e.g.{' '}
        <span className="font-mono text-[11px] text-[color:var(--color-ink)]">open blocks</span>
        , not “please open blocks”).
      </p>

      <div className="mt-4 space-y-5">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="mb-2.5 text-[11px] font-semibold tracking-wide text-[color:var(--color-ink-faint)] uppercase">
              {group.title}
            </h4>
            <ul className="space-y-3">
              {group.commands.map((cmd) => (
                <li
                  key={cmd.id}
                  className="border-b border-[color:var(--color-line)]/80 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <span className="text-[13px] font-medium text-[color:var(--color-ink)]">
                      {cmd.action}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cmd.phrases.map((phrase) => (
                      <span
                        key={phrase}
                        className="rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 py-0.5 font-mono text-[11px] text-[color:var(--color-ink-soft)]"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
