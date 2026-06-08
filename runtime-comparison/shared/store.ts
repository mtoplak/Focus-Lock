// In-memory user store + PBKDF2 password hashing via Web Crypto.
// Portable across Node 24+, Deno and Bun. Mirrors the real backend's
// userRepository + password module, minus Postgres/scrypt, so the benchmark
// measures the framework/runtime rather than database latency.
export type User = { id: string; email: string; name: string | null; passwordHash: string }

const users = new Map<string, User>() // keyed by lowercased email

const ITER = 100_000
const enc = new TextEncoder()

const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    base,
    256,
  )
}

export async function hash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await derive(password, salt)
  return `pbkdf2$${ITER}$${b64(salt.buffer)}$${b64(bits)}`
}

export async function verify(password: string, stored: string): Promise<boolean> {
  const [, , saltB64, hashB64] = stored.split('$')
  if (!saltB64 || !hashB64) return false
  const bits = await derive(password, unb64(saltB64))
  return b64(bits) === hashB64
}

export function findByEmail(email: string): User | undefined {
  return users.get(email.trim().toLowerCase())
}
export function findById(id: string): User | undefined {
  for (const u of users.values()) if (u.id === id) return u
  return undefined
}
export async function createUser(
  email: string,
  password: string,
  name: string | null,
): Promise<{ id: string; email: string; name: string | null }> {
  const user: User = {
    id: crypto.randomUUID(),
    email: email.trim(),
    name,
    passwordHash: await hash(password),
  }
  users.set(user.email.toLowerCase(), user)
  return { id: user.id, email: user.email, name: user.name }
}
