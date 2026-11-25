const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const outDir = path.join(__dirname, 'screenshots', 'phase4-parent-platform-audit')
const password = process.env.MUTQIN_QA_PASSWORD || 'ParentDemo1!'
const teacherPassword = process.env.MUTQIN_QA_TEACHER_PASSWORD || 'OrganisationDemo1!'
const parentEmail = process.env.MUTQIN_QA_PARENT_EMAIL || 'guardian.menacer@mutqin.test'
const teacherEmail = process.env.MUTQIN_QA_TEACHER_EMAIL || 'org.demo.halaqa.teacher@example.com'

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

const parentNav = [
  { id: 'overview', pattern: /home/i },
  { id: 'progress', pattern: /progress/i },
  { id: 'messages', pattern: /messages/i },
  { id: 'more', pattern: /more/i },
]

const parentMoreDestinations = [
  { id: 'children', pattern: /children/i },
  { id: 'learning', pattern: /homework|learning/i },
  { id: 'reports', pattern: /reports/i },
  { id: 'settings', pattern: /settings/i },
]

async function login(page, email, pass = password) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(pass)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 })
}

async function openParentNav(page, pattern) {
  const candidates = page.getByRole('button', { name: pattern })
  const count = await candidates.count()
  for (let i = 0; i < count; i++) {
    const btn = candidates.nth(i)
    if (await btn.isVisible()) {
      await btn.click()
      await page.waitForTimeout(400)
      return true
    }
  }
  return false
}

async function openMoreHubTile(page, pattern) {
  const tile = page.locator('.parent-more-tile').filter({ hasText: pattern })
  if (await tile.count()) {
    await tile.first().click()
    await page.waitForTimeout(400)
    return true
  }
  return false
}

async function auditParent(page, viewport, theme) {
  await page.evaluate((value) => {
    document.documentElement.dataset.theme = value
    document.documentElement.lang = value === 'ar' ? 'ar' : 'en'
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'
  }, theme)
  await page.waitForTimeout(150)
  const issues = []
  const shell = page.locator('[data-platform-shell="parent"]')
  if (!(await shell.count())) issues.push('missing parent shell')
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth + 2
  })
  if (overflow) issues.push('horizontal overflow')
  for (const item of parentNav) {
    const ok = await openParentNav(page, item.pattern)
    if (!ok) issues.push(`nav missing: ${item.id}`)
    await page.screenshot({
      path: path.join(outDir, `parent-${item.id}-${viewport.name}-${theme}.png`),
      fullPage: true,
    })
    if (item.id === 'more') {
      for (const dest of parentMoreDestinations) {
        const opened = await openMoreHubTile(page, dest.pattern)
        if (!opened) issues.push(`more missing: ${dest.id}`)
        await page.screenshot({
          path: path.join(outDir, `parent-${dest.id}-${viewport.name}-${theme}.png`),
          fullPage: true,
        })
        await openParentNav(page, /more/i)
      }
    }
  }
  return issues
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const report = { parent: [], teacher: [], integration: [] }

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
  await login(page, parentEmail)
    await page.goto(`${base}/parent`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-platform-shell="parent"]').waitFor({ timeout: 30000 })
    for (const theme of ['light', 'dark', 'ar']) {
      report.parent.push({
        viewport: viewport.name,
        theme,
        issues: await auditParent(page, viewport, theme),
      })
    }
    await page.close()
  }

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    await login(page, teacherEmail, teacherPassword)
    await page.goto(`${base}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.locator('.teacher-dashboard').first().waitFor({ timeout: 30000 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      await page.waitForTimeout(150)
      await page.screenshot({ path: path.join(outDir, `teacher-desktop-${theme}.png`), fullPage: true })
      const tokens = await page.evaluate(() => {
        const el = document.querySelector('.teacher-dashboard')
        if (!el) return null
        const s = getComputedStyle(el)
        return { fontFamily: s.fontFamily, background: s.backgroundColor }
      })
      report.teacher.push({ theme, tokens })
    }
    await page.close()
  } catch (error) {
    report.teacher.push({ skipped: true, reason: error.message })
  }

  await browser.close()
  const summaryPath = path.join(outDir, 'report.json')
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ outDir, summaryPath, report }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})