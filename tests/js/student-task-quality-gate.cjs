const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const widths = [360, 375, 390, 430, 768, 1024, 1440]
const themes = ['light', 'sepia', 'dark']

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('org.demo.halaqa.student1@example.com')
  await page.locator('input[type=password]').fill('OrganisationDemo1!')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL((url) => url.pathname !== '/login')
  await page.goto(`${base}/progress`, { waitUntil: 'domcontentloaded' })
  await page.locator('.learner-teacher').waitFor()
  await page.locator('.learner-teacher__filters button').first().waitFor()

  const results = []
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of themes) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      await page.waitForTimeout(100)
      const data = await page.evaluate(() => {
        const section = document.querySelector('.learner-teacher')
        const filters = [...document.querySelectorAll('.learner-teacher__filters button')]
        const rect = section?.getBoundingClientRect()
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          section: rect ? { x: Math.round(rect.x), width: Math.round(rect.width) } : null,
          filters: filters.map((el) => el.textContent.trim()),
          forbiddenMarkComplete: [...document.querySelectorAll('.learner-teacher__complete')].filter((el) => el.disabled).length,
        }
      })
      results.push({ width, theme, ...data })
      if (width === 390) {
        await page.locator('.learner-teacher').screenshot({ path: `/private/tmp/mutqin-student-tasks-390-${theme}.png` })
      }
    }
  }
  const defects = results.flatMap((row) => {
    const issues = []
    if (row.overflow > 0) issues.push(`page overflow ${row.overflow}px`)
    if (row.filters.length !== 3) issues.push(`expected 3 task filters, got ${row.filters.length}`)
    if (row.forbiddenMarkComplete) issues.push('disabled Mark complete still visible')
    return issues.map((issue) => `${row.width}px ${row.theme}: ${issue}`)
  })
  await page.route('**/me/support', async (route) => {
    const response = await route.fetch()
    const data = await response.json()
    const original = data.assignments?.[0]
    if (!original) throw new Error('No real assignment available as a test fixture')
    data.assignments = Array.from({ length: 6 }, (_, index) => ({
      ...original,
      id: -100 - index,
      status: 'completed',
      completed_at: '2026-10-22T12:00:00Z',
      progress: { ...original.progress, completed: 1, target: 1, activity_count: 1 },
    }))
    await route.fulfill({ response, json: data })
  })
  await page.goto(`${base}/progress`, { waitUntil: 'domcontentloaded' })
  await page.locator('.learner-teacher__filters button').filter({ hasText: 'Done' }).click()
  const beforeMore = await page.locator('.learner-teacher__list li').count()
  await page.locator('.learner-teacher__footer button').click()
  const afterMore = await page.locator('.learner-teacher__list li').count()
  if (beforeMore !== 4 || afterMore !== 6) defects.push(`Done load more failed: ${beforeMore} to ${afterMore}`)
  console.log(JSON.stringify({ cases: results.length, defects, completedLoadMore: { beforeMore, afterMore }, sample: results.find((r) => r.width === 390 && r.theme === 'sepia') }, null, 2))
  if (defects.length) process.exitCode = 1
  await browser.close()
}

main().catch((error) => { console.error(error); process.exit(1) })
