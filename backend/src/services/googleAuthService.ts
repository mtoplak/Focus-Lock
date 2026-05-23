import { createGoogleOAuthClient } from '../auth/googleClient.js'
import { env } from '../config/env.js'
import { upsertGoogleUser } from '../repositories/userRepository.js'
import {
  issueTokensForUser,
  type AuthTokens,
} from './sessionService.js'

export type { AuthTokens }

export function buildFrontendCallbackUrl(tokens: AuthTokens): string {
  const url = new URL(env.frontendAuthCallbackUrl)
  url.searchParams.set('access_token', tokens.access_token)
  url.searchParams.set('refresh_token', tokens.refresh_token)
  url.searchParams.set('token_type', tokens.token_type)
  url.searchParams.set('expires_in', String(tokens.expires_in))
  return url.toString()
}

export async function handleGoogleCallback(code: string): Promise<string> {
  const client = createGoogleOAuthClient()
  const { tokens } = await client.getToken(code)

  if (!tokens.id_token) {
    throw new Error('Google did not return an id_token')
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.google.clientId,
  })

  const profile = ticket.getPayload()
  if (!profile?.sub || !profile.email) {
    throw new Error('Google profile is missing required fields')
  }

  const user = await upsertGoogleUser({
    googleId: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
  })

  const authTokens = await issueTokensForUser({
    id: user.id,
    email: user.email,
    name: user.name,
  })

  return buildFrontendCallbackUrl(authTokens)
}
