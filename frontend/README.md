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

## Keyboard shortcuts

Bližnjice delujejo globalno na strani z časovnikom. Ko je fokus v `<input>`, `<textarea>` ali drugem urejevalnem polju (npr. polje "What are you working on?"), so bližnjice **onemogočene**, da ne motijo tipkanja. Bližnjice spoštujejo **strict mode** enako kot gumbi — kadar je seja zaklenjena, R / S / 1 / 2 / 3 in pavza nimajo učinka.

| Tipka | Akcija |
|-------|--------|
| `Space` | Start / Pause |
| `R` | Reset |
| `S` | Skip |
| `1` | Preklop na **Focus** |
| `2` | Preklop na **Short break** |
| `3` | Preklop na **Long break** |

Bližnjice so vidne tudi v aplikaciji preko ikone tipkovnice (⌨) poleg modnih zavihkov.

## Authentication

| Route | Purpose |
|-------|---------|
| `/login` | Google sign-in page |
| `/auth/callback` | OAuth return (tokens in query) |
| `/` | App (requires sign-in) |

Sign out via the account menu (top-right on desktop, mobile header).

Ensure `FRONTEND_AUTH_CALLBACK_URL` on the backend matches your dev URL (`http://localhost:5173/auth/callback`).
