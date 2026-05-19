# Focus Lock — Frontend

TypeScript + Vite + React + Tailwind CSS + PWA boilerplate.

## Scripts

```bash
npm install
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

Replace `public/favicon.svg` and extend the manifest in `vite.config.ts` with PNG icons (192×192, 512×512) before shipping installable PWAs to all platforms.
