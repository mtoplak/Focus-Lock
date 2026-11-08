import { expect, test, type Locator, type Page } from '@playwright/test'
import { AGENT_URL, enterAsGuest, openTab, timerButton } from '../helpers/app'

const EXTRA_SITE = 'example.org'
const SHORT_BREAK_MINUTES = '6'

const statCard = (page: Page, label: string): Locator =>
  page.getByText(label, { exact: true }).locator('..')

const allTimeValue = (page: Page, label: string): Locator =>
  page.getByText(label, { exact: true }).locator('xpath=following-sibling::dd')

const section = (page: Page, heading: string): Locator =>
  page.locator('section', { has: page.getByRole('heading', { name: heading }) })

/**
 * Stands in for the desktop agent, which only runs on Windows, and reports
 * blocked apps and sites. Keeps reporting them after the reset so the test also
 * catches counters being imported again on the next poll.
 */
const mockAgentWithBlockCounts = async (page: Page): Promise<void> => {
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': '*',
    'access-control-allow-headers': '*',
  }
  await page.route(`${AGENT_URL}/**`, (route) => {
    if (new URL(route.request().url()).pathname === '/status') {
      return route.fulfill({
        headers,
        json: {
          agent: 'focuslock-agent',
          version: 'e2e',
          killCounts: { 'discord.exe': 2 },
          urlBlockCounts: { 'youtube.com': 3 },
          urlBlocking: { kind: 'idle' },
        },
      })
    }
    return route.fulfill({ status: 204, headers })
  })
}

const expectStatsAreEmpty = async (page: Page): Promise<void> => {
  await expect(statCard(page, 'Today — sessions')).toHaveText(/0$/)
  await expect(statCard(page, 'Today — focus')).toHaveText(/0m$/)
  await expect(statCard(page, 'Total sessions')).toHaveText(/0$/)
  await expect(allTimeValue(page, 'Completed focus sessions')).toHaveText('0')
  await expect(allTimeValue(page, 'Total focus time')).toHaveText('0m')
  await expect(page.getByText('No completed days yet')).toBeVisible()
  await expect(section(page, 'Most blocked apps')).toContainText('No blocked apps closed yet')
  await expect(section(page, 'Most blocked apps')).not.toContainText('2×')
  await expect(section(page, 'Most blocked sites')).toContainText('No blocked site lookups yet')
  await expect(section(page, 'Most blocked sites')).not.toContainText('3×')
}

test('TC-FL-005: Ponastavitev vseh statistik', async ({ page }) => {
  await mockAgentWithBlockCounts(page)
  await page.clock.install({ time: new Date('2026-11-09T10:00:00') })
  await enterAsGuest(page)

  await test.step('Predpogoji: nastavitve, blokada in zaključena fokusna seja', async () => {
    // Non-default values, so a reset that also wiped these would be detected.
    await openTab(page, 'Blocks')
    await page.getByLabel('Site to block').fill(EXTRA_SITE)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByRole('switch', { name: `Block ${EXTRA_SITE}` })).toBeChecked()

    await openTab(page, 'Settings')
    await page.getByRole('button', { name: 'Increase short break' }).click()
    await expect(page.getByLabel('Short break', { exact: true })).toHaveValue(SHORT_BREAK_MINUTES)

    await openTab(page, 'Timer')
    await timerButton(page, 'Start').click()
    await expect(timerButton(page, 'Pause')).toBeVisible()
    await page.clock.fastForward('25:00')
    await expect(page.getByText('1 session today')).toBeVisible()
  })

  await test.step('1. Odpri zavihek Stats', async () => {
    await openTab(page, 'Stats')
    await expect(page.getByRole('heading', { name: 'Stats', exact: true })).toBeVisible()
  })

  await test.step('2. Zabeleži prikazane statistične vrednosti', async () => {
    await expect(statCard(page, 'Today — sessions')).toHaveText(/1$/)
    await expect(statCard(page, 'Today — focus')).toHaveText(/25m$/)
    await expect(statCard(page, 'Total sessions')).toHaveText(/1$/)
    await expect(allTimeValue(page, 'Completed focus sessions')).toHaveText('1')
    await expect(section(page, 'Most blocked apps')).toContainText('2×')
    await expect(section(page, 'Most blocked sites')).toContainText('youtube.com')
    await expect(section(page, 'Most blocked sites')).toContainText('3×')
  })

  const dialog = page.getByRole('alertdialog', { name: 'Reset all stats?' })

  await test.step('3. Klikni Reset all stats', async () => {
    await page.getByRole('button', { name: 'Reset all stats' }).click()
    await expect(dialog).toBeVisible()
  })

  await test.step('4. V potrditvenem oknu klikni Reset stats', async () => {
    await dialog.getByRole('button', { name: 'Reset stats', exact: true }).click()
    await expect(dialog).toBeHidden()
  })

  await test.step('5. Preveri statistiko in števec današnjih sej pri časovniku', async () => {
    await page.clock.runFor(4_000) // the next agent poll must not re-import the counts
    await expectStatsAreEmpty(page)
    await openTab(page, 'Timer')
    await expect(page.getByText('Start your first session')).toBeVisible()
  })

  await test.step('6. Osveži stran in znova preveri zavihek Stats', async () => {
    await page.reload()
    await openTab(page, 'Stats')
    await page.clock.runFor(4_000)
    await expectStatsAreEmpty(page)

    await openTab(page, 'Timer')
    await expect(page.getByText('Start your first session')).toBeVisible()

    await openTab(page, 'Blocks')
    await expect(page.getByRole('switch', { name: `Block ${EXTRA_SITE}` })).toBeChecked()
    await expect(page.getByRole('switch', { name: 'Block youtube.com' })).toBeChecked()

    await openTab(page, 'Settings')
    await expect(page.getByLabel('Short break', { exact: true })).toHaveValue(SHORT_BREAK_MINUTES)
  })
})
