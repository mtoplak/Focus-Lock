// Cross-runtime load test. Point it at whichever server is running on :3001.
//   1. start ONE server (see ../README.md)
//   2. node bench.mjs            (uses autocannon; `npx autocannon` if not installed)
//
// Measures two endpoints:
//   GET  /api/health  -> pure framework/runtime overhead (routing + JSON)
//   POST /api/auth/login -> realistic path (JSON parse + PBKDF2 verify + JWT sign)
import autocannon from 'autocannon'

const BASE = process.env.BASE ?? 'http://localhost:3001'
const DURATION = Number(process.env.DURATION ?? 10)
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 50)

const seed = { email: `bench_${Date.now()}@x.io`, password: 'password123', name: 'Bench' }

async function run(title, { path, ...opts }) {
  console.log(`\n=== ${title} ===`)
  const r = await autocannon({
    url: BASE + path,
    duration: DURATION,
    connections: CONNECTIONS,
    ...opts,
  })
  console.log(
    `req/s  avg ${r.requests.average.toFixed(0)} | latency avg ${r.latency.average.toFixed(2)}ms ` +
      `p99 ${r.latency.p99.toFixed(2)}ms | 2xx ${r['2xx'] ?? 0} non2xx ${r.non2xx ?? 0}`,
  )
  return r
}

// seed one user so /login has something to verify
await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(seed),
})

await run('GET /api/health (overhead)', { method: 'GET', path: '/api/health' })
await run('POST /api/auth/login (PBKDF2 + JWT)', {
  method: 'POST',
  path: '/api/auth/login',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: seed.email, password: seed.password }),
})
