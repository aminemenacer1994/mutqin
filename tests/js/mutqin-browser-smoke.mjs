import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const url = process.env.MUTQIN_BASE_URL || 'http://localhost:8001/memorisation'

async function smokePage(name, contextOptions) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage(contextOptions)
  const issues = []

  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push(`${message.type()}: ${message.text()}`)
    }
  })

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3500)

    const result = await page.evaluate(() => ({
      ready: !!document.querySelector('.main'),
      hasSetup: !!document.querySelector('.setup-start-card, .session-rail'),
      hasToolbar: !!document.querySelector('.reading-toolbar'),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      bodyText: document.body.innerText.slice(0, 300)
    }))

    assert.equal(result.ready, true, `${name}: app shell did not render. ${result.bodyText}`)
    assert.equal(result.hasSetup, true, `${name}: setup/session area missing. ${result.bodyText}`)
    assert.equal(result.hasToolbar, true, `${name}: reading toolbar missing. ${result.bodyText}`)
    assert.equal(result.horizontalOverflow, false, `${name}: page has horizontal overflow`)
    assert.deepEqual(issues, [], `${name}: browser issues\n${issues.join('\n')}`)
  } finally {
    await browser.close()
  }
}

await smokePage('desktop', { viewport: { width: 1440, height: 1000 } })
await smokePage('tablet', { viewport: { width: 834, height: 1112 }, isMobile: true, hasTouch: true })
await smokePage('mobile', devices['iPhone 12'])

console.log('mutqin browser smoke passed')
