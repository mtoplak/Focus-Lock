import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function verifyTokenHash(token: string, expectedHash: string): boolean {
  const actual = hashToken(token)
  const a = Buffer.from(actual, 'utf8')
  const b = Buffer.from(expectedHash, 'utf8')
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(a, b)
}
