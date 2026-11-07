import { chromium } from 'playwright'

export const DEFAULT_BASE_URL = (process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8000').replace(
  /\/memorisation(\/demo)?\/?$/,
  '',
)

export const DEFAULT_TEST_EMAIL = process.env.MUTQIN_TEST_EMAIL || 'fatima.reviser@mutqin.test'
export const DEFAULT_TEST_PASSWORD = process.env.MUTQIN_TEST_PASSWORD || 'DemoPass1!'

export const VIEWPORT = { width: 1920, height: 1080 }

export async function launchBrowser({ headless = true, slowMo = 0 } = {}) {
  return chromium.launch({ headless, slowMo })
}

export async function login(page, {
  baseUrl = DEFAULT_BASE_URL,
  email = DEFAULT_TEST_EMAIL,
  password = DEFAULT_TEST_PASSWORD,
} = {}) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60_000 })
  if (!page.url().includes('/login')) return
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}

/** Dismiss workspace tour, welcome-back gates, and incidental modals. */
export async function dismissOverlays(page) {
  for (let round = 0; round < 24; round++) {
    let acted = false
    const attempts = [
      () => page.locator('.workspace-tour__actions button').filter({ hasText: /^(Skip|End tour)$/i }).first().click({ timeout: 700 }),
      () => page.getByRole('button', { name: /^skip tour$/i }).click({ timeout: 700 }),
      () => page.getByRole('button', { name: /start new session/i }).click({ timeout: 700 }),
      () => page.getByRole('button', { name: /^not now$/i }).click({ timeout: 700 }),
      () => page.locator('[data-testid="welcome-back-continue"]').click({ timeout: 700 }),
      () => page.locator('.modal.show .btn-close, .modal.show [data-bs-dismiss="modal"]').first().click({ timeout: 700 }),
    ]
    for (const attempt of attempts) {
      try {
        await attempt()
        acted = true
        await page.waitForTimeout(400)
        break
      } catch {
        /* try next */
      }
    }
    if (!acted) break
  }
}

export async function endLiveSession(page) {
  const stop = page.locator('[data-testid="workspace-bottom-stop"]')
  if (await stop.count()) {
    await stop.click()
    await page.waitForTimeout(500)
    const confirm = page.getByRole('button', { name: /end session/i })
    if (await confirm.count()) await confirm.first().click()
    await page.waitForTimeout(1_000)
    return true
  }
  const endHeader = page
    .locator('.top-card-session-actions .session-primary-action')
    .filter({ hasText: /^End$/ })
  if (await endHeader.count()) {
    await endHeader.first().click()
    await page.waitForTimeout(500)
    const confirm = page.getByRole('button', { name: /end session/i })
    if (await confirm.count()) await confirm.first().click()
    await page.waitForTimeout(1_000)
    return true
  }
  return false
}

export async function injectTutorialChrome(page) {
  await page.addStyleTag({
    content: `
      .tutorial-focus-ring {
        outline: 3px solid rgba(245, 196, 81, 0.95) !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 6px rgba(245, 196, 81, 0.22) !important;
        transition: outline-color 0.2s ease, box-shadow 0.2s ease;
      }
      .tutorial-cursor-dot {
        position: fixed;
        width: 22px;
        height: 22px;
        margin-left: -11px;
        margin-top: -11px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.95);
        background: rgba(245, 196, 81, 0.55);
        box-shadow: 0 0 14px rgba(245, 196, 81, 0.65);
        pointer-events: none;
        z-index: 99999;
        opacity: 0;
        transition: opacity 0.15s ease, transform 0.2s ease;
      }
      .tutorial-cursor-dot.is-visible {
        opacity: 1;
      }
      .tutorial-caption-bar {
        position: fixed;
        left: 50%;
        bottom: 28px;
        transform: translateX(-50%);
        max-width: min(920px, calc(100vw - 48px));
        padding: 14px 22px;
        border-radius: 14px;
        background: rgba(12, 16, 22, 0.82);
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 0.01em;
        line-height: 1.35;
        text-align: center;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
        pointer-events: none;
        z-index: 100000;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .tutorial-caption-bar.is-visible {
        opacity: 1;
      }
    `,
  })
  await page.evaluate(() => {
    if (!document.getElementById('tutorial-cursor-dot')) {
      const dot = document.createElement('div')
      dot.id = 'tutorial-cursor-dot'
      dot.className = 'tutorial-cursor-dot'
      document.body.appendChild(dot)
    }
    if (!document.getElementById('tutorial-caption-bar')) {
      const bar = document.createElement('div')
      bar.id = 'tutorial-caption-bar'
      bar.className = 'tutorial-caption-bar'
      bar.setAttribute('aria-hidden', 'true')
      document.body.appendChild(bar)
    }
  })
}

export async function showTutorialCaption(page, text, holdMs = 2_800) {
  await page.evaluate((caption) => {
    const bar = document.getElementById('tutorial-caption-bar')
    if (!bar) return
    bar.textContent = caption
    bar.classList.add('is-visible')
  }, text)
  await page.waitForTimeout(holdMs)
  await page.evaluate(() => {
    const bar = document.getElementById('tutorial-caption-bar')
    if (!bar) return
    bar.classList.remove('is-visible')
  })
  await page.waitForTimeout(200)
}

export async function moveTutorialCursor(page, locator) {
  const box = await locator.boundingBox()
  if (!box) return
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y, { steps: 12 })
  await page.evaluate(({ px, py }) => {
    const dot = document.getElementById('tutorial-cursor-dot')
    if (!dot) return
    dot.style.left = `${px}px`
    dot.style.top = `${py}px`
    dot.classList.add('is-visible')
  }, { px: x, py: y })
}

export async function focusAndClick(page, locator, { pauseMs = 450 } = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await moveTutorialCursor(page, locator)
  await locator.evaluate((el) => el.classList.add('tutorial-focus-ring'))
  await page.waitForTimeout(pauseMs)
  await locator.click()
  await locator.evaluate((el) => el.classList.remove('tutorial-focus-ring'))
}

export async function waitForAppSettled(page, ms = 1_200) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForTimeout(ms)
}

export async function startFreshWorkspaceSession(page) {
  const startNew = page.getByRole('button', { name: /start new session/i })
  if (await startNew.count()) {
    await startNew.click()
    await page.waitForTimeout(1_200)
    return true
  }
  const changeSet = page.locator('button').filter({ hasText: /^Change set$/i })
  if (await changeSet.count()) {
    await changeSet.click()
    await page.waitForTimeout(900)
    return true
  }
  return false
}

export async function prepareReviserAccount(page, baseUrl = DEFAULT_BASE_URL) {
  await login(page, { baseUrl })
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' })
  await waitForAppSettled(page, 2_500)
  await dismissOverlays(page)
  await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded' })
  await waitForAppSettled(page, 2_500)
  await dismissOverlays(page)
  await startFreshWorkspaceSession(page)
  await endLiveSession(page)
  await dismissOverlays(page)
  await endLiveSession(page)
}
