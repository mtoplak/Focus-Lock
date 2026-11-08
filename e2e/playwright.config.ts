import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // A retry would hide flakiness, and these tests are meant to be deterministic.
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [
        ['github'],
        ['list'],
        ['junit', { outputFile: 'results/junit.xml' }],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'web',
      grepInvert: /@agent/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Needs the real Windows desktop agent. The full Chromium build runs as
      // chrome.exe, which the agent recognises when it resets browser
      // connections; the default headless shell has a different process name.
      name: 'agent',
      grep: /@agent/,
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
})
