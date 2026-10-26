const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const widths = [360, 375, 390, 430, 768, 1024, 1440]
const themes = ['light', 'sepia', 'dark']

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('org.demo.halaqa.teacher@example.com')
  await page.locator('input[type=password]').fill('OrganisationDemo1!')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('**/teacher')
  await page.locator('.teacher-dashboard').waitFor()

  const results = []
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of themes) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value
      }, theme)
      for (const view of ['Overview', 'Students', 'Attendance', 'Tasks', 'Account']) {
        const nav = page.locator(width <= 960 ? '.teacher-nav-shell--mobile' : '.teacher-nav-shell--desktop')
        await nav.getByRole('button', { name: view, exact: true }).click()
        await page.waitForTimeout(350)
        const data = await page.evaluate(() => {
          const shell = document.querySelector('.teacher-dashboard__layout')
          const nav = document.querySelector(window.innerWidth <= 960 ? '.teacher-nav-shell--mobile' : '.teacher-nav-shell--desktop')
          const main = document.querySelector('.teacher-dashboard__main')
          const navbar = document.querySelector('header.navbar, nav.navbar, .navbar')
          const taskFilters = document.querySelector('.teacher-task-filters')
          const search = document.querySelector('.teacher-search--tasks')
          const add = document.querySelector('.teacher-task-add')
          const attendance = document.querySelector('.teacher-attendance__scroll')
          const filterClipped = taskFilters && window.innerWidth <= 520
            ? [...taskFilters.querySelectorAll('button')].some((button) => {
              const bounds = button.getBoundingClientRect()
              const container = taskFilters.getBoundingClientRect()
              return bounds.left < container.left - 1 || bounds.right > container.right + 1 || bounds.bottom > container.bottom + 1
            })
            : false
          const rect = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) } : null
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            shell: rect(shell), nav: rect(nav), main: rect(main), navbar: rect(navbar),
            filters: rect(taskFilters), filterClipped, search: rect(search), add: rect(add),
            attendance: rect(attendance),
            title: document.querySelector('.teacher-page-header__title')?.innerText || null,
            visibleHeading: !!document.querySelector('.teacher-page-header__title:not(.visually-hidden)'),
          }
        })
        results.push({ width, theme, view, ...data })
        if ((width === 390 || width === 1440) && (theme === 'sepia' || view === 'Tasks')) {
          await page.screenshot({ path: `/private/tmp/mutqin-${view.toLowerCase()}-${width}-${theme}.png`, fullPage: false })
        }
      }
    }
  }
  const defects = results.flatMap((result) => {
    const issues = []
    if (result.overflow > 0) issues.push(`page overflow ${result.overflow}px`)
    if (result.filterClipped) issues.push('task filter hidden or clipped')
    if (result.view === 'Attendance' && !result.attendance) issues.push('attendance grid missing')
    if (result.main && result.navbar && result.main.y - (result.navbar.y + result.navbar.height) < 12) issues.push('navbar gutter under 12px')
    if (result.view === 'Tasks' && result.filters && result.search) {
      const horizontal = result.filters.x >= result.search.x + result.search.width
      const gap = horizontal
        ? result.filters.x - (result.search.x + result.search.width)
        : result.filters.y - (result.search.y + result.search.height)
      if (gap < 12) issues.push(`search/filter gap ${gap}px`)
      if (result.add && result.add.x + result.add.width > result.width + 1) issues.push('Add task outside viewport')
    }
    return issues.map((issue) => `${result.width}px ${result.theme} ${result.view}: ${issue}`)
  })
  await page.locator('.teacher-nav-shell--desktop').getByRole('button', { name: 'Tasks', exact: true }).click()
  await page.locator('.teacher-loading-inline').waitFor({ state: 'hidden' })
  for (const filter of await page.locator('.teacher-task-filters button').all()) {
    const expected = Number(await filter.locator('.teacher-task-filter__count').innerText())
    await filter.click()
    await page.waitForTimeout(30)
    while (await page.locator('.teacher-more').count()) await page.locator('.teacher-more').click()
    const actual = await page.locator('.teacher-task-list li').count()
    if (expected !== actual) defects.push(`Tasks filter ${await filter.innerText()}: count ${expected}, rows ${actual}`)
  }
  await page.locator('.teacher-search--tasks input').fill('qa-no-matching-task-zzzz')
  await page.locator('.teacher-task-empty').waitFor()
  if (!await page.locator('.teacher-task-empty').getByText('No tasks match these filters.').count()) defects.push('Tasks search empty state missing')
  await page.locator('.teacher-task-empty button').click()
  await page.locator('.teacher-nav-shell--desktop').getByRole('button', { name: 'Students', exact: true }).click()
  await page.locator('.teacher-student-toolbar .teacher-search input').waitFor({ state: 'visible' })
  await page.locator('.teacher-student-toolbar .teacher-search input').fill('qa-no-matching-student-zzzz')
  await page.getByText('No students match these filters.').waitFor()
  await page.locator('.teacher-directory-actions__clear').click()
  await page.locator('.teacher-table__row').first().waitFor()
  await page.setViewportSize({ width: 390, height: 900 })
  const studentDensity = page.locator('.teacher-student-toolbar > .teacher-density-toggle')
  const densityWidth = await studentDensity.evaluate((element) => element.getBoundingClientRect().width)
  if (densityWidth < 140) defects.push(`Students compact toggle collapsed to ${Math.round(densityWidth)}px`)
  if (await page.locator('.teacher-student-cards').isVisible()) {
    await studentDensity.click()
    const table = page.locator('.teacher-table-wrap')
    await table.waitFor({ state: 'visible' })
    const initialScroll = await table.evaluate((element) => element.scrollLeft)
    await page.locator('.teacher-table-scrollbar button').last().click()
    await page.waitForTimeout(450)
    const afterScroll = await table.evaluate((element) => element.scrollLeft)
    if (afterScroll <= initialScroll) defects.push('Students compact table right-scroll control did not move the table')
    await studentDensity.click()
  }
  await page.locator('.teacher-nav-shell--mobile').getByRole('button', { name: 'Account', exact: true }).click()
  await page.locator('.teacher-account__email').evaluate((node) => { node.textContent = 'very-long-teacher-email-address-for-responsive-quality-check@example-mutqin-organisation.test' })
  const longEmailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (longEmailOverflow > 0) defects.push(`Account long email overflow ${longEmailOverflow}px`)
  console.log(JSON.stringify({ cases: results.length, defects, samples: results.filter((r) => (r.width === 390 || r.width === 1440) && r.theme === 'sepia') }, null, 2))
  if (defects.length) process.exitCode = 1
  await browser.close()
}

main().catch((error) => { console.error(error); process.exit(1) })
