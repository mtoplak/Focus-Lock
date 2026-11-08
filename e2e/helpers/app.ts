import { expect, type Locator, type Page } from '@playwright/test'

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001'
export const AGENT_URL = 'http://127.0.0.1:7777'

export type Tab = 'Timer' | 'Blocks' | 'Schedule' | 'Stats' | 'Settings'

export const timerRegion = (page: Page): Locator => page.getByRole('timer')

/** The large mm:ss digits inside the timer. */
export const timerDigits = (page: Page): Locator =>
  timerRegion(page).getByText(/^\d{2}:\d{2}$/)

export const timerButton = (page: Page, name: 'Start' | 'Pause' | 'Reset' | 'Skip'): Locator =>
  page.getByRole('button', { name, exact: true })

export async function openTab(page: Page, name: Tab): Promise<void> {
  const nav = page.getByRole('navigation', { name: 'Primary' })
  const button = nav.getByRole('button', { name, exact: true })
  await button.click()
  await expect(button).toHaveAttribute('aria-current', 'page')
}

/** Each test has its own browser context, so this always starts from a clean device. */
export async function enterAsGuest(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Continue as guest' }).click()
  await expect(timerRegion(page)).toBeVisible()
}
