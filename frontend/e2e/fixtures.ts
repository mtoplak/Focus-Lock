import { test as base, expect, type Locator, type Page } from '@playwright/test'

/** Desktop agent address used by the PWA (see src/hooks/useAgent.ts). */
export const AGENT_URL = 'http://127.0.0.1:7777'

/**
 * Shared test setup. Every test gets a fresh browser context, so localStorage
 * (settings, block list, timer state, guest flag) never leaks between tests.
 *
 * Two external dependencies are replaced so results do not depend on the
 * machine running the tests:
 *  - the public "is there internet?" probe always answers 204 while online;
 *  - the desktop agent is unreachable unless a test mocks it (TC-FL-008).
 */
export const test = base.extend<{ app: AppHelpers }>({
  page: async ({ page }, use) => {
    await page.route('https://connectivitycheck.gstatic.com/**', (route) =>
      route.fulfill({ status: 204, body: '' }),
    )
    await page.route(`${AGENT_URL}/**`, (route) => route.abort('connectionrefused'))
    await use(page)
  },
  app: async ({ page }, use) => {
    await use(new AppHelpers(page))
  },
})

export { expect }

const VIEW_HEADINGS = {
  Timer: 'Focus timer',
  Blocks: 'Blocked distractions',
  Schedule: 'Scheduled blocking',
  Stats: 'Stats',
  Settings: 'Settings',
} as const

export class AppHelpers {
  constructor(private readonly page: Page) {}

  /** The circular timer (role="timer"); its aria-label holds the exact remaining time. */
  get timer(): Locator {
    return this.page.getByRole('timer')
  }

  get startPauseButton(): Locator {
    return this.page.getByRole('button', { name: /^(Start|Pause)$/ })
  }

  /** Precondition "user is in the app": enter through the real login page as a guest. */
  async enterAsGuest(): Promise<void> {
    await this.page.goto('/login')
    await this.page.getByRole('button', { name: 'Continue as guest' }).click()
    await expect(this.page).toHaveURL(/\/$/)
    await expect(this.timer).toBeVisible()
  }

  /** Click an entry in the sidebar navigation (Timer, Blocks, Schedule, Stats, Settings). */
  async openView(name: 'Timer' | 'Blocks' | 'Schedule' | 'Stats' | 'Settings'): Promise<void> {
    await this.page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('button', { name, exact: true })
      .click()
    await expect(this.page.getByRole('heading', { level: 2, name: VIEW_HEADINGS[name] })).toBeAttached()
  }

  /** Remaining seconds, read from the timer's accessible name. */
  async remainingSeconds(): Promise<number> {
    const label = (await this.timer.getAttribute('aria-label')) ?? ''
    const minutes = /(\d+) minutes?/.exec(label)?.[1] ?? '0'
    const seconds = /(\d+) seconds?/.exec(label)?.[1] ?? '0'
    return Number(minutes) * 60 + Number(seconds)
  }

  async expectRunning(): Promise<void> {
    await expect(this.timer).toHaveAttribute('aria-label', /, running$/)
  }

  /** Waits (without fixed sleeps) until the countdown has dropped below `seconds`. */
  async expectRemainingBelow(seconds: number): Promise<void> {
    await expect.poll(() => this.remainingSeconds(), { timeout: 15_000 }).toBeLessThan(seconds)
  }
}
