import { useId } from 'react'
import type { Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { ensureNotificationPermission, notificationsSupported } from '../lib/notify'
import { ensurePushSubscription } from '../lib/push'
import { voiceControlSupported } from '../lib/voice/speechSupport'
import { VoiceCommandList } from './VoiceCommandList'

interface SettingsViewProps {
  settings: Settings
  onChange: (settings: Settings) => void
  strictLocked?: boolean
}

export function SettingsView({ settings, onChange, strictLocked = false }: SettingsViewProps) {
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const supportsNotifications = notificationsSupported()
  const supportsVoice = voiceControlSupported()
  const notificationsBlocked =
    supportsNotifications && typeof Notification !== 'undefined' && Notification.permission === 'denied'

  const handleNotificationsToggle = async (next: boolean) => {
    if (!next) {
      update('notificationsEnabled', false)
      return
    }
    if (!supportsNotifications) return
    const permission = await ensureNotificationPermission()
    const granted = permission === 'granted'
    update('notificationsEnabled', granted)
    // Register for web push so end-of-interval notifications arrive even with
    // no tab open. Best-effort: silently no-ops when signed out / unsupported.
    if (granted) void ensurePushSubscription()
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8">
        <h2 className="text-[24px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Settings
        </h2>
        <p className="mt-1 text-[14px] text-[color:var(--color-ink-muted)]">
          Tailor sessions to your workflow.
        </p>
      </header>

      <fieldset disabled={strictLocked} className="disabled:opacity-60">
      <section className="mb-5 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <h3 className="mb-5 text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Duration
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stepper
            label="Focus"
            value={settings.focusMinutes}
            min={1}
            max={120}
            step={5}
            onChange={(v) => update('focusMinutes', v)}
          />
          <Stepper
            label="Short break"
            value={settings.shortBreakMinutes}
            min={1}
            max={60}
            step={1}
            onChange={(v) => update('shortBreakMinutes', v)}
          />
          <Stepper
            label="Long break"
            value={settings.longBreakMinutes}
            min={1}
            max={60}
            step={5}
            onChange={(v) => update('longBreakMinutes', v)}
          />
        </div>
        <div className="mt-5 border-t border-[color:var(--color-line)] pt-5">
          <Stepper
            label="Sessions until long break"
            value={settings.sessionsUntilLongBreak}
            min={2}
            max={10}
            step={1}
            onChange={(v) => update('sessionsUntilLongBreak', v)}
            wide
          />
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
        <h3 className="mb-3 text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          Automation
        </h3>
        <div className="divide-y divide-[color:var(--color-line)]">
          <ToggleRow
            label="Auto-start breaks"
            description="Start a break as soon as a focus session ends."
            checked={settings.autoStartBreaks}
            onChange={(v) => update('autoStartBreaks', v)}
          />
          <ToggleRow
            label="Auto-start focus"
            description="Continue to the next focus session after a break."
            checked={settings.autoStartFocus}
            onChange={(v) => update('autoStartFocus', v)}
          />
          <ToggleRow
            label="Sound alert"
            description="Play a soft signal at session end."
            checked={settings.soundEnabled}
            onChange={(v) => update('soundEnabled', v)}
          />
          <ToggleRow
            label="Voice control"
            description={
              supportsVoice
                ? 'Push-to-talk from the sidebar or top bar — timer, navigation, and modes.'
                : 'Not supported in this browser (use Chrome or Edge).'
            }
            checked={settings.voiceControlEnabled && supportsVoice}
            disabled={!supportsVoice}
            onChange={(v) => update('voiceControlEnabled', v)}
          />
          <ToggleRow
            label="Notifications"
            description={
              !supportsNotifications
                ? 'Not supported on this device.'
                : notificationsBlocked
                  ? 'Blocked — enable in your browser site settings.'
                  : 'Notify when a session starts and finishes.'
            }
            checked={settings.notificationsEnabled && !notificationsBlocked}
            disabled={!supportsNotifications || notificationsBlocked}
            onChange={(v) => {
              void handleNotificationsToggle(v)
            }}
          />
          <ToggleRow
            label="Strict mode"
            description="During a focus session you can't pause, reset, skip, change mode, edit the block list, or change settings. Use it when you want blocking to be unavoidable."
            checked={settings.strictMode}
            onChange={(v) => update('strictMode', v)}
          />
        </div>
      </section>

      {supportsVoice && (
        <section className="mb-6 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
            Voice commands
          </h3>
          <p className="mt-1 mb-4 text-[12.5px] text-[color:var(--color-ink-muted)]">
            {settings.voiceControlEnabled
              ? 'Reference for phrases the app recognizes.'
              : 'Enable voice control above to use these commands.'}
          </p>
          <VoiceCommandList />
        </section>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-[color:var(--color-ink-faint)]">
          {strictLocked ? 'Locked while a strict-mode focus session is running.' : 'Saved automatically.'}
        </p>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SETTINGS)}
          className="rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-1.5 text-[12.5px] text-[color:var(--color-ink-muted)] transition hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset to defaults
        </button>
      </div>
      </fieldset>
    </div>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  wide,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  wide?: boolean
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const dec = () => onChange(clamp(value - step))
  const inc = () => onChange(clamp(value + step))
  const inputId = useId()

  return (
    <div className={wide ? 'flex items-center justify-between gap-4' : ''}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[11.5px] font-medium tracking-wide text-[color:var(--color-ink-muted)]"
      >
        {label}
      </label>
      <div className={`inline-flex items-center rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] ${wide ? '' : ''}`}>
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className="flex h-8 w-7 cursor-pointer items-center justify-center text-[color:var(--color-ink-muted)] transition hover:text-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <input
          id={inputId}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (Number.isFinite(next)) onChange(clamp(next))
          }}
          className="w-9 bg-transparent py-1.5 text-center font-mono text-[14px] font-medium tabular-nums text-[color:var(--color-ink)] focus:outline-none"
        />
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          className="flex h-8 w-7 cursor-pointer items-center justify-center text-[color:var(--color-ink-muted)] transition hover:text-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  const labelId = useId()
  const descId = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-2 last:pb-2">
      <div className="flex-1">
        <div id={labelId} className="text-[14px] font-medium text-[color:var(--color-ink)]">{label}</div>
        <div id={descId} className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-muted)]">
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked
            ? 'bg-[color:var(--color-accent)]'
            : 'bg-[color:var(--color-line-strong)]'
        } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}
