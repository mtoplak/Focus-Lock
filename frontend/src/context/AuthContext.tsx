import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearTokens, hasStoredSession, saveTokens } from '../lib/authStorage'
import { fetchMe, getGoogleSignInUrl, logoutApi } from '../lib/api'
import type { AuthTokens, AuthUser } from '../types/auth'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signInWithGoogle: () => void
  logout: () => Promise<void>
  completeLoginFromTokens: (tokens: AuthTokens) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!hasStoredSession()) {
      setUser(null)
      return
    }
    const profile = await fetchMe()
    setUser(profile)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!hasStoredSession()) {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const profile = await fetchMe()
        if (!cancelled) setUser(profile)
      } catch {
        clearTokens()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [loadUser])

  const signInWithGoogle = useCallback(() => {
    window.location.href = getGoogleSignInUrl()
  }, [])

  const completeLoginFromTokens = useCallback(
    async (tokens: AuthTokens) => {
      saveTokens(tokens)
      await loadUser()
    },
    [loadUser],
  )

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      clearTokens()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      logout,
      completeLoginFromTokens,
    }),
    [user, loading, signInWithGoogle, logout, completeLoginFromTokens],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export function useAuthOptional() {
  return useContext(AuthContext)
}
