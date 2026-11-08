import { test, expect } from './fixtures'

/**
 * TC-FL-006: Registracija z e-poštnim naslovom in geslom
 *
 * Predpogoji: frontend, backend in podatkovna baza so zagnani (Playwright
 * webServer); uporabnik ni prijavljen (nov kontekst brskalnika); e-poštni
 * naslov še ni registriran (enoličen naslov za vsak zagon).
 */
test('TC-FL-006: registracija z e-poštnim naslovom in geslom', async ({ page }, testInfo) => {
  const name = 'Testni Uporabnik'
  // Testni podatek iz TC: test.focuslock+006@example.com, razširjen z oznako
  // zagona, da je naslov ob vsakem zagonu še neregistriran.
  const email = `test.focuslock+006-${Date.now()}-${testInfo.workerIndex}-${testInfo.retry}@example.com`
  const password = 'Testiranje123!'

  await test.step('1. Odpri prijavno stran', async () => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Focus Lock' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign up', exact: true })).toBeVisible()
  })

  await test.step('2. Izberi zavihek Sign up', async () => {
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()
    await expect(page.getByText('Create an account to sync your focus sessions.')).toBeVisible()
    await expect(page.getByLabel(/^Name/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  })

  await test.step('3. Vnesi ime, e-poštni naslov in geslo', async () => {
    await page.getByLabel(/^Name/).fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel(/^Password/).fill(password)

    await expect(page.getByLabel(/^Name/)).toHaveValue(name)
    await expect(page.getByLabel('Email')).toHaveValue(email)
    await expect(page.getByLabel(/^Password/)).toHaveValue(password)
  })

  await test.step('4.–5. Klikni Create account in počakaj na zaključek registracije', async () => {
    const registerResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/auth/register') && res.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Create account' }).click()

    // Strežnik je račun ustvaril.
    expect((await registerResponse).status()).toBe(201)
    // Sporočilo o napaki se ne prikaže.
    await expect(page.getByRole('alert')).toHaveCount(0)
    // Uporabnik je preusmerjen na glavno stran s časovnikom.
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('timer')).toBeVisible()
  })

  await test.step('6. Odpri uporabniški meni', async () => {
    await page.getByRole('button', { name: /Testni Uporabnik/ }).click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu).toContainText(name)
    // Prikazan je registrirani e-poštni naslov (ne gostujoči način).
    await expect(menu).toContainText(email)
    await expect(menu).not.toContainText('Local only — not synced')
    await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeVisible()
  })
})
