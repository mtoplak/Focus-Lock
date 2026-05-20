# Focus-Lock

Monorepo with a React PWA frontend and Express API backend, backed by PostgreSQL.

- **Frontend** — Vite 6 + React 19 + Tailwind CSS 4 + `vite-plugin-pwa`
- **Backend** — Node + Express 4 + TypeScript 5.7 (ESM)
- **Database** — PostgreSQL 16, with Adminer for browsing

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

If you add a new dependency, rebuild the affected container so it lands in the named volume:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend
# or: ...build backend
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
├── docker-compose.yml
└── README.md
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for app-specific details.
