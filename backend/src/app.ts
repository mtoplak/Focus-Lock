import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { healthRouter } from './routes/health.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin,
    }),
  )
  app.use(express.json())

  app.use('/api', healthRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  return app
}
