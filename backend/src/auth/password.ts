import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

// scrypt parameters: N=16384 (2^14), r=8, p=1 — the Node default. Safe for
// interactive logins and matches typical password-hashing recommendations.
const KEY_LENGTH = 64
const SALT_BYTES = 16
const VERSION = 'scrypt$N=16384,r=8,p=1'

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return `${VERSION}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$')
  // Expected format: 'scrypt' + '<params>' + '<saltB64>' + '<hashB64>'
  if (parts.length !== 4 || `${parts[0]}$${parts[1]}` !== VERSION) {
    return false
  }
  const salt = Buffer.from(parts[2]!, 'base64')
  const expected = Buffer.from(parts[3]!, 'base64')
  let derived: Buffer
  try {
    derived = await scrypt(password, salt, expected.length)
  } catch {
    return false
  }
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}
