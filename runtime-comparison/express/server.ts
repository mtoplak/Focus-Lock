// Express on Node.js — mirrors the structure of the real Focus Lock backend
// (routes -> handlers, middleware, central error handler), trimmed to a
// representative auth slice with an in-memory store so all three runtimes can
// be benchmarked without Postgres.
//
// Run:  npx tsx server.ts   (Node 18+; or `node server.ts` on Node 24+)
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { createUser, findByEmail, findById, verify } from '../shared/store.ts'
import { signAccessToken, verifyAccessToken } from '../shared/jwt.ts'

const PORT = Number(process.env.PORT ?? 3001)

class HttpError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
  }
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// --- routes ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', runtime: 'node', framework: 'express' })
})

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string')
      throw new HttpError('invalid_request', 'email and password are required')
    if (password.length < 8)
      throw new HttpError('invalid_request', 'Password must be at least 8 characters')
    if (findByEmail(email)) throw new HttpError('email_taken', 'Email already registered', 409)

    const user = await createUser(email, password, typeof name === 'string' ? name : null)
    const token = await signAccessToken({ sub: user.id, email: user.email, name: user.name })
    res.status(201).json({ user, access_token: token, token_type: 'Bearer', expires_in: 900 })
  } catch (e) {
    next(e)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string')
      throw new HttpError('invalid_request', 'email and password are required')
    const user = findByEmail(email)
    if (!user || !(await verify(password, user.passwordHash)))
      throw new HttpError('invalid_credentials', 'Email or password is incorrect', 401)

    const token = await signAccessToken({ sub: user.id, email: user.email, name: user.name })
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      access_token: token,
      token_type: 'Bearer',
      expires_in: 900,
    })
  } catch (e) {
    next(e)
  }
})

// auth middleware + protected route
async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer '))
      throw new HttpError('unauthorized', 'Bearer token required', 401)
    ;(req as any).auth = await verifyAccessToken(header.slice(7))
    next()
  } catch {
    next(new HttpError('invalid_token', 'Access token is invalid or expired', 401))
  }
}

app.get('/api/auth/me', requireAuth, (req, res) => {
  const auth = (req as any).auth
  const user = findById(auth.sub)
  res.json({ user: user && { id: user.id, email: user.email, name: user.name } })
})

// 404 + central error handler
app.use((_req, res) => res.status(404).json({ error: 'not_found' }))
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError)
    return res.status(err.status).json({ error: err.code, error_description: err.message })
  console.error(err)
  res.status(500).json({ error: 'server_error' })
})

const startedAt = performance.now()
app.listen(PORT, () => {
  console.log(`[express/node] ready on :${PORT} in ${(performance.now() - startedAt).toFixed(1)}ms`)
})
