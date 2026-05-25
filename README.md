# Focus-Lock

Monorepo with a React PWA frontend, Express API backend, PostgreSQL, and a
native Rust agent that handles desktop-app and URL blocking on the user's
machine.

- **Frontend** — Vite 6 + React 19 + Tailwind CSS 4 + `vite-plugin-pwa`
- **Backend** — Node + Express 4 + TypeScript 5.7 (ESM)
- **Database** — PostgreSQL 16, with Adminer for browsing
- **Desktop agent** — Rust + Axum + sysinfo + `lnk` (Windows only for now);
  see [desktop-agent/](desktop-agent/README.md)

## Prerequisites

- **Docker** + Docker Compose (recommended path), or
- **Node.js 20+** and a local PostgreSQL 16 instance if you want to run services natively.

## Quick start (Docker — production-like)

Everything — frontend, backend, Postgres, Adminer — starts with one command. Compose has sensible fallbacks, so a root `.env` is optional.

```bash
docker compose up --build
```

| Service  | URL                                |
|----------|------------------------------------|
| Frontend | http://localhost:8080              |
| Backend  | http://localhost:3001/api/health   |
| Adminer  | http://localhost:8081              |
| Postgres | `localhost:5432`                   |

## Development with Docker (hot reload)

Layer the dev override on top of the base file to run both apps with watch mode and bind-mounted source:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service  | URL                                |
|----------|------------------------------------|
| Frontend | http://localhost:5173 (Vite + HMR) |
| Backend  | http://localhost:3001/api/health (tsx watch) |
| Adminer  | http://localhost:8081              |
| Postgres | `localhost:5432`                   |

What the dev override changes:

- Frontend runs `vite` instead of the built nginx image — edits to `frontend/src` hot-reload in the browser.
- Backend runs `tsx watch` — edits to `backend/src` restart the server.
- Source folders are bind-mounted; `node_modules` stays inside each container (named volumes) so platform-specific binaries (e.g. `lightningcss`, `esbuild`) come from the Linux install, not your host.
- File watching uses polling (`CHOKIDAR_USEPOLLING=true`) so changes propagate reliably from Windows/macOS into the container.
- `CORS_ORIGIN` on the backend is set to `http://localhost:5173` to match Vite.

After adding npm dependencies, restart the dev stack (each service runs `npm ci` on start). If a package is still missing, remove the stale volume and bring the stack up again:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker volume rm focus-lock_backend_node_modules
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

To override defaults, create a `.env` at the repo root:

```env
POSTGRES_USER=focuslock
POSTGRES_PASSWORD=focuslock
POSTGRES_DB=focuslock
POSTGRES_PORT=5432
```

Stop the stack: `docker compose down`
Remove the database volume too: `docker compose down -v`

### Adminer login

| Field    | Value                                                              |
|----------|--------------------------------------------------------------------|
| System   | PostgreSQL                                                         |
| Server   | `db` (from the Adminer container) or `host.docker.internal`        |
| Username | `focuslock` (or your `POSTGRES_USER`)                              |
| Password | `focuslock` (or your `POSTGRES_PASSWORD`)                          |
| Database | `focuslock` (or your `POSTGRES_DB`)                                |

## Local development (without Docker)

You can run each app directly against a local Postgres. Both apps support hot reload.

### Backend

```bash
cd backend
npm install
cp .env.example .env       # adjust DATABASE_URL if your Postgres isn't local
npm run dev                # http://localhost:3001
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

Environment variables (see [backend/.env.example](backend/.env.example)):

| Variable       | Default                                                     | Description             |
|----------------|-------------------------------------------------------------|-------------------------|
| `PORT`         | `3001`                                                      | HTTP port               |
| `NODE_ENV`     | `development`                                               | Runtime environment     |
| `CORS_ORIGIN`  | `http://localhost:5173`                                     | Allowed frontend origin |
| `DATABASE_URL` | `postgresql://focuslock:focuslock@localhost:5432/focuslock` | PostgreSQL connection   |

### Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173 (PWA dev mode enabled)
```

Other scripts: `npm run build`, `npm run preview`.

> Note: in local dev the backend's default `CORS_ORIGIN` already matches Vite's `http://localhost:5173`. When running via Docker, the frontend is served from `http://localhost:8080`, which compose wires up automatically.

### Postgres (without Docker)

If you'd rather not use the dockerized DB, start the rest of the stack with:

```bash
docker compose up db adminer
```

…or point `DATABASE_URL` at any reachable Postgres 16 instance.

## Desktop agent (app + URL blocking)

The web app on its own can't block desktop programs or URLs across the
browser — those need OS-level access. The agent in [desktop-agent/](desktop-agent/)
is a small Rust binary that runs locally on Windows, exposes an HTTP server on
`127.0.0.1:7777`, and is driven by the PWA over `localhost`.

