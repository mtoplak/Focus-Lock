import { expect, test } from '@playwright/test'
import { API_URL, timerDigits, timerRegion } from '../helpers/app'

test('TC-FL-001: Vstop v aplikacijo kot gost', async ({ page, request }) => {
  await test.step('Predpogoj: backend je zagnan', async () => {
    expect((await request.get(`${API_URL}/api/health`)).ok()).toBe(true)
  })

  const guestButton = page.getByRole('button', { name: 'Continue as guest' })

  await test.step('1. Odpri Focus Lock v brskalniku', async () => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(guestButton).toBeVisible()
  })

  await test.step('2. Klikni Continue as guest', async () => {
    await guestButton.click()
    await expect(guestButton).toBeHidden()
  })

  await test.step('3. Počakaj, da se naloži glavna stran', async () => {
    await expect(page).not.toHaveURL(/\/login/)
    await expect(timerRegion(page)).toBeVisible()
    await expect(timerDigits(page)).toHaveText('25:00')
  })

  await test.step('4. Odpri uporabniški meni', async () => {
    await page.locator('button[aria-haspopup="menu"]:visible').click()
    await expect(page.getByRole('menu')).toContainText('Local only — not synced')
  })
})
