import type { Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

interface SettingsViewProps {
  settings: Settings
  onChange: (settings: Settings) => void
}

export function SettingsView({ settings, onChange }: SettingsViewProps) {
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Nastavitve</h2>
        <p className="mt-1 text-sm text-slate-400">
          Prilagodi seje svojemu ritmu in delovnemu slogu.
        </p>
      </header>

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="mb-4 text-base font-medium text-slate-100">Trajanje</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Fokus (min)"
            value={settings.focusMinutes}
            min={1}
            max={120}
            onChange={(v) => update('focusMinutes', v)}
          />
          <NumberField
            label="Kratek odmor (min)"
            value={settings.shortBreakMinutes}
            min={1}
            max={60}
            onChange={(v) => update('shortBreakMinutes', v)}
          />
          <NumberField
            label="Dolg odmor (min)"
            value={settings.longBreakMinutes}
            min={1}
            max={60}
            onChange={(v) => update('longBreakMinutes', v)}
          />
        </div>
        <div className="mt-4">
          <NumberField
            label="Število sej do dolgega odmora"
            value={settings.sessionsUntilLongBreak}
            min={2}
            max={10}
            onChange={(v) => update('sessionsUntilLongBreak', v)}
          />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="mb-4 text-base font-medium text-slate-100">Avtomatizacija</h3>
        <div className="space-y-4">
          <ToggleRow
            label="Samodejno začni odmore"
            description="Po zaključku fokus seje takoj zaženi odmor."
            checked={settings.autoStartBreaks}
            onChange={(v) => update('autoStartBreaks', v)}
          />
          <ToggleRow
            label="Samodejno začni fokus"
            description="Po odmoru takoj nadaljuj z naslednjo fokus sejo."
            checked={settings.autoStartFocus}
            onChange={(v) => update('autoStartFocus', v)}
          />
          <ToggleRow
            label="Zvočno opozorilo"
            description="Zaigraj tih signal ob koncu seje."
            checked={settings.soundEnabled}
            onChange={(v) => update('soundEnabled', v)}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SETTINGS)}
          className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
        >
          Ponastavi na privzeto
        </button>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
        }}
        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-100 tabular-nums focus:border-indigo-500/50 focus:outline-none"
      />
    </label>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-100">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-indigo-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}
