/* Read-only analytics checks against the persisted local learner account. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const shots = process.env.MUTQIN_QA_SHOTS || '/private/tmp/mutqin-workspace-qa'

async function main() {
  fs.mkdirSync(shots, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto(`${base}/login`)
    await page.locator('input[type=email]').fill(process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com')
    await page.locator('input[type=password]').fill(process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!')
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL((url) => url.pathname !== '/login')
    await page.goto(`${base}/progress`)
    await page.locator('.dash-jump').getByRole('button', { name: 'Progress', exact: true }).click()
    const entry = page.locator('.dash-basic-analytics__cta')
    await entry.waitFor()
    const advancedAccess = await page.evaluate(async () => (await fetch('/api/analytics/advanced', { headers: { Accept: 'application/json' } })).status)
    assert.equal(advancedAccess, 403, 'Ordinary learner cannot access advanced analytics')
    assert.equal(await page.locator('[data-testid=advanced-analytics-entry]').count(), 0, 'Advanced analytics entry follows existing entitlement')

    const results = []
    for (const width of [375, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      for (const theme of ['light', 'sepia', 'dark']) {
        await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
        await entry.click()
        const dialog = page.locator('.aa-modal--basic')
        await dialog.waitFor()
        const geometry = await dialog.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          const body = element.querySelector('.aa-body')
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, overflow: body.scrollWidth - body.clientWidth, cards: element.querySelectorAll('.aa-kpi').length }
        })
        assert.ok(geometry.left >= 0 && geometry.right <= width + 1, `${width}px ${theme}: dialog fits width`)
        assert.ok(geometry.top >= 0 && geometry.bottom <= 901, `${width}px ${theme}: dialog fits height`)
        assert.ok(geometry.overflow <= 1, `${width}px ${theme}: analytics body does not overflow`)
        assert.equal(geometry.cards, 7, 'Four learning totals and three weekly metrics use persisted dashboard values')
        assert.equal(await page.evaluate(() => document.body.classList.contains('modal-open')), true, 'Document stays locked while analytics is open')
        const close = dialog.getByRole('button', { name: 'Close', exact: true })
        assert.ok((await close.boundingBox()).height >= (width <= 600 ? 44 : 40), 'Close control has a usable touch target')
        await dialog.press('Tab')
        assert.equal(await close.evaluate((element) => element === document.activeElement), true, 'Keyboard reaches close control')
        if ([375, 1440].includes(width)) await page.screenshot({ path: `${shots}/analytics-basic-${width}-${theme}.png` })
        await page.keyboard.press('Escape')
        await dialog.waitFor({ state: 'hidden' })
        assert.equal(await entry.evaluate((element) => element === document.activeElement), true, 'Closing returns focus to the analytics entry')
        assert.equal(await page.evaluate(() => document.body.classList.contains('modal-open')), false, 'Closing analytics releases its document lock')
        results.push({ width, theme, ...geometry })
      }
    }
    assert.deepEqual(errors, [], 'No analytics runtime errors')
    fs.writeFileSync(`${shots}/analytics-results.json`, JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ responsiveCases: results.length, advancedGatePreserved: true, focusAndScrollLock: true, runtimeErrors: errors.length }, null, 2))
  } finally { await browser.close() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
