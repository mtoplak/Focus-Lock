import { test, expect } from './fixtures'

/**
 * TC-FL-007: Zaklep kontrol v strogem načinu
 *
 * Predpogoji: uporabnik je v aplikaciji (gostujoči način), časovnik ne teče,
 * izbran je način Focus, na seznamu blokad je vsaj en vnos (privzeti
 * seznam vsebuje youtube.com).
 */
test('TC-FL-007: strogi način zaklene kontrole med fokusno sejo', async ({ page, app }) => {
  const timerMode = page.getByRole('group', { name: 'Timer mode' })

  await test.step('Predpogoji', async () => {
    await app.enterAsGuest()
    await expect(app.timer).toHaveAttribute('aria-label', /^Focus: .*, paused$/)
    await expect(timerMode.getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-pressed', 'true')
    await app.openView('Blocks')
    await expect(page.getByRole('switch', { name: 'Block youtube.com' })).toBeVisible()
  })

  await test.step('1. V nastavitvah vključi Strict mode', async () => {
    await app.openView('Settings')
    const strict = page.getByRole('switch', { name: 'Strict mode' })
    await expect(strict).toHaveAttribute('aria-checked', 'false')
    await strict.click()
    await expect(strict).toHaveAttribute('aria-checked', 'true')
  })

  let secondsAtStart = 0
  await test.step('2. Vrni se na časovnik in klikni Start', async () => {
    await app.openView('Timer')
    secondsAtStart = await app.remainingSeconds()
    await page.getByRole('button', { name: 'Start' }).click()
    await app.expectRunning()
    await app.expectRemainingBelow(secondsAtStart)
    await expect(page.getByText('Strict mode locked')).toBeVisible()
  })

  await test.step('3. Poskusi uporabiti Pause, Reset in Skip', async () => {
    await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Reset' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Skip' })).toBeDisabled()

    // Poskus prek bližnjic na tipkovnici (Space = pavza, R = reset, S = skip).
    const before = await app.remainingSeconds()
    await page.locator('body').press(' ')
    await page.locator('body').press('r')
    await page.locator('body').press('s')

    // Interval se ni ustavil, ponastavil ali preskočil: še vedno Focus in odšteva.
    await app.expectRunning()
    await expect(app.timer).toHaveAttribute('aria-label', /^Focus: /)
    await app.expectRemainingBelow(before)
  })

  await test.step('4. Poskusi spremeniti način časovnika', async () => {
    const shortBreak = timerMode.getByRole('button', { name: 'Short break' })
    await expect(shortBreak).toBeDisabled()
    await expect(timerMode.getByRole('button', { name: 'Long break' })).toBeDisabled()
    await page.locator('body').press('2')

    await expect(timerMode.getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-pressed', 'true')
    await expect(app.timer).toHaveAttribute('aria-label', /^Focus: .*, running$/)
  })

  await test.step('5. Na seznamu blokad poskusi dodati, odstraniti ali izklopiti vnos', async () => {
    await app.openView('Blocks')
    const entry = page.getByRole('switch', { name: 'Block youtube.com' })

    // Dodajanje: vnosno polje in gumb Add sta onemogočena.
    await expect(page.getByRole('textbox', { name: 'Site to block' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
    // Izklop: stikalo vnosa je onemogočeno in stanje ostane nespremenjeno.
    await expect(entry).toBeDisabled()
    await expect(entry).toHaveAttribute('aria-checked', 'true')
    // Odstranitev: gumb za odstranitev je v strogem načinu skrit.
    await expect(page.getByRole('button', { name: 'Remove youtube.com' })).toBeHidden()
    await expect(page.getByText('youtube.com', { exact: true })).toBeVisible()
  })

  await test.step('6. V nastavitvah poskusi spremeniti trajanje seje', async () => {
    await app.openView('Settings')
    const focusMinutes = page.getByLabel('Focus', { exact: true })
    await expect(focusMinutes).toHaveValue('25')
    await expect(focusMinutes).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Increase focus' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Decrease focus' })).toBeDisabled()
    await expect(page.getByRole('switch', { name: 'Strict mode' })).toBeDisabled()
    await expect(page.getByText('Locked while a strict-mode focus session is running.')).toBeVisible()

    // Trajanje ostane nespremenjeno, časovnik pa še naprej odšteva.
    await expect(focusMinutes).toHaveValue('25')
    await app.openView('Timer')
    await app.expectRunning()
    const now = await app.remainingSeconds()
    await app.expectRemainingBelow(now)
  })
})
