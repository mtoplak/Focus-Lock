import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authRouter } from './routes/auth.js'
import { googleAuthRouter } from './routes/googleAuth.js'
import { healthRouter } from './routes/health.js'
import { pushRouter } from './routes/push.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json())

  app.use('/api', healthRouter)
  app.use('/api', googleAuthRouter)
  app.use('/api', authRouter)
  app.use('/api', pushRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(errorHandler)

  return app
}
