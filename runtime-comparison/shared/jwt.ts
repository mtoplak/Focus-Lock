// Minimal HS256 JWT using only Web Crypto (globalThis.crypto.subtle).
// Identical code runs on Node 24+, Deno and Bun — no `jose`, no node_modules,
// so the only thing that differs between the three apps is the framework.
const SECRET = new TextEncoder().encode(
  globalThis.process?.env?.JWT_SECRET ?? 'dev-only-secret-change-me-32-characters',
)
const ALG = { name: 'HMAC', hash: 'SHA-256' } as const

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64urlJson = (obj: unknown) => b64url(new TextEncoder().encode(JSON.stringify(obj)))

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', SECRET, ALG, false, ['sign', 'verify'])
}

export type AccessPayload = { sub: string; email: string; name: string | null }

export async function signAccessToken(payload: AccessPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const head = b64urlJson({ alg: 'HS256', typ: 'JWT' })
  const body = b64urlJson({ ...payload, iat: now, exp: now + 900 })
  const data = `${head}.${body}`
  const sig = await crypto.subtle.sign(ALG, await key(), new TextEncoder().encode(data))
  return `${data}.${b64url(sig)}`
}

export async function verifyAccessToken(token: string): Promise<AccessPayload> {
  const [head, body, sig] = token.split('.')
  if (!head || !body || !sig) throw new Error('malformed token')
  const data = `${head}.${body}`
  const expected = b64url(
    await crypto.subtle.sign(ALG, await key(), new TextEncoder().encode(data)),
  )
  if (expected !== sig) throw new Error('bad signature')
  const json = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(body.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
    ),
  )
  if (typeof json.exp === 'number' && json.exp < Math.floor(Date.now() / 1000))
    throw new Error('expired')
  return { sub: json.sub, email: json.email, name: json.name ?? null }
}
