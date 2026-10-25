const { chromium } = require('playwright')

const selectors = [
  '.teacher-page-header__subtitle',
  '.teacher-pane__hint',
  '.teacher-activity-list__copy small',
  '.teacher-task-row__meta',
  '.teacher-table__cell--meta',
  '.teacher-task-modal__field-help',
]

function channels(color) {
  const values = color.match(/[\d.]+/g)?.map(Number) || []
  if (color.startsWith('color(srgb')) return values.slice(0, 3).map((value) => value * 255)
  return values.length >= 3 ? values.slice(0, 3) : [0, 0, 0]
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:8000/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('org.demo.halaqa.teacher@example.com')
  await page.locator('input[type=password]').fill('OrganisationDemo1!')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('**/teacher')
  const results = []
  for (const theme of ['light', 'sepia', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
    for (const view of ['Overview', 'Students', 'Tasks']) {
      await page.locator('.teacher-nav-shell--desktop').getByRole('button', { name: view, exact: true }).click()
      await page.waitForTimeout(200)
      if (view === 'Tasks') await page.locator('.teacher-task-row__meta').first().waitFor({ state: 'visible' })
      for (const selector of selectors) {
        if (!await page.locator(selector).count()) continue
        const sample = await page.locator(selector).first().evaluate((element) => {
          const foreground = getComputedStyle(element).color
          let node = element
          let background = 'rgb(255, 255, 255)'
          while (node) {
            const color = getComputedStyle(node).backgroundColor
            if (color && !/rgba?\(0, 0, 0, 0\)/.test(color) && color !== 'transparent') { background = color; break }
            node = node.parentElement
          }
          return { foreground, background }
        }).catch(() => null)
        if (!sample) continue
        const a = luminance(channels(sample.foreground))
        const b = luminance(channels(sample.background))
        results.push({ theme, view, selector, ...sample, ratio: Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)) })
      }
    }
  }
  const failures = results.filter((sample) => sample.ratio < 4.5)
  console.log(JSON.stringify({ samples: results, failures }, null, 2))
  await browser.close()
  if (failures.length) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exit(1) })
