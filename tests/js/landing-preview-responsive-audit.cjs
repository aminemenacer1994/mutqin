/**
 * Optional Playwright capture for Group G (requires running app + allowlisted login).
 *
 * MUTQIN_BASE_URL=http://127.0.0.1:8000 \
 * MUTQIN_PREVIEW_EMAIL=menacer72@gmail.com \
 * MUTQIN_PREVIEW_PASSWORD=... \
 * node tests/js/landing-preview-responsive-audit.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const baseUrl = process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8000'
const email = process.env.MUTQIN_PREVIEW_EMAIL
const password = process.env.MUTQIN_PREVIEW_PASSWORD
const outDir = path.join(__dirname, '../../docs/mutqin-2.0/reference/screenshots/preview-responsive')
const routes = ['/preview', '/preview/teachers', '/preview/learning', '/preview/resources']
const viewports = [
  { width: 390, height: 844, name: '390' },
  { width: 768, height: 900, name: '768' },
  { width: 1280, height: 800, name: '1280' },
  { width: 1440, height: 900, name: '1440' },
]
const themes = ['light', 'dark']

async function main() {
  if (!email || !password) {
    console.log('SKIP: set MUTQIN_PREVIEW_EMAIL and MUTQIN_PREVIEW_PASSWORD for Playwright capture')
    process.exit(0)
  }

  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${baseUrl}/login`)
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.locator('button[type=submit]').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 })

  const report = []

  for (const theme of themes) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t
      window.localStorage.setItem('mutqin-theme', t)
    }, theme)

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(400)

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement
          return doc.scrollWidth > window.innerWidth + 1
        })

        const file = `${route.replace(/\//g, '_').replace(/^_/, '') || 'preview'}_${viewport.name}_${theme}.png`
        const filePath = path.join(outDir, file)
        await page.screenshot({ path: filePath, fullPage: true })

        report.push({ route, viewport: viewport.name, theme, overflow, file })
        if (overflow) {
          console.warn(`OVERFLOW ${route} @ ${viewport.name}px ${theme}`)
        }
      }
    }
  }

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ capturedAt: new Date().toISOString(), report }, null, 2))
  await browser.close()
  console.log(`Wrote ${report.length} captures to ${outDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})