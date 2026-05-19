# Focus Lock — Backend

TypeScript + Express API boilerplate.

## Scripts

```bash
npm install
cp .env.example .env   # optional; defaults work for local dev
npm run dev            # http://localhost:3001 with hot reload
npm run build          # compile to dist/
npm start              # run compiled output
```

## Stack

- **Express 4** — HTTP server
- **TypeScript 5.7** — ESM (`"type": "module"`)
- **tsx** — dev server with watch mode
- **cors** — allow the Vite frontend origin by default
- **dotenv** — environment variables from `.env`

## Project layout

```
backend/
├── src/
│   ├── index.ts        # Server entry
│   ├── app.ts          # Express app factory
│   ├── config/env.ts   # Typed env config
│   └── routes/
│       └── health.ts   # GET /api/health
├── .env.example
└── tsconfig.json
```

## Environment

| Variable        | Default                                                       | Description              |
|----------------|---------------------------------------------------------------|--------------------------|
| `PORT`         | `3001`                                                        | HTTP port                |
| `NODE_ENV`     | `development`                                                 | Runtime environment      |
| `CORS_ORIGIN`  | `http://localhost:5173`                                       | Allowed frontend origin  |
| `DATABASE_URL` | `postgresql://focuslock:focuslock@localhost:5432/focuslock` | PostgreSQL connection    |

With Docker Compose, Postgres runs as service `db` and Adminer is on http://localhost:8081 (see root `README.md`).
