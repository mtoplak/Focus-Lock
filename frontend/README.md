# Focus Lock — Frontend

TypeScript + Vite + React + Tailwind CSS + PWA boilerplate.

## Scripts

```bash
npm install
cp .env.example .env   # optional; VITE_API_URL defaults to http://localhost:3001
npm run dev      # http://localhost:5173 (PWA dev mode enabled)
npm run build    # production build to dist/
npm run preview  # serve dist/
```

## Stack

- **Vite 6** — dev server and bundler
- **React 19** — UI
- **Tailwind CSS 4** — styling via `@tailwindcss/vite`
- **vite-plugin-pwa** — service worker, web manifest, auto-update

## Project layout

```
frontend/
├── public/           # Static assets (favicon, etc.)
├── src/
│   ├── App.tsx       # Root component
│   ├── main.tsx      # Entry point
│   ├── index.css     # Tailwind import
│   └── vite-env.d.ts
├── index.html
├── vite.config.ts
└── tsconfig*.json
```

## Authentication

| Route | Purpose |
|-------|---------|
| `/login` | Google sign-in page |
| `/auth/callback` | OAuth return (tokens in query) |
| `/` | App (requires sign-in) |

Sign out via the account menu (top-right on desktop, mobile header).

Ensure `FRONTEND_AUTH_CALLBACK_URL` on the backend matches your dev URL (`http://localhost:5173/auth/callback`).
