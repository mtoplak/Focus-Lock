import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.port, () => {
  console.log(`Focus Lock API listening on http://localhost:${env.port}`)
  console.log(`Health check: http://localhost:${env.port}/api/health`)
})
