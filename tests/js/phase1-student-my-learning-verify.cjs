const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${base}/login`)
  await page.locator('input[type=email]').fill(process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com')
  await page.locator('input[type=password]').fill(process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL((url) => url.pathname !== '/login')
  await page.goto(`${base}/progress?tab=learning`)
  await page.locator('#dash-my-learning').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.learner-teacher__filters--segmented button').first().waitFor({ state: 'visible', timeout: 30000 })

  const primaryTabs = await page.locator('.learner-teacher__filters--segmented button').count()
  assert.equal(primaryTabs, 4, 'primary tabs')

  const dueFilters = await page.locator('.learner-teacher__filters--secondary button').count()
  assert.equal(dueFilters, 4, 'due filters')

  const row = page.locator('.learner-teacher__task-row').first()
  if (await row.count()) {
    const progressBar = row.locator('.learner-teacher__task-row__progress .learner-teacher__progress-meter')
    if (await progressBar.count()) {
      const height = await progressBar.evaluate((el) => el.getBoundingClientRect().height)
      assert.ok(height <= 6, 'progress bar height')
    }
  }

  for (const tab of ['To do', 'In progress', 'Awaiting review', 'Done']) {
    const btn = page.locator('.learner-teacher__filters--segmented button').filter({ hasText: tab }).first()
    if (await btn.count()) await btn.click()
    await page.waitForTimeout(150)
  }

  const collapse = page.locator('#learner-learning-connections-heading')
  if (await collapse.count()) {
    await page.locator('button[aria-controls="learner-learning-connections-body"]').click()
    await page.locator('#learner-learning-connections-body .learner-circle').waitFor({ state: 'visible' })
  }

  await browser.close()
  console.log('phase1-student-my-learning-verify.cjs: ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})