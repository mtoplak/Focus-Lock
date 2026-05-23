import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  const { user, loading, signInWithGoogle } = useAuth()

  if (!loading && user) {
    return <Navigate to="/" replace />
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
            Sign in to sync your focus sessions and settings.
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-sm font-medium text-[color:var(--color-ink)] transition hover:bg-[color:var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="mt-4 text-center text-xs text-[color:var(--color-ink-faint)]">
            New here? Google creates your account on first sign-in.
          </p>
        </div>
      </div>
    </div>
  )
}
