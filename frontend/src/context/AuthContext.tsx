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
import {
  fetchMe,
  getGoogleSignInUrl,
  loginWithPassword,
  logoutApi,
  registerWithPassword,
} from '../lib/api'
import type { AuthTokens, AuthUser } from '../types/auth'

const GUEST_KEY = 'fl.guest'

const GUEST_USER: AuthUser = {
  id: 'guest',
  email: '',
  name: 'Guest',
  avatar_url: null,
}

type AuthContextValue = {
  user: AuthUser | null
  /** True when the current session is a local-only guest (no backend account). */
  isGuest: boolean
  loading: boolean
  signInWithGoogle: () => void
  signInWithPassword: (input: { email: string; password: string }) => Promise<void>
  signUpWithPassword: (input: {
    email: string
    password: string
    name?: string
  }) => Promise<void>
  continueAsGuest: () => void
  logout: () => Promise<void>
  completeLoginFromTokens: (tokens: AuthTokens) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function hasGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

function setGuestFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(GUEST_KEY, '1')
    else localStorage.removeItem(GUEST_KEY)
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (hasGuestFlag()) {
      setIsGuest(true)
      setUser(GUEST_USER)
      return
    }
    if (!hasStoredSession()) {
      setIsGuest(false)
      setUser(null)
      return
    }
    const profile = await fetchMe()
    setIsGuest(false)
    setUser(profile)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (hasGuestFlag()) {
        if (!cancelled) {
          setIsGuest(true)
          setUser(GUEST_USER)
          setLoading(false)
        }
        return
      }
      if (!hasStoredSession()) {
        if (!cancelled) {
          setIsGuest(false)
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const profile = await fetchMe()
        if (!cancelled) {
          setIsGuest(false)
          setUser(profile)
        }
      } catch {
        clearTokens()
        if (!cancelled) {
          setIsGuest(false)
          setUser(null)
        }
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
    setGuestFlag(false)
    window.location.href = getGoogleSignInUrl()
  }, [])

  const signInWithPassword = useCallback(
    async (input: { email: string; password: string }) => {
      const res = await loginWithPassword(input)
      setGuestFlag(false)
      saveTokens(res)
      setIsGuest(false)
      setUser(res.user)
    },
    [],
  )

  const signUpWithPassword = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const res = await registerWithPassword(input)
      setGuestFlag(false)
      saveTokens(res)
      setIsGuest(false)
      setUser(res.user)
    },
    [],
  )

  const continueAsGuest = useCallback(() => {
    clearTokens()
    setGuestFlag(true)
    setIsGuest(true)
    setUser(GUEST_USER)
  }, [])

  const completeLoginFromTokens = useCallback(
    async (tokens: AuthTokens) => {
      setGuestFlag(false)
      saveTokens(tokens)
      await loadUser()
    },
    [loadUser],
  )

  const logout = useCallback(async () => {
    if (isGuest) {
      setGuestFlag(false)
      setIsGuest(false)
      setUser(null)
      return
    }
    try {
      await logoutApi()
    } finally {
      clearTokens()
      setUser(null)
    }
  }, [isGuest])

  const value = useMemo(
    () => ({
      user,
      isGuest,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      continueAsGuest,
      logout,
      completeLoginFromTokens,
    }),
    [
      user,
      isGuest,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      continueAsGuest,
      logout,
      completeLoginFromTokens,
    ],
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
