import type { Page } from '@playwright/test'
import { test, expect, AGENT_URL } from './fixtures'

/**
 * TC-FL-008: Blokiranje namizne aplikacije med fokusno sejo
 *
 * Pravi namizni agent teče samo v sistemu Windows s skrbniškimi pravicami,
 * zato ga v tem testu nadomesti lažni agent na http://127.0.0.1:7777. Lažni
 * agent se odziva z enakimi končnimi točkami (/status, /installed-apps,
 * /sync) in obnašanjem kot pravi agent (src/blocker.rs): proces zapre samo,
 * ko PWA sporoči focusActive = true in je aplikacija na seznamu blokad.
 *
 * Test tako preveri celotno verigo na strani PWA: izbira aplikacije →
 * vnos na seznamu → ob začetku fokusa agentu pošlje ukaz za blokado → prikaže
 * zaprtje, ki ga javi agent. Da Windows proces res zapre, se preveri ročno
 * (glej TC-FL-008 v docs/FUNKCIONALNI_TESTNI_PRIMERI.md).
 */

type SyncPayload = { apps: string[]; urls: string[]; focusActive: boolean }

/** Stanje lažnega agenta: Beležnica je zagnana, dokler je agent ne "zapre". */
class FakeAgent {
  syncs: SyncPayload[] = []
  notepadRunning = true
  killCounts: Record<string, number> = {}
  lastKill: string | undefined
  /** Scans done while notepad.exe was on the list but no focus session ran. */
  scansWithoutFocus = 0

  get lastSync(): SyncPayload | undefined {
    return this.syncs.at(-1)
  }

  /** Simulates one blocker scan (desktop-agent/src/blocker.rs). */
  scan(): void {
    const sync = this.lastSync
    const listed = sync?.apps.map((a) => a.toLowerCase()).includes('notepad.exe') ?? false
    if (listed && !sync?.focusActive) this.scansWithoutFocus += 1
    if (!sync?.focusActive || !this.notepadRunning) return
    if (sync.apps.map((a) => a.toLowerCase()).includes('notepad.exe')) {
      this.notepadRunning = false
      this.lastKill = 'Notepad.exe'
      this.killCounts['Notepad.exe'] = (this.killCounts['Notepad.exe'] ?? 0) + 1
    }
  }

  /** "Zaženi Beležnico" — the user launches the app again. */
  launchNotepad(): void {
    this.notepadRunning = true
  }

  async install(page: Page): Promise<void> {
    await page.route(`${AGENT_URL}/status`, (route) => {
      this.scan()
      return route.fulfill({
        json: {
          version: 'e2e-fake',
          lastKill: this.lastKill,
          killCounts: this.killCounts,
          urlBlockCounts: {},
          urlBlocking: { kind: 'idle' },
        },
      })
    })
    await page.route(`${AGENT_URL}/installed-apps`, (route) =>
      route.fulfill({
        json: {
          apps: [
            {
              exe: 'notepad.exe',
              displayName: 'Notepad',
              running: this.notepadRunning,
              instances: this.notepadRunning ? 1 : 0,
              hasIcon: false,
            },
            { exe: 'vlc.exe', displayName: 'VLC media player', running: false, instances: 0, hasIcon: false },
          ],
        },
      }),
    )
    await page.route(`${AGENT_URL}/sync`, (route) => {
      this.syncs.push(route.request().postDataJSON() as SyncPayload)
      return route.fulfill({ json: { ok: true } })
    })
    await page.route(`${AGENT_URL}/icon/**`, (route) => route.fulfill({ status: 404 }))
  }
}

test('TC-FL-008: blokiranje namizne aplikacije med fokusno sejo', async ({ page, app }) => {
  const agent = new FakeAgent()
  await agent.install(page)

  await test.step('Predpogoji: agent je povezan, fokus ne teče, notepad.exe ni na seznamu', async () => {
    await app.enterAsGuest()
    await expect(app.timer).toHaveAttribute('aria-label', /, paused$/)
    await app.openView('Blocks')
    await expect(page.getByText('notepad.exe', { exact: true })).toHaveCount(0)
  })

  await test.step('1. Na zavihku Blocks izberi vrsto App', async () => {
    const appKind = page.getByRole('group', { name: 'Type of distraction to add' }).getByRole('button', { name: 'App' })
    await appKind.click()
    await expect(appKind).toHaveAttribute('aria-pressed', 'true')
    // Gumb izbirnika je omogočen samo, ko je agent povezan.
    await expect(page.getByRole('button', { name: 'Pick from your installed apps' })).toBeEnabled()
  })

  await test.step('2. V izbirniku izberi notepad.exe in ga dodaj na seznam', async () => {
    await page.getByRole('button', { name: 'Pick from your installed apps' }).click()
    const picker = page.getByRole('dialog', { name: 'Pick apps to block' })
    await expect(picker).toBeVisible()

    const notepad = picker.getByRole('button', { name: /Notepad.*notepad\.exe/ })
    await expect(notepad).toContainText('running')
    await notepad.click()
    await expect(picker.getByText('1 selected')).toBeVisible()
    await picker.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(picker).toBeHidden()

    const entry = page.getByRole('switch', { name: 'Block notepad.exe' })
    await expect(entry).toBeVisible()
    await expect(entry).toHaveAttribute('aria-checked', 'true')
  })

  await test.step('3. Počakaj najmanj 5 sekund — Beležnica pred začetkom fokusa ostane odprta', async () => {
    // PWA agentu sporoči seznam z notepad.exe, a brez aktivnega fokusa.
    await expect.poll(() => agent.lastSync).toMatchObject({ focusActive: false })
    expect(agent.lastSync?.apps).toContain('notepad.exe')
    // Čakanje na pogoj: agent je z novim seznamom vsaj dvakrat pregledal procese
    // (PWA ga vpraša vsake 4 s, torej je preteklo več kot 5 s) in Beležnice ni zaprl.
    await expect.poll(() => agent.scansWithoutFocus, { timeout: 15_000 }).toBeGreaterThanOrEqual(2)
    await expect(page.getByText(/^Desktop agent connected$/)).toBeVisible()
    expect(agent.notepadRunning).toBe(true)
    expect(agent.killCounts).toEqual({})
  })

  await test.step('4. Vrni se na časovnik in klikni Start', async () => {
    await app.openView('Timer')
    const startSeconds = await app.remainingSeconds()
    await page.getByRole('button', { name: 'Start' }).click()
    await app.expectRunning()
    await app.expectRemainingBelow(startSeconds)
  })

  await test.step('5. Agent zapre odprto Beležnico', async () => {
    // PWA ob začetku fokusa agentu pošlje ukaz za blokado.
    await expect.poll(() => agent.lastSync).toMatchObject({ focusActive: true })
    expect(agent.lastSync?.apps).toContain('notepad.exe')

    await app.openView('Blocks')
    await expect(page.getByText('Desktop agent connected — last block: Notepad.exe')).toBeVisible()
    expect(agent.notepadRunning).toBe(false)
    expect(agent.killCounts['Notepad.exe']).toBe(1)
  })

  await test.step('6. Med še aktivno sejo ponovno zaženi Beležnico — agent jo spet zapre', async () => {
    agent.launchNotepad()
    await expect.poll(() => agent.killCounts['Notepad.exe'], { timeout: 15_000 }).toBe(2)
    expect(agent.notepadRunning).toBe(false)
    // Fokusna seja je še vedno aktivna.
    expect(agent.lastSync?.focusActive).toBe(true)
  })
})
