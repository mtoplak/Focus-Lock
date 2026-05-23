import { Router } from 'express'
import { env } from '../config/env.js'
import { checkDatabaseConnection } from '../db/pool.js'

export const healthRouter = Router()

healthRouter.get('/health', async (_req, res) => {
  let database: 'up' | 'down' = 'down'

  try {
    database = (await checkDatabaseConnection()) ? 'up' : 'down'
  } catch {
    database = 'down'
  }

  const ok = database === 'up'

  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    service: 'focus-lock-api',
    database,
    auth: {
      provider: 'google',
      configured: Boolean(env.google.clientId && env.google.clientSecret),
      endpoints: [
        'GET /api/auth/google',
        'GET /api/auth/google/callback',
        'POST /api/auth/refresh',
        'POST /api/auth/logout',
        'GET /api/auth/me',
      ],
    },
    timestamp: new Date().toISOString(),
  })
})
