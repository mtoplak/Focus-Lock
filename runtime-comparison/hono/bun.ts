// Bun entrypoint for the shared Hono app.
//   bun run bun.ts
import app from './app.ts'

const PORT = Number(process.env.PORT ?? 3001)
const startedAt = performance.now()
const server = Bun.serve({ port: PORT, fetch: app.fetch })
console.log(`[hono/bun] ready on :${server.port} in ${(performance.now() - startedAt).toFixed(1)}ms`)
