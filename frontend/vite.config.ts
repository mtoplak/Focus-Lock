import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'pwa-icon-maskable.svg', 'favicon.svg'],
      manifest: {
        id: '/',
        name: 'Focus Lock — Pomodoro timer with distraction blocking',
        short_name: 'Focus Lock',
        description:
          'A Pomodoro timer that blocks distracting apps and websites while you work, so deep focus stays intentional.',
        lang: 'en',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
        orientation: 'any',
        theme_color: '#fafaf7',
        background_color: '#fafaf7',
        categories: ['productivity', 'utilities', 'lifestyle'],
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: 'pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'Open timer',
            short_name: 'Timer',
            description: 'Jump straight into a focus session',
            url: '/?view=timer',
          },
          {
            name: 'Open stats',
            short_name: 'Stats',
            description: 'Today’s focus stats',
            url: '/?view=stats',
          },
        ],
      },
      workbox: {
        // Precache everything that ships with the build — JS, CSS, HTML,
        // icons, images, fonts. These are content-hashed by Vite, so a fresh
        // build automatically invalidates the cache.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          // Google Fonts CSS — small, changes rarely.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Google Fonts font files — immutable URLs, fine to CacheFirst.
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
