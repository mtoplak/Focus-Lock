import { generateOpaqueToken, hashToken } from '../auth/crypto.js'
import { AuthError } from '../auth/errors.js'
import {
  accessTokenExpiresInSeconds,
  signAccessToken,
} from '../auth/jwt.js'
import { env } from '../config/env.js'
import {
  findValidRefreshToken,
  revokeRefreshToken,
  saveRefreshToken,
} from '../repositories/refreshTokenRepository.js'
import { findUserById } from '../repositories/userRepository.js'
import type { UserRecord } from '../repositories/userRepository.js'

export type AuthTokens = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
}

export type PublicUser = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

function refreshTokenExpiresAt(): Date {
  const date = new Date()
  date.setDate(date.getDate() + env.jwt.refreshExpiresDays)
  return date
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
  }
}

export async function issueTokensForUser(user: {
  id: string
  email: string
  name: string | null
}): Promise<AuthTokens> {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  })

  const refreshValue = generateOpaqueToken()
  await saveRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshValue),
    expiresAt: refreshTokenExpiresAt(),
  })

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: accessTokenExpiresInSeconds(accessToken),
    refresh_token: refreshValue,
  }
}

export async function refreshSession(
  refreshToken: string,
): Promise<AuthTokens> {
  const tokenHash = hashToken(refreshToken)
  const stored = await findValidRefreshToken(tokenHash)

  if (!stored) {
    throw new AuthError(
      'invalid_grant',
      'Refresh token is invalid, expired, or revoked',
    )
  }

  const user = await findUserById(stored.user_id)
  if (!user) {
    throw new AuthError('invalid_grant', 'User no longer exists')
  }

  await revokeRefreshToken(tokenHash)

  return issueTokensForUser({
    id: user.id,
    email: user.email,
    name: user.name,
  })
}

export async function logoutSession(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken)
  const stored = await findValidRefreshToken(tokenHash)

  if (!stored) {
    return
  }

  await revokeRefreshToken(tokenHash)
}

export async function getUserById(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId)
  if (!user) {
    throw new AuthError('invalid_token', 'User no longer exists')
  }
  return toPublicUser(user)
}