| Capability               | Mechanism                                                                                     | Admin required? |
|--------------------------|-----------------------------------------------------------------------------------------------|-----------------|
| Desktop app blocking     | Polls processes every 2 s, kills matches                                                      | No              |
| URL blocking             | Rewrites `C:\Windows\System32\drivers\etc\hosts` and `ipconfig /flushdns`                     | Yes             |
| Reset browser network    | Force-closes existing TCP connections from major browsers so the hosts block bites right away | Yes (with URL blocking) |
| Detect installed apps    | Scans Start Menu shortcuts + running processes, dedupes by exe name                            | No              |
| Show app icons in picker | `systemicons` extracts the exe's icon as PNG, served from `/icon/:exe`                         | No              |

### Run the agent

Prerequisite: **Rust toolchain** — install via [rustup.rs](https://rustup.rs/)
(pick the default install; restart your shell so PATH picks up `cargo`).

```powershell
# App blocking only (no admin needed):
cd desktop-agent
cargo run

# App + URL blocking: open PowerShell as Administrator
# (Win key → "powershell" → right-click → "Run as administrator"), then:
cd desktop-agent
cargo run
```

The first build takes 1–3 minutes; incremental builds are seconds. The agent
prints to stdout — keep the terminal open. `Ctrl+C` to stop; it removes its
hosts-file entries on the way out, and again on the next startup as a safety
net against unclean exits.

For a release binary: `cargo build --release` produces
`desktop-agent/target/release/focuslock-agent.exe` (~3–4 MB).

### How the PWA talks to it

| Endpoint              | Method | Body / Params                                              | Returns                                                                  |
|-----------------------|--------|------------------------------------------------------------|--------------------------------------------------------------------------|
| `GET /`               | —      | —                                                          | `{ agent, version }`                                                     |
| `GET /status`         | —      | —                                                          | `{ agent, version, lastKill?, urlBlocking: { kind, message? } }`         |
| `POST /sync`          | JSON   | `{ apps: string[], urls: string[], focusActive: boolean }` | `204 No Content`                                                         |
| `GET /installed-apps` | —      | —                                                          | `{ apps: [{ exe, displayName, running, instances, hasIcon }] }`          |
| `GET /icon/:exe`      | —      | URL-encoded exe basename                                   | `image/png` (cached 1 day)                                               |

The PWA polls `/status` every 4 s for the connected/disconnected indicator,
and pushes `/sync` whenever the block list or focus state changes.

### Caveats

- **Block page looks like an error page**: hosts-file blocking redirects
  domains to `127.0.0.1` and the browser shows its standard
  "connection refused" / "you're offline" page. There's no way to show a
  branded "Blocked by Focus Lock" page without either a browser extension or
  running the agent on port 80.
- **Browser DNS cache on already-open tabs**: when you start a focus session
  with a tab already open to a blocked site, the browser keeps using its
  internal DNS cache (~60 s TTL) until expiry, and the tab can still reload.
  Set `FOCUSLOCK_AGGRESSIVE_RESET=1` in the agent's environment to also kill
  the browser's network-service process — this wipes that cache instantly.
  The trade-off is that it also kills Vite's HMR WebSocket, so the PWA's dev
  server reloads. Use it only with the PWA built in production mode
  (`npm run build && npm run preview`), not `npm run dev`.
- **Whole-domain only**: `youtube.com` blocks the whole site, not just
  `youtube.com/feed`. The hosts file doesn't support paths — path-level
  blocking needs an MV3 browser extension.
- **Windows only for now**: process enumeration and icon extraction are
  cross-platform via `sysinfo`/`systemicons`, but the Start Menu scan, hosts
  path, browser-network reset, and admin model are Windows-specific.
  macOS/Linux would need their own implementations.

See [desktop-agent/README.md](desktop-agent/README.md) for the full API,
environment variables, and security notes.

## Project layout

```
Focus-Lock/
├── backend/            # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts        # Server entry
│   │   ├── app.ts          # Express app factory
│   │   ├── config/env.ts   # Typed env config
│   │   └── routes/health.ts
│   ├── Dockerfile
│   └── .env.example
├── frontend/           # Vite + React + Tailwind PWA
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   └── nginx.conf      # Serves the built PWA in the container
├── desktop-agent/      # Rust agent (app + URL blocking, Windows)
│   └── src/
│       ├── main.rs         # tokio runtime, startup + Ctrl+C cleanup
│       ├── server.rs       # Axum HTTP API on 127.0.0.1:7777
│       ├── blocker.rs      # 2 s scan loop, URL + app + connection-reset
│       ├── discovery.rs    # Start Menu + running-processes merge
│       ├── icons.rs        # Exe icon extraction (windows / systemicons)
│       ├── hosts.rs        # Hosts-file read/strip/apply + DNS flush
│       ├── connections.rs  # Browser TCP kill + network-service reset
│       └── state.rs        # Shared AppState
├── docker-compose.yml
└── README.md
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for app-specific details.
