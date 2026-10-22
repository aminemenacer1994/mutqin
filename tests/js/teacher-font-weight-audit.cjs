const { chromium } = require('playwright')

const routes = [
  '/teacher',
  '/teacher?view=students',
  '/teacher?view=assignments',
  '/teacher?view=settings',
  '/teacher?view=student&student=20&section=overview',
  '/teacher?view=student&student=20&section=practice',
  '/teacher?view=student&student=20&section=ai',
  '/teacher?view=student&student=20&section=weak',
  '/teacher?view=student&student=20&section=revision',
  '/teacher?view=student&student=20&section=tasks',
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:8000/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('org.demo.halaqa.teacher@example.com')
  await page.locator('input[type=password]').fill('OrganisationDemo1!')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('**/teacher')

  const results = []
  for (const route of routes) {
    await page.goto(`http://localhost:8000${route}`, { waitUntil: 'domcontentloaded' })
    await page.locator('.teacher-dashboard').waitFor()
    await page.waitForTimeout(350)
    results.push(await page.evaluate((path) => {
      const selector = '.teacher-dashboard :is(h1,h2,h3,h4,strong,button,label,.teacher-table__name,.teacher-task-row__student,.teacher-task-row__range,.teacher-stat-card__value,.teacher-stat-card__label)'
      const rows = [...document.querySelectorAll(selector)]
        .filter((node) => {
          const rect = node.getBoundingClientRect()
          const style = getComputedStyle(node)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
        })
        .map((node) => ({
          tag: node.tagName.toLowerCase(),
          className: String(node.className || '').split(' ').slice(0, 2).join('.'),
          text: String(node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48),
          weight: Number(getComputedStyle(node).fontWeight),
        }))
      return {
        path,
        max: Math.max(0, ...rows.map((row) => row.weight)),
        heavy: rows.filter((row) => row.weight >= 600).slice(0, 12),
      }
    }, route))
  }

  await page.goto('http://localhost:8000/teacher?view=assignments', { waitUntil: 'domcontentloaded' })
  await page.locator('.teacher-task-add').click()
  await page.locator('.teacher-task-modal').waitFor()
  results.push(await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.teacher-task-modal :is(h1,h2,h3,h4,strong,button,label,input,select,textarea,.teacher-task-modal__eyebrow)')]
      .filter((node) => {
        const rect = node.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== 'hidden'
      })
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        className: String(node.className || '').split(' ').slice(0, 2).join('.'),
        text: String(node.textContent || node.value || '').trim().replace(/\s+/g, ' ').slice(0, 48),
        weight: Number(getComputedStyle(node).fontWeight),
      }))
    const title = document.querySelector('.teacher-task-modal__title')
    const matchedRules = []
    const visitRules = (rules, source) => {
      for (const rule of rules || []) {
        if (rule.cssRules) visitRules(rule.cssRules, source)
        if (!rule.selectorText || !rule.style?.fontWeight || !title) continue
        try {
          if (title.matches(rule.selectorText)) matchedRules.push({ source, selector: rule.selectorText, weight: rule.style.fontWeight, priority: rule.style.getPropertyPriority('font-weight') })
        } catch (_) { /* ignore selectors unsupported by matches() */ }
      }
    }
    for (const sheet of document.styleSheets) {
      try { visitRules(sheet.cssRules, sheet.href || 'inline') } catch (_) { /* cross-origin stylesheet */ }
    }
    return {
      path: '/teacher?view=assignments#modal',
      max: Math.max(0, ...rows.map((row) => row.weight)),
      heavy: rows.filter((row) => row.weight >= 600).slice(0, 12),
      matchedRules,
    }
  }))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}

main().catch((error) => { console.error(error); process.exit(1) })
