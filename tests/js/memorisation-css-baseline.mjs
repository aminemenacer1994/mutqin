/**
 * Capture /memorisation screenshots for CSS refactor regression checks.
 * Usage: MUTQIN_BASE_URL=http://localhost:8000/memorisation node tests/js/memorisation-css-baseline.mjs [baseline|compare]
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const mode = process.argv[2] || 'baseline'
const url = process.env.MUTQIN_BASE_URL || 'http://localhost:8000/memorisation'
const outDir = path.resolve('tests/js/screenshots/memorisation-css')
const widths = [1440, 1024, 768, 390]
const themes = ['light', 'dark']

fs.mkdirSync(outDir, { recursive: true })

async function capture() {
  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const theme of themes) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(2500)
      await page.evaluate(t => {
        document.documentElement.setAttribute('data-theme', t)
      }, theme)
      await page.waitForTimeout(500)

      const name = `${theme}-${width}.png`
      const filePath = path.join(outDir, name)
      await page.screenshot({ path: filePath, fullPage: true })
      results.push({ theme, width, filePath })
      await page.close()
    }
  }

  await browser.close()
  return results
}

if (mode === 'baseline') {
  const shots = await capture()
  console.log(`Captured ${shots.length} baseline screenshots in ${outDir}`)
  for (const s of shots) console.log(`  ${path.basename(s.filePath)}`)
} else {
  const tmpDir = path.join(outDir, '_compare')
  fs.mkdirSync(tmpDir, { recursive: true })
  process.env.MUTQIN_BASE_URL = url
  // Re-use capture into tmp then diff names
  const browser = await chromium.launch({ headless: true })
  let mismatches = 0
  for (const theme of themes) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(2500)
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme)
      await page.waitForTimeout(500)
      const baseline = path.join(outDir, `${theme}-${width}.png`)
      const current = path.join(tmpDir, `${theme}-${width}.png`)
      await page.screenshot({ path: current, fullPage: true })
      if (fs.existsSync(baseline)) {
        const a = fs.readFileSync(baseline)
        const b = fs.readFileSync(current)
        if (!a.equals(b)) {
          mismatches++
          console.warn(`DIFF: ${theme}-${width}.png (desktop baselines should match; mobile may differ intentionally)`)
        }
      }
      await page.close()
    }
  }
  await browser.close()
  console.log(mismatches === 0 ? 'All screenshots match baselines' : `${mismatches} screenshot(s) differ`)
  process.exit(mismatches > 0 && process.env.STRICT_DESKTOP === '1' ? 1 : 0)
}
