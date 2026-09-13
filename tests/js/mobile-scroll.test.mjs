import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'

const baseUrl = process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8001'
const readerSurfaces = '.mushaf-workspace, .mushaf-shell, .mushaf-viewport-scroll, .mushaf-page--madani, .madani-page-sheet'

async function scrollBothWays(page, touchSession) {
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  assert.ok(maxScroll > 0, 'Page must have content to scroll')
  const lastStart = Math.max(0, maxScroll - 450)
  for (let pass = 0; pass < 3; pass += 1) {
    // Exercise the top, middle and bottom, including the homepage carousels.
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), lastStart * pass / 2)
    for (const direction of [1, -1]) {
      const before = await page.evaluate(() => window.scrollY)
      if (touchSession) {
        await touchSession.send('Input.synthesizeScrollGesture', {
          x: 190, y: 420, yDistance: -direction * 450,
          speed: 700, gestureSourceType: 'touch',
        })
      } else {
        await page.evaluate(delta => window.scrollBy({ top: delta, behavior: 'instant' }), direction * 450)
      }
      await page.waitForTimeout(80)
      const after = await page.evaluate(() => window.scrollY)
      assert.ok(direction > 0 ? after > before : after < before, `Page must scroll ${direction > 0 ? 'down' : 'up'} on pass ${pass + 1}: ${before} -> ${after}`)
    }
  }
}

for (const [name, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const touchSession = name === 'chromium' ? await context.newCDPSession(page) : null

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.hero__fan-item')
    const decorationSelector = '.hero__glow, .hero__fan-item, .demo__phone, .demo__phone .device'
    const animatedDecorations = await page.evaluate(selector => document.getAnimations().filter(animation => (
      animation.effect?.target?.matches(selector) && animation.effect.getTiming().iterations === Infinity
    )).length, decorationSelector)
    assert.equal(animatedDecorations, 0, `${name}: phone decorations must not animate continuously`)
    await scrollBothWays(page, touchSession)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false)

    // The desktop presentation retains its decorative motion.
    await page.setViewportSize({ width: 1280, height: 900 })
    assert.ok(await page.evaluate(selector => document.getAnimations().some(animation => (
      animation.effect?.target?.matches(selector) && animation.effect.getTiming().iterations === Infinity
    )), decorationSelector))
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    const demo = page.getByRole('button', { name: /sign in with demo/i })
    if (await demo.count()) {
      await demo.click()
    } else {
      await page.locator('input[name="email"]').fill(process.env.MUTQIN_TEST_EMAIL || 'practice01@example.com')
      await page.locator('input[name="password"]').fill(process.env.MUTQIN_TEST_PASSWORD || 'Practice01!')
      await page.getByRole('button', { name: /^login$/i }).click()
    }
    await page.waitForURL('**/memorisation')
    await page.waitForSelector('.workspace-shell')
    await page.waitForTimeout(2000)
    await page.evaluate(async () => {
      let vm
      function walk(node) {
        if (!node || vm) return
        if (node.component?.type?.name === 'MutqinApp') vm = node.component.proxy
        else {
          if (node.component) walk(node.component.subTree)
          if (Array.isArray(node.children)) node.children.forEach(walk)
        }
      }
      walk(document.querySelector('#app').__vue_app__._container._vnode)
      if (!vm) throw new Error('Memorisation component missing')
      window.scrollTestVm = vm
      vm.workspaceTourActive = false
      vm.showWelcomeBackModal = false
      vm.showPostLoginOnboarding = false
      vm.returningUserChoicePending = false
      vm.welcomeBackWorkspaceHidden = false
      vm.showTools = false
      vm.readingViewMode = 'mushaf'
      await vm.$nextTick()
      vm.unstickPageScroll()
    })
    await page.waitForTimeout(1500)
    const surfaces = await page.evaluate(selector => [...document.querySelectorAll(selector)].map(el => ({
      name: el.className, overflow: getComputedStyle(el).overflowY,
    })), readerSurfaces)
    assert.ok(surfaces.length >= 3, `${name}: reader did not render`)
    for (const surface of surfaces) assert.equal(surface.overflow, 'visible', `${name}: ${surface.name} must let the document scroll`)
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'visible', `${name}: body must not create a second page scroll area`)
    assert.equal(await page.evaluate(() => document.getAnimations().some(animation => (
      animation.effect?.target?.closest('.workspace-ai-recite-cta, .workspace-ask-mutqin-cta')
      && animation.effect.getTiming().iterations === Infinity
    ))), false, `${name}: reader buttons must not animate continuously on phones`)
    await scrollBothWays(page, touchSession)

    await page.evaluate(() => {
      window.readerRefits = 0
      const original = window.scrollTestVm.scheduleMadaniPageFit
      window.scrollTestVm.scheduleMadaniPageFit = (...args) => {
        window.readerRefits += 1
        return original(...args)
      }
    })
    for (const height of [780, 844, 780, 844]) {
      await page.setViewportSize({ width: 390, height })
      await page.waitForTimeout(80)
    }
    assert.equal(await page.evaluate(() => window.readerRefits), 0, `${name}: browser toolbar height changes must not refit the reader`)
    await page.setViewportSize({ width: 430, height: 844 })
    await page.waitForTimeout(100)
    assert.ok(await page.evaluate(() => window.readerRefits > 0), `${name}: width changes must still refit the reader`)

    await page.evaluate(() => { window.scrollTestVm.showTools = true })
    await page.waitForTimeout(350)
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'hidden', `${name}: controls lock background scrolling`)
    await page.evaluate(() => { window.scrollTestVm.showTools = false })
    await page.waitForTimeout(350)
    await scrollBothWays(page, touchSession)
    assert.deepEqual(errors, [], `${name}: browser errors`)
    console.log(`${name}: homepage and reader scroll in both directions; resize and controls checks passed`)
  } finally {
    await browser.close()
  }
}
