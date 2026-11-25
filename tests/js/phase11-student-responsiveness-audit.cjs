/* Phase 11: student responsiveness, dark mode, accessibility — live browser checks */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const outDir = process.env.MUTQIN_QA_SHOTS || path.join(__dirname, 'screenshots', 'phase11-student-audit')
const password = process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!'
const email = process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com'
const viewports = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440]
const themes = ['light', 'dark']
const paneSpecs = [
  { id: 'home', labels: ['Home'] },
  { id: 'learning', labels: ['My learning', 'Learning'] },
  { id: 'progress', labels: ['Progress'] },
  { id: 'activity', labels: ['Activity'] },
  { id: 'messages', labels: ['Messages', 'Inbox'] },
  { id: 'settings', labels: ['Settings', 'Account'] },
]

async function selectPane(page, spec) {
  for (const label of spec.labels) {
    const btn = page.locator('.teacher-nav-shell:visible').getByRole('button', { name: label, exact: true })
    if (await btn.count()) {
      await btn.first().click()
      return true
    }
    const link = page.locator('.teacher-nav-shell:visible').getByRole('link', { name: label, exact: true })
    if (await link.count()) {
      await link.first().click()
      return true
    }
  }
  return false
}

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL((url) => url.pathname !== '/login')
  await page.goto(`${base}/progress`, { waitUntil: 'domcontentloaded' })
  await page.locator('.learner-home__header, #dash-welcome-heading').first().waitFor({ timeout: 45000 })
}

function defects() {
  return []
}

async function auditPane(page, spec, width, theme, shots) {
  const pane = spec.id
  const issues = []
  await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))

  const selected = await selectPane(page, spec)
  if (!selected) return [{ pane, width, theme, type: 'pane-unavailable' }]
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  if (overflow > 1) issues.push({ pane, width, theme, type: 'horizontal-overflow', overflow })

  const metrics = await page.evaluate((vpWidth) => {
    const visible = (el) => el && el.getClientRects().length && getComputedStyle(el).display !== 'none'
    const navEl = [...document.querySelectorAll('.dash-jump')].find(visible)
    const header = document.querySelector('.app-navbar')
    const navTop = navEl?.getBoundingClientRect().top ?? 0
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0
    const touchButtons = [...document.querySelectorAll('.teacher-nav-shell--mobile .teacher-nav__link:where(:not([hidden]))')]
      .filter(visible)
      .map((el) => el.getBoundingClientRect().height)
    const smallTouch = touchButtons.filter((h) => h > 0 && h < 44)
    const activeFilter = document.querySelector('#dash-my-learning .learner-teacher__filter.is-active, .dash-range-toggle .dash-btn.is-active')
    let filterContrast = null
    if (activeFilter && visible(activeFilter)) {
      const s = getComputedStyle(activeFilter)
      filterContrast = { bg: s.backgroundColor, color: s.color }
    }
    const wordReview = document.querySelector('.dash-fb-review-word')
    let wordReviewBg = null
    if (wordReview && visible(wordReview)) {
      wordReviewBg = getComputedStyle(wordReview).backgroundColor
    }
    const h1 = document.querySelector('h1, [role="heading"][aria-level="1"]')
    return {
      navBelowHeader: navTop >= headerBottom - 2,
      mobileNavMinHeight: touchButtons.length ? Math.min(...touchButtons) : null,
      smallMobileNav: smallTouch.length,
      filterContrast,
      wordReviewBg,
      hasH1: Boolean(h1 && visible(h1)),
      reducedMotion: getComputedStyle(document.documentElement).getPropertyValue('--motion-reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  }, width)

  if (!metrics.navBelowHeader && width < 992) {
    issues.push({ pane, width, theme, type: 'nav-under-header', metrics })
  }
  if (metrics.smallMobileNav > 0) {
    issues.push({ pane, width, theme, type: 'mobile-nav-touch-target', count: metrics.smallMobileNav, min: metrics.mobileNavMinHeight })
  }

  const focusTarget = page.locator(`#dash-${pane} .dash-btn:visible, #dash-${pane} button:visible`).first()
  if (pane !== 'settings' && await focusTarget.count()) {
    await focusTarget.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
    await focusTarget.focus()
    const focus = await focusTarget.evaluate((el) => {
      const s = getComputedStyle(el)
      return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth), boxShadow: s.boxShadow }
    })
    const hasFocusRing = (focus.outline === 'solid' && focus.width >= 2) || (focus.boxShadow && focus.boxShadow !== 'none')
    if (!hasFocusRing) issues.push({ pane, width, theme, type: 'missing-focus-ring', focus })
  }

  if ([390, 768, 1440].includes(width) && theme === 'dark' && ['home', 'progress', 'learning'].includes(pane)) {
    const file = `student-${pane}-${width}-${theme}.png`
    await page.screenshot({ path: path.join(outDir, file) })
    shots.push(file)
  }

  return issues
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const allIssues = []
  const shots = []

  try {
    await login(page)
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 })
      for (const theme of themes) {
        for (const spec of paneSpecs) {
          const issues = await auditPane(page, spec, width, theme, shots)
          allIssues.push(...issues)
        }
      }
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    const filter = page.locator('#learner-filter-all')
    if (await filter.count()) {
      await filter.focus()
      await filter.press('ArrowRight')
      assert.equal(await page.locator('#learner-filter-todo').getAttribute('aria-selected'), 'true', 'Arrow key moves filter tabs')
    }

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    const overflow200 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    if (overflow200 > 8) allIssues.push({ type: 'zoom-200-overflow', overflow: overflow200 })

    assert.deepEqual(errors, [], `Runtime errors: ${errors.join('; ')}`)
    fs.writeFileSync(path.join(outDir, 'issues.json'), JSON.stringify(allIssues, null, 2))
    console.log(JSON.stringify({
      viewports: viewports.length,
      themes: themes.length,
      panes: paneSpecs.length,
      issues: allIssues.length,
      shots: shots.length,
      issueSample: allIssues.slice(0, 20),
    }, null, 2))
    const realIssues = allIssues.filter((row) => row.type !== 'pane-unavailable')
    if (realIssues.length) process.exitCode = 2
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})