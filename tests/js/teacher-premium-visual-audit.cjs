const { chromium } = require('playwright')

const routes = [
  ['overview', '/teacher'],
  ['students', '/teacher?view=students'],
  ['assignments', '/teacher?view=assignments'],
  ['settings', '/teacher?view=settings'],
  ['student-overview', '/teacher?view=student&student=20&section=overview'],
  ['student-practice', '/teacher?view=student&student=20&section=practice'],
  ['student-ai', '/teacher?view=student&student=20&section=ai'],
  ['student-weak', '/teacher?view=student&student=20&section=weak'],
  ['student-revision', '/teacher?view=student&student=20&section=revision'],
  ['student-tasks', '/teacher?view=student&student=20&section=tasks'],
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto('http://localhost:8000/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('org.demo.halaqa.teacher@example.com')
  await page.locator('input[type=password]').fill('OrganisationDemo1!')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('**/teacher')

  const checks = []
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['light', 'sepia', 'dark']) {
      for (const [name, route] of routes) {
        await page.goto(`http://localhost:8000${route}`, { waitUntil: 'domcontentloaded' })
        await page.locator('.teacher-dashboard').waitFor()
        await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
        await page.waitForTimeout(350)
        const result = await page.evaluate(() => {
          const dashboard = document.querySelector('.teacher-dashboard')
          const surface = document.querySelector('.teacher-pane, .teacher-hero, .teacher-table-wrap, .teacher-account')
          const visible = (selector) => {
            const node = document.querySelector(selector)
            return Boolean(node && getComputedStyle(node).display !== 'none')
          }
          return {
            overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
            background: getComputedStyle(dashboard).backgroundColor,
            surface: surface ? getComputedStyle(surface).backgroundColor : null,
            desktopNav: visible('.teacher-nav-shell--desktop'),
            mobileNav: visible('.teacher-nav-shell--mobile'),
          }
        })
        if (result.overflow > 0) throw new Error(`${width}px ${theme} ${name} overflows by ${result.overflow}px`)
        if (width < 992 && (!result.mobileNav || result.desktopNav)) throw new Error(`${width}px ${theme} ${name} has wrong navigation mode: ${JSON.stringify(result)}`)
        if (width >= 992 && (result.mobileNav || !result.desktopNav)) throw new Error(`${width}px ${theme} ${name} has wrong navigation mode: ${JSON.stringify(result)}`)
        checks.push({ width, theme, name, ...result })

        const desktopShot = width === 1440 && theme === 'sepia' && ['overview', 'students', 'assignments', 'settings', 'student-overview'].includes(name)
        const darkShot = width === 1440 && theme === 'dark' && ['overview', 'students'].includes(name)
        const mobileShot = width === 390 && theme === 'sepia' && ['overview', 'students', 'assignments', 'student-overview'].includes(name)
        if (desktopShot || darkShot || mobileShot) {
          await page.screenshot({ path: `/private/tmp/teacher-premium-${name}-${width}-${theme}.png`, fullPage: false })
        }
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:8000/teacher?view=assignments', { waitUntil: 'domcontentloaded' })
  await page.locator('.teacher-dashboard').waitFor()
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  await page.locator('.teacher-task-add').click()
  await page.locator('.teacher-task-modal').waitFor()
  await page.screenshot({ path: '/private/tmp/teacher-premium-modal-390-dark.png', fullPage: false })
  const modal = await page.evaluate(() => {
    const content = document.querySelector('.teacher-task-modal__content')
    const rect = content.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      background: getComputedStyle(content).backgroundColor,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    }
  })
  if (modal.left < 0 || modal.right > 391 || modal.top < 0 || modal.bottom > 845 || modal.overflow > 0) {
    throw new Error(`Mobile modal bounds failed: ${JSON.stringify(modal)}`)
  }

  console.log(JSON.stringify({ routeChecks: checks.length, modal }, null, 2))
  await browser.close()
}

main().catch((error) => { console.error(error); process.exit(1) })
