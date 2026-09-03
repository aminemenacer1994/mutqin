import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'

const baseUrl = (process.env.MUTQIN_BASE_URL || 'http://localhost:8001').replace(/\/memorisation(\/demo)?\/?$/, '')

async function ensureWorkspace(page) {
  await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(1500)

  const onLoginGate = await page.locator('.auth-tester-notice, .workspace-shell-idle-cta').count()
  const needsAuth = await page.locator('text=Sign in to continue').count()

  if (needsAuth || (onLoginGate && !(await page.locator('.workspace-shell').count()))) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const demoButton = page.getByRole('button', { name: /sign in with demo/i })
    if (await demoButton.count()) {
      await demoButton.click()
    } else {
      await page.locator('input[name="email"]').fill(process.env.MUTQIN_TEST_EMAIL || 'practice01@example.com')
      await page.locator('input[name="password"]').fill(process.env.MUTQIN_TEST_PASSWORD || 'Practice01!')
      await page.getByRole('button', { name: /^login$/i }).click()
    }
    await page.waitForLoadState('domcontentloaded')
    await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(2500)
  }
}

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
    await ensureWorkspace(page)

    const result = await page.evaluate(() => ({
      ready: !!document.querySelector('.main'),
      hasSetup: !!document.querySelector('.setup-start-card, .session-rail, .workspace-shell-idle, .workspace-shell-idle-cta, .top-card-session-actions, .action-btn.primary'),
      hasWorkspaceShell: !!document.querySelector('.workspace-shell, .session-progress-rail'),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      bodyText: document.body.innerText.slice(0, 300)
    }))

    assert.equal(result.ready, true, `${name}: app shell did not render. ${result.bodyText}`)
    assert.equal(result.hasSetup, true, `${name}: setup/session area missing. ${result.bodyText}`)
    assert.equal(result.hasWorkspaceShell, true, `${name}: workspace shell missing. ${result.bodyText}`)
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
