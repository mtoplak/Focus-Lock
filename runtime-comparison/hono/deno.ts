// Deno entrypoint for the shared Hono app.
//   deno run --allow-net --allow-env --node-modules-dir=auto deno.ts
import app from './app.ts'

const PORT = Number(Deno.env.get('PORT') ?? 3001)
const startedAt = performance.now()
Deno.serve(
  {
    port: PORT,
    onListen: () =>
      console.log(`[hono/deno] ready on :${PORT} in ${(performance.now() - startedAt).toFixed(1)}ms`),
  },
  app.fetch,
)
