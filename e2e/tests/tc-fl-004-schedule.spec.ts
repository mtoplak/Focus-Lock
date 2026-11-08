import { expect, test, type Locator, type Page } from '@playwright/test'
import { enterAsGuest, openTab } from '../helpers/app'

const START = '09:00'
const END = '10:00'
const RANGE = `${START}–${END}`
const OTHER_DAYS = ['Sun', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const dayButton = (page: Page, name: string): Locator =>
  page.getByRole('button', { name, exact: true })

const scheduleRow = (page: Page): Locator =>
  page.getByRole('listitem').filter({ hasText: RANGE })

const expectMondaySchedule = async (page: Page): Promise<void> => {
  await expect(scheduleRow(page)).toHaveCount(1)
  await expect(scheduleRow(page).getByText('Mon', { exact: true })).toBeVisible()
  await expect(page.getByRole('switch', { name: `Enable schedule ${RANGE}` })).toBeChecked()
}

test('TC-FL-004: Dodajanje in ohranitev urnika blokiranja', async ({ page }) => {
  await enterAsGuest(page)

  await test.step('1. Odpri zavihek Schedule', async () => {
    await openTab(page, 'Schedule')
    await expect(page.getByRole('heading', { name: 'Scheduled blocking' })).toBeVisible()
  })

  await test.step('Predpogoj: enak urnik še ne obstaja', async () => {
    await expect(scheduleRow(page)).toHaveCount(0)
  })

  await test.step('2. Izberi ponedeljek', async () => {
    // The form starts with every day selected, so only Monday is left on.
    for (const day of OTHER_DAYS) {
      await dayButton(page, day).click()
      await expect(dayButton(page, day)).toHaveAttribute('aria-pressed', 'false')
    }
    await expect(dayButton(page, 'Mon')).toHaveAttribute('aria-pressed', 'true')
  })

  await test.step(`3. Nastavi začetni čas ${START} in končni čas ${END}`, async () => {
    await page.getByLabel('From').fill(START)
    await page.getByLabel('To', { exact: true }).fill(END)
    await expect(page.getByLabel('From')).toHaveValue(START)
    await expect(page.getByLabel('To', { exact: true })).toHaveValue(END)
  })

  await test.step('4. Klikni Add schedule', async () => {
    await page.getByRole('button', { name: 'Add schedule' }).click()
    await expect(scheduleRow(page)).toBeVisible()
  })

  await test.step('5. Preveri prikaz novega urnika', async () => {
    await expectMondaySchedule(page)
  })

  await test.step('6. Osveži stran brskalnika', async () => {
    await page.reload()
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
  })

  await test.step('7. Ponovno odpri zavihek Schedule', async () => {
    await openTab(page, 'Schedule')
    await expectMondaySchedule(page)
  })
})
