import type { AuthTokens } from '../types/auth'

const ACCESS_KEY = 'fl.access_token'
const REFRESH_KEY = 'fl.refresh_token'
const EXPIRES_AT_KEY = 'fl.expires_at'

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getAccessTokenExpiryMs(): number | null {
  const raw = localStorage.getItem(EXPIRES_AT_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  localStorage.setItem(
    EXPIRES_AT_KEY,
    String(Date.now() + tokens.expires_in * 1000),
  )
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
}

export function hasStoredSession(): boolean {
  return Boolean(getStoredRefreshToken())
}

export function isAccessTokenExpired(skewMs = 60_000): boolean {
  const expiresAt = getAccessTokenExpiryMs()
  if (!expiresAt) return true
  return Date.now() >= expiresAt - skewMs
}
