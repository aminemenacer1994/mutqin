/* Read-only checks against the persisted local demo classroom. */
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
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${base}/login`)
    await page.locator('input[type=email]').fill(process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com')
    await page.locator('input[type=password]').fill(process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!')
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL(url => url.pathname !== '/login')
    await page.goto(`${base}/progress`)
    await page.locator('.dash-jump').getByRole('button', { name: 'My learning', exact: true }).click()
    await page.locator('.learner-teacher').waitFor()
    const results = []
    for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      for (const theme of ['light', 'sepia', 'dark']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value }, theme)
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
        assert.ok(overflow <= 1, `Learner ${width}px ${theme}: overflow ${overflow}`)
        results.push({ width, theme, overflow })
        if ([390, 1440].includes(width) && theme === 'light') await page.screenshot({ path: `${shots}/learner-${width}.png` })
      }
    }
    assert.equal(await page.getByText('This week: 0 of 0 done', { exact: true }).isVisible().catch(() => false), false, 'Empty weekly progress is hidden')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.learner-teacher__icon-hit--message').first().click()
    const thread = page.locator('.learner-task-thread-modal')
    await thread.waitFor()
    const input = thread.locator('textarea')
    assert.ok((await input.boundingBox()).width >= 270, 'Learner conversation has a usable composer')
    await page.screenshot({ path: `${shots}/learner-conversation-390.png` })
    await thread.locator('.learner-task-thread-modal__head').getByRole('button', { name: 'Close', exact: true }).click()
    await thread.waitFor({ state: 'hidden' })
    assert.deepEqual(errors, [], 'No learner runtime errors')
    fs.writeFileSync(`${shots}/learner-results.json`, JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ responsiveCases: results.length, conversation: true, emptyProgressHidden: true, runtimeErrors: errors.length }, null, 2))
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
