const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const outDir = path.join(__dirname, 'screenshots', 'phase1-student-my-learning-audit')
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]
const themes = ['light', 'dark']
const accounts = [
  { role: 'student', email: process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com', route: '/progress?tab=learning' },
  { role: 'teacher', email: process.env.MUTQIN_QA_TEACHER_EMAIL || 'org.demo.halaqa.teacher@example.com', route: '/teacher' },
  { role: 'parent', email: process.env.MUTQIN_QA_PARENT_EMAIL || 'guardian.menacer@mutqin.test', route: '/parent' },
]
const password = process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!'

async function login(page, email) {
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL((url) => url.pathname !== '/login')
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })

  for (const account of accounts) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
      try {
        await login(page, account.email)
      } catch (error) {
        console.warn(`skip ${account.role}: ${error.message}`)
        await page.close()
        continue
      }
      await page.goto(`${base}${account.route}`, { waitUntil: 'domcontentloaded' })
      if (account.role === 'student') {
        const learningNav = page.locator('.dash-jump').getByRole('button', { name: /my learning/i })
        if (await learningNav.count()) await learningNav.first().click()
        await page.locator('#dash-my-learning, .learner-teacher').first().waitFor({ state: 'visible', timeout: 30000 })
      } else {
        await page.locator('main, .teacher-dashboard, .parent-dashboard').first().waitFor({ timeout: 30000 })
      }
      for (const theme of themes) {
        await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
        await page.waitForTimeout(120)
        const file = `${account.role}-${viewport.name}-${theme}.png`
        await page.screenshot({ path: path.join(outDir, file), fullPage: true })
      }
      await page.close()
    }
  }

  await browser.close()
  console.log(JSON.stringify({ outDir, shots: fs.readdirSync(outDir).length }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})