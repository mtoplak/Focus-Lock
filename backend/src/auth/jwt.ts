import { decodeJwt, jwtVerify, SignJWT } from 'jose'
import { env } from '../config/env.js'
import { AuthError } from './errors.js'

const issuer = 'focus-lock-api'
const audience = 'focus-lock'

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.jwt.secret)
}

export type AccessTokenPayload = {
  sub: string
  email: string
  name: string | null
}

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(env.jwt.accessExpiresIn)
    .sign(secretKey())
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer,
    audience,
  })

  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new AuthError('invalid_token', 'Access token payload is invalid')
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === 'string' ? payload.name : null,
    iat: payload.iat,
    exp: payload.exp,
  }
}

export async function verifyAccessTokenOrThrow(token: string) {
  try {
    return await verifyAccessToken(token)
  } catch {
    throw new AuthError('invalid_token', 'Access token is invalid or expired')
  }
}

export function accessTokenExpiresInSeconds(accessToken: string): number {
  const payload = decodeJwt(accessToken)
  if (typeof payload.exp === 'number' && typeof payload.iat === 'number') {
    return payload.exp - payload.iat
  }
  return 900
}
