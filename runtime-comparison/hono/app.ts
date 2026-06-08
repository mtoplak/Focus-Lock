// Hono app — runtime-agnostic (Web Standard Request/Response). The SAME app
// is served on Deno (deno.ts) and Bun (bun.ts); only the ~3-line bootstrap
// differs. Bare imports resolve from node_modules (shared by both runtimes).
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { createUser, findByEmail, findById, verify } from '../shared/store.ts'
import { signAccessToken, verifyAccessToken } from '../shared/jwt.ts'

const RUNTIME =
  typeof (globalThis as any).Deno !== 'undefined'
    ? 'deno'
    : typeof (globalThis as any).Bun !== 'undefined'
      ? 'bun'
      : 'node'

const app = new Hono()

app.use('*', cors({ origin: (o) => o, credentials: true }))

app.get('/api/health', (c) => c.json({ status: 'ok', runtime: RUNTIME, framework: 'hono' }))

app.post('/api/auth/register', async (c) => {
  const { email, password, name } = await c.req.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string')
    throw new HTTPException(400, { message: 'email and password are required' })
  if (password.length < 8)
    throw new HTTPException(400, { message: 'Password must be at least 8 characters' })
  if (findByEmail(email)) throw new HTTPException(409, { message: 'Email already registered' })

  const user = await createUser(email, password, typeof name === 'string' ? name : null)
  const token = await signAccessToken({ sub: user.id, email: user.email, name: user.name })
  return c.json({ user, access_token: token, token_type: 'Bearer', expires_in: 900 }, 201)
})

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string')
    throw new HTTPException(400, { message: 'email and password are required' })
  const user = findByEmail(email)
  if (!user || !(await verify(password, user.passwordHash)))
    throw new HTTPException(401, { message: 'Email or password is incorrect' })

  const token = await signAccessToken({ sub: user.id, email: user.email, name: user.name })
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    access_token: token,
    token_type: 'Bearer',
    expires_in: 900,
  })
})

app.get('/api/auth/me', async (c) => {
  const header = c.req.header('authorization')
  if (!header?.startsWith('Bearer '))
    throw new HTTPException(401, { message: 'Bearer token required' })
  let auth
  try {
    auth = await verifyAccessToken(header.slice(7))
  } catch {
    throw new HTTPException(401, { message: 'Access token is invalid or expired' })
  }
  const user = findById(auth.sub)
  return c.json({ user: user && { id: user.id, email: user.email, name: user.name } })
})

app.notFound((c) => c.json({ error: 'not_found' }, 404))
app.onError((err, c) => {
  if (err instanceof HTTPException)
    return c.json({ error: 'request_failed', error_description: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'server_error' }, 500)
})

export default app
