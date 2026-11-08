import { test, expect } from './fixtures'

/**
 * TC-FL-010: Obvestilo ob koncu fokusnega intervala
 *
 * Predpogoji: brskalnik podpira obvestila; dovoljenje ni blokirano. Korak 4
 * ("če brskalnik zahteva dovoljenje, izberi Allow") Playwright izvede tako,
 * da kontekstu brskalnika vnaprej podeli dovoljenje za obvestila.
 *
 * Sistemskega obvestila operacijskega sistema Playwright ne vidi, zato test
 * prestreže klice Notification / showNotification, s katerimi aplikacija
 * obvestilo prikaže, in preveri njihov naslov ter besedilo.
 */

type Shown = { title: string; body?: string }

test.use({ permissions: ['notifications'] })

test('TC-FL-010: obvestilo ob koncu fokusnega intervala', async ({ page, app }) => {
  // Interval traja 1 minuto (testni podatek), zato je časovna omejitev daljša.
  test.setTimeout(150_000)

  await page.addInitScript(() => {
    const shown: Shown[] = []
    ;(window as unknown as { __shownNotifications: Shown[] }).__shownNotifications = shown

    const original = ServiceWorkerRegistration.prototype.showNotification
    ServiceWorkerRegistration.prototype.showNotification = function (title, options) {
      shown.push({ title, body: options?.body })
      return original.call(this, title, options).catch(() => undefined)
    }

    const NativeNotification = window.Notification
    class RecordingNotification extends NativeNotification {
      constructor(title: string, options?: NotificationOptions) {
        super(title, options)
        shown.push({ title, body: options?.body })
      }
    }
    window.Notification = RecordingNotification as typeof Notification
  })

  const shownNotifications = () =>
    page.evaluate(() => (window as unknown as { __shownNotifications: Shown[] }).__shownNotifications)

  await test.step('Predpogoji: Focus Lock je odprt, časovnik ne teče, obvestila niso blokirana', async () => {
    await app.enterAsGuest()
    await expect(app.timer).toHaveAttribute('aria-label', /, paused$/)
    expect(await page.evaluate(() => Notification.permission)).not.toBe('denied')
  })

  await test.step('1. Odpri Settings', async () => {
    await app.openView('Settings')
  })

  await test.step('2. Nastavi trajanje Focus na 1 minuto', async () => {
    const focusMinutes = page.getByLabel('Focus', { exact: true })
    await focusMinutes.fill('1')
    await expect(focusMinutes).toHaveValue('1')
  })

  await test.step('3.–4. Izklopi in ponovno vključi Notifications ter dovoli obvestila', async () => {
    const notifications = page.getByRole('switch', { name: 'Notifications' })
    await expect(notifications).toBeEnabled()
    // Stikalo je privzeto vključeno, zato ga test najprej izklopi.
    await expect(notifications).toHaveAttribute('aria-checked', 'true')
    await notifications.click()
    await expect(notifications).toHaveAttribute('aria-checked', 'false')
    // Ponovni vklop sproži zahtevo za dovoljenje (tu je že podeljeno).
    await notifications.click()
    await expect(notifications).toHaveAttribute('aria-checked', 'true')
    expect(await page.evaluate(() => Notification.permission)).toBe('granted')
  })

  await test.step('5. Vrni se na časovnik in klikni Start', async () => {
    await app.openView('Timer')
    await expect(app.timer).toHaveAttribute('aria-label', 'Focus: 1 minute 0 seconds remaining, paused')
    await expect(app.timer).toContainText('01:00')
    await page.getByRole('button', { name: 'Start' }).click()
    await app.expectRunning()
    await app.expectRemainingBelow(60)
    // Ob zagonu aplikacija pošlje obvestilo o začetku seje.
    await expect
      .poll(shownNotifications)
      .toContainEqual({ title: 'Focus session started', body: 'Time to focus – eyes on the task.' })
  })

  await test.step('6. Počakaj, da se interval konča', async () => {
    await expect(app.timer).toHaveAttribute('aria-label', /^Short break: /, { timeout: 90_000 })
  })

  await test.step('7. Preveri obvestilo o koncu intervala', async () => {
    await expect
      .poll(shownNotifications)
      .toContainEqual({ title: 'Focus session complete', body: 'Nice work – time for a break.' })
  })
})
