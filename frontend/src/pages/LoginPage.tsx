import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

type Tab = 'signin' | 'signup'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function LoginPage() {
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    continueAsGuest,
  } = useAuth()

  const [tab, setTab] = useState<Tab>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      if (tab === 'signin') {
        await signInWithPassword({ email, password })
      } else {
        await signUpWithPassword({
          email,
          password,
          name: name.trim() || undefined,
        })
      }
      // Redirect is handled by the Navigate above once user is set in context.
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setError(null)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[color:var(--color-canvas)] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[color:var(--color-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--color-ink)]">
            Focus Lock
          </h1>
          <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
            {tab === 'signin'
              ? 'Welcome back. Sign in to continue.'
              : 'Create an account to sync your focus sessions.'}
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex gap-1 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] p-1">
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                tab === 'signin'
                  ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                tab === 'signup'
                  ? 'bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {tab === 'signup' && (
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-[color:var(--color-ink-muted)]">
                  Name <span className="text-[color:var(--color-ink-faint)]">(optional)</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  className="rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3 py-2 text-[14px] text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-accent)]"
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[color:var(--color-ink-muted)]">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className="rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3 py-2 text-[14px] text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[color:var(--color-ink-muted)]">
                Password
                {tab === 'signup' && (
                  <span id="password-hint" className="ml-1 text-[color:var(--color-ink-faint)]">
                    (min 8 characters)
                  </span>
                )}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={tab === 'signup' ? 8 : undefined}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  [error ? 'login-error' : null, tab === 'signup' ? 'password-hint' : null]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                className="rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-canvas)] px-3 py-2 text-[14px] text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-accent)]"
              />
            </label>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12.5px] text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 cursor-pointer rounded-md bg-[color:var(--color-ink)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[color:var(--color-ink-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? tab === 'signin'
                  ? 'Signing in…'
                  : 'Creating account…'
                : tab === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[color:var(--color-ink-faint)]">
            <span className="h-px flex-1 bg-[color:var(--color-line)]" />
            or
            <span className="h-px flex-1 bg-[color:var(--color-line)]" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading || submitting}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2.5 text-[14px] font-medium text-[color:var(--color-ink)] transition hover:bg-[color:var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={continueAsGuest}
            disabled={loading || submitting}
            className="mt-2 w-full cursor-pointer rounded-md px-4 py-2 text-[13px] font-medium text-[color:var(--color-ink-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue as guest
          </button>

          <p className="mt-4 text-center text-[11.5px] text-[color:var(--color-ink-faint)]">
            Guest mode keeps everything on this device — nothing syncs to the cloud.
          </p>
        </div>
      </div>
    </div>
  )
}
