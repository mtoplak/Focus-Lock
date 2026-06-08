import { createApp } from './app.js'
import { env } from './config/env.js'
import { runMigrations } from './db/migrate.js'
import { pool } from './db/pool.js'
import { initPush, startPushPoller } from './services/pushService.js'

async function start(): Promise<void> {
  if (env.runMigrationsOnStart) {
    await runMigrations()
  }

  if (initPush()) {
    startPushPoller()
  }

  const app = createApp()

  app.listen(env.port, () => {
    console.log(`Focus Lock API listening on http://localhost:${env.port}`)
    console.log(`Health check: http://localhost:${env.port}/api/health`)
  })
}

start().catch(async (error) => {
  console.error('Failed to start server:', error)
  await pool.end()
  process.exit(1)
})
