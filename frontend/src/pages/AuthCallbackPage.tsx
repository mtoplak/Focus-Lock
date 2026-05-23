import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { AuthTokens } from '../types/auth'

export function AuthCallbackPage() {
  const { completeLoginFromTokens } = useAuth()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) {
      setError(
        searchParams.get('error_description') ??
          'Google sign-in was cancelled or failed.',
      )
      return
    }

    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const expiresIn = searchParams.get('expires_in')

    if (!accessToken || !refreshToken || !expiresIn) {
      setError('Sign-in response was incomplete. Please try again.')
      return
    }

    const tokens: AuthTokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: searchParams.get('token_type') ?? 'Bearer',
      expires_in: Number.parseInt(expiresIn, 10),
    }

    void completeLoginFromTokens(tokens)
      .then(() => setDone(true))
      .catch(() => setError('Could not finish sign-in. Please try again.'))
  }, [searchParams, completeLoginFromTokens])

  if (done) {
    return <Navigate to="/" replace />
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[color:var(--color-canvas)] px-6">
        <div className="max-w-sm rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 text-center">
          <p className="text-sm font-medium text-[color:var(--color-ink)]">
            Sign-in failed
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
            {error}
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-sm font-medium text-[color:var(--color-accent)] hover:text-[color:var(--color-accent-strong)]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[color:var(--color-canvas)] text-[color:var(--color-ink-muted)]">
      <p className="text-sm">Completing sign-in…</p>
    </div>
  )
}
