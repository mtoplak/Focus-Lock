import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { AGENT_URL, enterAsGuest, openTab, timerButton, timerDigits } from '../helpers/app'

const SITE = 'example.com'
const SITE_URL = `https://${SITE}`
const SITE_TITLE = 'Example Domain'

const urlBlockingKind = async (request: APIRequestContext): Promise<string | undefined> => {
  const response = await request.get(`${AGENT_URL}/status`)
  const body = (await response.json()) as { urlBlocking?: { kind: string; message?: string } }
  return body.urlBlocking?.kind
}

/** Returns the page title when the site loads, or the browser's network error when it doesn't. */
const visitSite = async (page: Page): Promise<string> => {
  try {
    await page.goto(SITE_URL, { timeout: 15_000 })
    return await page.title()
  } catch (error) {
    return (error as Error).message.match(/net::[A-Z_]+/)?.[0] ?? (error as Error).message
  }
}

test.afterEach(async ({ request }) => {
  // Leaves the agent idle even when an assertion fails mid-session.
  await request.post(`${AGENT_URL}/sync`, {
    data: { apps: [], urls: [], focusActive: false },
  })
})

test(
  'TC-FL-003: Blokiranje spletnega mesta med fokusno sejo',
  { tag: '@agent' },
  async ({ page, context, request }) => {
    test.setTimeout(240_000)
    await enterAsGuest(page)

    await test.step('Predpogoji: agent povezan, seja ne teče, ni urnika, mesto dosegljivo', async () => {
      expect((await request.get(`${AGENT_URL}/status`)).ok()).toBe(true)
      await expect(timerButton(page, 'Start')).toBeVisible()

      await openTab(page, 'Schedule')
      await expect(page.getByText('No schedule active right now')).toBeVisible()

      await openTab(page, 'Blocks')
      await page.getByRole('button', { name: 'App', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Pick from your installed apps' })).toBeEnabled()
      await page.getByRole('button', { name: 'Site', exact: true }).click()

      // Checked from Node so the browser under test holds no cached DNS entry
      // or open connection to the site before the block starts.
      const probe = await request.get(SITE_URL)
      expect(probe.ok()).toBe(true)
      expect(await probe.text()).toContain(SITE_TITLE)
      await openTab(page, 'Timer')
    })

    await test.step('1. Odpri zavihek Blocks', async () => {
      await openTab(page, 'Blocks')
      await expect(page.getByRole('heading', { name: 'Blocked distractions' })).toBeVisible()
    })

    await test.step(`2. Vnesi ${SITE} in klikni Add`, async () => {
      await page.getByLabel('Site to block').fill(SITE)
      await page.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(page.getByRole('switch', { name: `Block ${SITE}` })).toBeChecked()
    })

    await test.step('3. Vrni se na časovnik in klikni Start', async () => {
      await openTab(page, 'Timer')
      await timerButton(page, 'Start').click()
      await expect(timerButton(page, 'Pause')).toBeVisible()
      await expect(timerDigits(page)).not.toHaveText('25:00')
    })

    const sitePage = await context.newPage()

    await test.step(`4. V novem zavihku odpri ${SITE_URL}`, async () => {
      await expect
        .poll(() => urlBlockingKind(request), { timeout: 20_000, message: 'agent aktivira blokado' })
        .toBe('active')
      await expect
        .poll(() => visitSite(sitePage), { timeout: 90_000, message: 'mesto med sejo ni dosegljivo' })
        .toMatch(/^net::ERR_/)
    })

    await test.step('5. Ustavi oziroma ponastavi fokusno sejo', async () => {
      await timerButton(page, 'Reset').click()
      await expect(timerButton(page, 'Start')).toBeVisible()
      await expect(timerDigits(page)).toHaveText('25:00')
      await expect
        .poll(() => urlBlockingKind(request), { timeout: 20_000, message: 'agent odstrani blokado' })
        .toBe('idle')
    })

    await test.step(`6. Ponovno odpri ${SITE_URL}`, async () => {
      // The browser may hold the blocked DNS answer for its 60 s TTL.
      await expect
        .poll(() => visitSite(sitePage), { timeout: 90_000, message: 'mesto je spet dosegljivo' })
        .toBe(SITE_TITLE)
    })
  },
)
