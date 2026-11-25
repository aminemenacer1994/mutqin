const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const outDir = path.join(__dirname, 'screenshots', 'phase4-teacher-journey-audit')
const password = process.env.MUTQIN_QA_TEACHER_PASSWORD || 'OrganisationDemo1!'
const email = process.env.MUTQIN_QA_TEACHER_EMAIL || 'org.demo.halaqa.teacher@example.com'

async function login(page) {
  const t0 = Date.now()
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 })
  return Date.now() - t0
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const report = { steps: [], issues: [] }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  try {
    report.steps.push({ id: 'login', ms: await login(page) })
    const tTeacher = Date.now()
    await page.goto(`${base}/teacher`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-platform-shell="teacher"]').waitFor({ timeout: 30000 })
    report.steps.push({ id: 'teacher_shell', ms: Date.now() - tTeacher })

  const tAssign = Date.now()
    const assignments = page.getByRole('button', { name: /assignments/i })
    if (await assignments.count()) {
      await assignments.first().click()
    } else {
      report.issues.push('nav missing: assignments')
    }
    await page.waitForTimeout(400)
    report.steps.push({ id: 'assignments_view', ms: Date.now() - tAssign })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
    if (overflow) report.issues.push('horizontal overflow')

    await page.screenshot({ path: path.join(outDir, 'teacher-assignments-desktop-light.png'), fullPage: true })
    if (errors.length) report.issues.push(`runtime: ${errors.join('; ')}`)

    const artifact = path.join(outDir, 'journey.json')
    fs.writeFileSync(artifact, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ outDir, artifact, report }, null, 2))
    if (report.issues.length) process.exitCode = 2
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})