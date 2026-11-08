import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end (functional) tests for TC-FL-006 … TC-FL-010.
 *
 * Playwright starts two servers before the tests:
 *  - the backend API (needed for registration in TC-FL-006), which requires a
 *    PostgreSQL database at E2E_DATABASE_URL;
 *  - a production build of the PWA served by `vite preview`, so the service
 *    worker and offline cache behave like in a real deployment (TC-FL-009).
 */

const FRONTEND_PORT = 4173
const API_PORT = Number(process.env.E2E_API_PORT ?? 3101)
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const API_URL = `http://localhost:${API_PORT}`
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://focuslock:focuslock@localhost:5432/focuslock'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Desktop width so the sidebar navigation is visible.
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Full Chromium in new headless mode: unlike the default headless shell
        // it supports the Notification permission (TC-FL-010).
        channel: 'chromium',
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      command: 'npx tsx src/index.ts',
      cwd: '../backend',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        NODE_ENV: 'test',
        CORS_ORIGIN: FRONTEND_URL,
        DATABASE_URL,
        RUN_MIGRATIONS_ON_START: 'true',
      },
    },
    {
      command: `npx vite build && npx vite preview --port ${FRONTEND_PORT} --strictPort`,
      url: FRONTEND_URL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
})
