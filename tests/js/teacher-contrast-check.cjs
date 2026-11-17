const { chromium } = require('playwright')

const selectors = [
  '.teacher-page-header__subtitle',
  '.teacher-pane__hint',
  '.teacher-activity-list__copy small',
  '.teacher-task-row__meta',
  '.teacher-task-filters .btn.is-active',
  '.teacher-task-filters .btn:not(.is-active)',
  '.teacher-table__cell--meta',
  '.teacher-task-modal__field-help',
  '.teacher-student-card__last',
  '.teacher-student-card__follow-up > span',
  '.teacher-student-card__metrics dd',
  '.teacher-student-card__follow-up strong',
  '.teacher-table__score',
  '.teacher-table__score--mid',
  '.teacher-table__score--bad',
  '.teacher-table__concern',
  '.teacher-table__concern.is-danger',
  '.teacher-student-card__follow-up strong.is-warn',
  '.teacher-student-card__follow-up strong.is-danger',
  '.teacher-badge',
  '.teacher-tabs__tab.is-active span',
  '.teacher-tabs__tab:not(.is-active) span',
]

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
  const studentId = await page.evaluate(async () => {
    const response = await fetch('/api/teacher/students?per_page=50')
    return (await response.json()).data.find(student => student.ai_attempts > 0)?.id
  })
  const results = []
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['light', 'sepia', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      for (const view of ['Overview', 'Students', 'Assignments', ...(studentId ? ['Profile'] : [])]) {
      if (view === 'Profile') {
        await page.goto(`http://localhost:8000/teacher?view=student&student=${studentId}&section=ai`)
        await page.locator('.teacher-tabs__tab.is-active').waitFor()
      } else await page.locator(width < 768 ? '.teacher-nav-shell--mobile' : '.teacher-nav-shell--desktop').getByRole('button', { name: view, exact: true }).click()
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      await page.waitForTimeout(200)
      if (view === 'Assignments') await page.locator('.teacher-task-row__meta').first().waitFor({ state: 'visible' })
      for (const selector of selectors) {
        if (!await page.locator(selector).count()) continue
        const sample = await page.locator(selector).first().evaluate((element) => {
          if (!element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return null
          const foreground = getComputedStyle(element).color
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          const rgba = (color) => {
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = color
            ctx.fillRect(0, 0, 1, 1)
            const pixel = [...ctx.getImageData(0, 0, 1, 1).data]
            return [pixel[0], pixel[1], pixel[2], pixel[3] / 255]
          }
          const composite = (front, back) => front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]))
          let node = element
          let background = 'rgb(255, 255, 255)'
          const layers = []
          while (node) {
            const color = getComputedStyle(node).backgroundColor
            if (color) layers.push(rgba(color))
            node = node.parentElement
          }
          let backgroundRgb = [255, 255, 255]
          for (const layer of layers.reverse()) backgroundRgb = composite(layer, backgroundRgb)
          const foregroundRgb = composite(rgba(foreground), backgroundRgb)
          background = `rgb(${backgroundRgb.map(Math.round).join(', ')})`
          return { foreground, background, foregroundRgb, backgroundRgb }
        }).catch(() => null)
        if (!sample) continue
        const a = luminance(sample.foregroundRgb)
        const b = luminance(sample.backgroundRgb)
        results.push({ width, theme, view, selector, ...sample, ratio: Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)) })
      }
    }
    }
  }
  const failures = results.filter((sample) => sample.ratio < 4.5)
  console.log(JSON.stringify({ samples: results, failures }, null, 2))
  await browser.close()
  if (failures.length) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exit(1) })
