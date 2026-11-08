import { test, expect } from './fixtures'

/**
 * TC-FL-009: Uporaba časovnika brez internetne povezave
 *
 * Test teče na produkcijski gradnji (vite build + vite preview), da je
 * service worker z vnaprej shranjenimi datotekami aktiven kot v pravi
 * namestitvi. Izklop povezave izvede Playwright (context.setOffline), ki
 * prekine tudi promet do localhost — tako osvežitev v koraku 4 uspe samo,
 * če stran res postreže service worker.
 */
test('TC-FL-009: uporaba časovnika brez internetne povezave', async ({ page, context, app }) => {
  const offlineBanner = page.getByText(
    "You're offline. Timer and blocking still work. Sign-in and push notifications need a connection.",
  )

  await test.step('Predpogoji: PWA je naložena, service worker nadzoruje stran, gostujoči način', async () => {
    await app.enterAsGuest()
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null)
    await expect(app.timer).toHaveAttribute('aria-label', /^Focus: .*, paused$/)
    await expect(offlineBanner).toBeHidden()
  })

  await test.step('1. Onemogoči internetno povezavo', async () => {
    await context.setOffline(true)
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false)
    await expect(app.timer).toBeVisible()
  })

  await test.step('2. Aplikacija opozori na težavo s povezavo, a ostane uporabna', async () => {
    await expect(offlineBanner).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  let secondsAtStart = 0
  await test.step('3. Zaženi fokusni časovnik', async () => {
    secondsAtStart = await app.remainingSeconds()
    await page.getByRole('button', { name: 'Start' }).click()
    await app.expectRunning()
    await app.expectRemainingBelow(secondsAtStart)
  })

  let secondsBeforeReload = 0
  await test.step('4. Počakaj najmanj 5 sekund in osveži stran', async () => {
    // Čakanje na pogoj namesto fiksne pavze: vsaj 5 s je preteklo.
    await expect
      .poll(() => app.remainingSeconds(), { timeout: 15_000 })
      .toBeLessThanOrEqual(secondsAtStart - 5)
    secondsBeforeReload = await app.remainingSeconds()

    await page.reload()
    // PWA se po osvežitvi ponovno odpre (postreže jo service worker).
    await expect(app.timer).toBeVisible()
    await expect(offlineBanner).toBeVisible()
  })

  await test.step('5. Stanje tekoče seje se obnovi iz lokalne shrambe', async () => {
    await expect(app.timer).toHaveAttribute('aria-label', /^Focus: .*, running$/)
    const restored = await app.remainingSeconds()
    // Čas ni bil ponastavljen na začetek in je med osvežitvijo tekel naprej.
    expect(restored).toBeLessThanOrEqual(secondsBeforeReload)
    expect(restored).toBeGreaterThan(secondsBeforeReload - 15)
    await app.expectRemainingBelow(restored)
  })

  await test.step('6. Ponovno omogoči internetno povezavo', async () => {
    await context.setOffline(false)
    await expect(offlineBanner).toBeHidden()
    await expect(page.getByText(/No internet connection|Can't reach/)).toHaveCount(0)
    // Aplikacija ostane uporabna: seja še vedno teče, navigacija deluje.
    await app.expectRunning()
    await app.openView('Settings')
    await app.openView('Timer')
    await app.expectRunning()
  })
})
