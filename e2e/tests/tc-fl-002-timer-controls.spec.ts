import { expect, test } from '@playwright/test'
import { enterAsGuest, timerButton, timerDigits, timerRegion } from '../helpers/app'

test('TC-FL-002: Zagon, premor in ponastavitev fokusnega časovnika', async ({ page }) => {
  // The controlled clock replaces real waiting, so the test needs no fixed pauses.
  await page.clock.install({ time: new Date('2026-11-09T10:00:00') })
  await enterAsGuest(page)
  await page.clock.pauseAt(new Date('2026-11-09T10:05:00'))

  await test.step('Predpogoji: način Focus, strogi način izklopljen, časovnik ne teče', async () => {
    await expect(page.getByRole('button', { name: 'Focus', exact: true, pressed: true })).toBeVisible()
    await expect(page.getByText('Strict mode locked')).toBeHidden()
    await expect(timerButton(page, 'Reset')).toBeEnabled()
    await expect(timerRegion(page)).toHaveAccessibleName(/paused/)
  })

  await test.step('1. Zabeleži začetni prikazani čas', async () => {
    await expect(timerDigits(page)).toHaveText('25:00')
    await expect(timerButton(page, 'Start')).toBeVisible()
  })

  await test.step('2. Klikni Start', async () => {
    await timerButton(page, 'Start').click()
    await expect(timerRegion(page)).toHaveAccessibleName(/running/)
    await page.clock.runFor(1_000)
    await expect(timerDigits(page)).toHaveText('24:59')
  })

  await test.step('3. Počakaj najmanj 3 sekunde', async () => {
    await page.clock.runFor(2_000)
    await expect(timerDigits(page)).toHaveText('24:57')
  })

  await test.step('4. Klikni Pause', async () => {
    await timerButton(page, 'Pause').click()
    await expect(timerButton(page, 'Start')).toBeVisible()
    await expect(timerRegion(page)).toHaveAccessibleName(/paused/)
  })

  await test.step('5. Preveri, da se odštevanje ustavi', async () => {
    await page.clock.runFor(5_000)
    await expect(timerDigits(page)).toHaveText('24:57')
  })

  await test.step('6. Klikni Reset', async () => {
    await timerButton(page, 'Reset').click()
    await expect(timerDigits(page)).toHaveText('25:00')
    await page.clock.runFor(3_000)
    await expect(timerDigits(page)).toHaveText('25:00')
    await expect(timerButton(page, 'Start')).toBeVisible()
    await expect(timerRegion(page)).toHaveAccessibleName(/paused/)
  })
})
