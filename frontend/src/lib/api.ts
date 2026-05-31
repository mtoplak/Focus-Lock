import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { API_URL } from './config'
import {
  clearTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  isAccessTokenExpired,
  saveTokens,
} from './authStorage'
import type { AuthTokens, AuthUser } from '../types/auth'

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0
  const body = error.response?.data as
    | { error?: string; error_description?: string }
    | undefined

  return new ApiError(
    status,
    body?.error ?? 'request_failed',
    body?.error_description ?? error.message ?? 'Request failed',
  )
}

let refreshPromise: Promise<AuthTokens> | null = null

export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    throw new ApiError(401, 'unauthorized', 'No refresh token')
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<AuthTokens>(`${API_URL}/api/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .then((res) => {
        saveTokens(res.data)
        return res.data
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function getValidAccessToken(): Promise<string | null> {
  const access = getStoredAccessToken()
  if (!access) return null

  if (!isAccessTokenExpired()) {
    return access
  }

  try {
    const tokens = await refreshTokens()
    return tokens.access_token
  } catch {
    clearTokens()
    return null
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(async (config) => {
  const token = await getValidAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined

    if (
      error.response?.status === 401 &&
      config &&
      !config._retry &&
      getStoredRefreshToken()
    ) {
      config._retry = true
      try {
        const tokens = await refreshTokens()
        config.headers.Authorization = `Bearer ${tokens.access_token}`
        return apiClient(config)
      } catch {
        clearTokens()
      }
    }

    return Promise.reject(error)
  },
)

export async function fetchMe(): Promise<AuthUser> {
  try {
    const { data } = await apiClient.get<{ user: AuthUser }>('/api/auth/me')
    return data.user
  } catch (error) {
    if (error instanceof AxiosError) {
      throw toApiError(error)
    }
    throw error
  }
}

export async function logoutApi(): Promise<void> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return

  await axios.post(`${API_URL}/api/auth/logout`, {
    refresh_token: refreshToken,
  })
}

export function getGoogleSignInUrl(): string {
  return `${API_URL}/api/auth/google`
}

type PasswordAuthResponse = {
  user: AuthUser
} & AuthTokens

async function postAuth(
  path: '/api/auth/login' | '/api/auth/register',
  body: Record<string, unknown>,
): Promise<PasswordAuthResponse> {
  try {
    const { data } = await axios.post<PasswordAuthResponse>(
      `${API_URL}${path}`,
      body,
    )
    return data
  } catch (error) {
    if (error instanceof AxiosError) throw toApiError(error)
    throw error
  }
}

export function registerWithPassword(input: {
  email: string
  password: string
  name?: string
}): Promise<PasswordAuthResponse> {
  return postAuth('/api/auth/register', input)
}

export function loginWithPassword(input: {
  email: string
  password: string
}): Promise<PasswordAuthResponse> {
  return postAuth('/api/auth/login', input)
}
