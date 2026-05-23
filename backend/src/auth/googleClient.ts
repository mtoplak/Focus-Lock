import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env.js'

export function createGoogleOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    env.google.clientId,
    env.google.clientSecret,
    env.google.callbackUrl,
  )
}

export function getGoogleAuthUrl(state: string): string {
  const client = createGoogleOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    state,
    include_granted_scopes: true,
  })
}
