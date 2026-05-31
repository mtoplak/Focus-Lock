import { AuthError } from '../auth/errors.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import {
  createPasswordUser,
  findUserByEmail,
} from '../repositories/userRepository.js'
import { issueTokensForUser, toPublicUser } from './sessionService.js'
import type { AuthTokens, PublicUser } from './sessionService.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 200
const MAX_NAME_LENGTH = 80

export type AuthResponse = { user: PublicUser; tokens: AuthTokens }

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function validateEmail(email: string): string {
  const normalized = normalizeEmail(email)
  if (!EMAIL_RE.test(normalized)) {
    throw new AuthError(
      'invalid_request',
      'Please enter a valid email address',
      400,
    )
  }
  return normalized
}

function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(
      'invalid_request',
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      400,
    )
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new AuthError(
      'invalid_request',
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
      400,
    )
  }
}

function validateName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AuthError(
      'invalid_request',
      `Name must be at most ${MAX_NAME_LENGTH} characters`,
      400,
    )
  }
  return trimmed
}

export async function registerWithPassword(input: {
  email: string
  password: string
  name?: string | null
}): Promise<AuthResponse> {
  const email = validateEmail(input.email)
  validatePassword(input.password)
  const name = validateName(input.name)

  const existing = await findUserByEmail(email)
  if (existing) {
    throw new AuthError(
      'email_taken',
      'An account with this email already exists',
      409,
    )
  }

  const passwordHash = await hashPassword(input.password)
  const user = await createPasswordUser({ email, name, passwordHash })
  const tokens = await issueTokensForUser({
    id: user.id,
    email: user.email,
    name: user.name,
  })
  return { user: toPublicUser(user), tokens }
}

export async function loginWithPassword(input: {
  email: string
  password: string
}): Promise<AuthResponse> {
  const email = validateEmail(input.email)
  if (typeof input.password !== 'string' || input.password.length === 0) {
    throw new AuthError('invalid_request', 'Password is required')
  }

  const user = await findUserByEmail(email)
  if (!user || !user.password_hash) {
    // Same error for "no user" and "no password set" — keeps auth side-channels closed.
    throw new AuthError('invalid_credentials', 'Email or password is incorrect')
  }

  const ok = await verifyPassword(input.password, user.password_hash)
  if (!ok) {
    throw new AuthError('invalid_credentials', 'Email or password is incorrect')
  }

  const tokens = await issueTokensForUser({
    id: user.id,
    email: user.email,
    name: user.name,
  })
  return { user: toPublicUser(user), tokens }
}
