import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearTokens,
  hasStoredSession,
  loadCachedUserProfile,
  saveCachedUserProfile,
  saveTokens,
} from '../lib/authStorage'
import {
  fetchMe,
  getGoogleSignInUrl,
  isNetworkError,
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
  /** Profile restored from cache because the API could not be reached. */
  sessionOffline: boolean
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

const OFFLINE_PLACEHOLDER: AuthUser = {
  id: 'offline',
  email: '',
  name: 'Signed in (offline)',
  avatar_url: null,
}

function restoreOfflineSession(): AuthUser {
  return loadCachedUserProfile() ?? OFFLINE_PLACEHOLDER
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [sessionOffline, setSessionOffline] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (hasGuestFlag()) {
      setIsGuest(true)
      setSessionOffline(false)
      setUser(GUEST_USER)
      return
    }
    if (!hasStoredSession()) {
      setIsGuest(false)
      setSessionOffline(false)
      setUser(null)
      return
    }
    try {
      const profile = await fetchMe()
      saveCachedUserProfile(profile)
      setIsGuest(false)
      setSessionOffline(false)
      setUser(profile)
    } catch (err) {
      if (isNetworkError(err)) {
        setIsGuest(false)
        setSessionOffline(true)
        setUser(restoreOfflineSession())
        return
      }
      clearTokens()
      setIsGuest(false)
      setSessionOffline(false)
      setUser(null)
      throw err
    }
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
          saveCachedUserProfile(profile)
          setIsGuest(false)
          setSessionOffline(false)
          setUser(profile)
        }
      } catch (err) {
        if (!cancelled) {
          if (isNetworkError(err)) {
            setIsGuest(false)
            setSessionOffline(true)
            setUser(restoreOfflineSession())
          } else {
            clearTokens()
            setIsGuest(false)
            setSessionOffline(false)
            setUser(null)
          }
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

  useEffect(() => {
    if (!sessionOffline) return
    const retry = () => {
      void loadUser().catch(() => {
        // stay on cached session
      })
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [sessionOffline, loadUser])

  const signInWithGoogle = useCallback(() => {
    setGuestFlag(false)
    window.location.href = getGoogleSignInUrl()
  }, [])

  const signInWithPassword = useCallback(
    async (input: { email: string; password: string }) => {
      const res = await loginWithPassword(input)
      setGuestFlag(false)
      saveTokens(res)
      saveCachedUserProfile(res.user)
      setIsGuest(false)
      setSessionOffline(false)
      setUser(res.user)
    },
    [],
  )

  const signUpWithPassword = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const res = await registerWithPassword(input)
      setGuestFlag(false)
      saveTokens(res)
      saveCachedUserProfile(res.user)
      setIsGuest(false)
      setSessionOffline(false)
      setUser(res.user)
    },
    [],
  )

  const continueAsGuest = useCallback(() => {
    clearTokens()
    setGuestFlag(true)
    setIsGuest(true)
    setSessionOffline(false)
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
      setSessionOffline(false)
      setUser(null)
      return
    }
    try {
      await logoutApi()
    } finally {
      clearTokens()
      setSessionOffline(false)
      setUser(null)
    }
  }, [isGuest])

  const value = useMemo(
    () => ({
      user,
      isGuest,
      sessionOffline,
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
      sessionOffline,
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
