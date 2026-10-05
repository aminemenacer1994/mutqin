/**
 * Document-level horizontal overflow audit at 360–430px.
 * Finds offenders (scrollWidth > clientWidth) — not masked by overflow-x: hidden on ancestors.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseUrl = (process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '')
const widths = process.env.MUTQIN_TEST_QUICK === '1'
  ? [360, 390, 430]
  : [360, 368, 375, 390, 393, 400, 412, 414, 421, 430]
const themes = ['light', 'sepia', 'dark']

const publicPaths = [
  '/',
  '/login',
  '/register',
  '/password/reset',
  '/pricing',
  '/about-us',
  '/privacy',
]

const authenticatedPaths = ['/memorisation', '/dashboard', '/profile']

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const demo = page.getByRole('button', { name: /sign in with demo/i })
  if (await demo.count()) {
    await demo.click()
  } else {
    await page.locator('input[name="email"]').fill(process.env.MUTQIN_TEST_EMAIL || 'practice01@example.com')
    await page.locator('input[name="password"]').fill(process.env.MUTQIN_TEST_PASSWORD || 'Practice01!')
    await page.getByRole('button', { name: /^login$/i }).click()
  }
  await page.waitForTimeout(1500)
}

function findWideElements(max = 8) {
  const vw = window.innerWidth
  const offenders = []
  const walk = (el) => {
    if (!el || el.nodeType !== 1) return
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    const docOverflow = rect.right > vw + 1.5 || rect.left < -1.5
    const internalOverflow = el.scrollWidth > el.clientWidth + 2
      && !['auto', 'scroll', 'overlay'].includes(style.overflowX)
    if (docOverflow || internalOverflow) {
      const tag = el.tagName.toLowerCase()
      const id = el.id ? `#${el.id}` : ''
      const cls = (el.className && typeof el.className === 'string')
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : ''
      offenders.push({
        sel: `${tag}${id}${cls}`,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        w: Math.round(rect.width),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        overflowX: style.overflowX,
        docOverflow,
      })
    }
    for (const child of el.children) walk(child)
  }
  walk(document.body)
  offenders.sort((a, b) => (b.right - b.left) - (a.right - a.left))
  return {
    docScroll: document.documentElement.scrollWidth,
    docClient: document.documentElement.clientWidth,
    inner: vw,
    offenders: offenders.slice(0, max),
  }
}

async function auditPath(page, path, width, theme) {
  await page.setViewportSize({ width, height: 844 })
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(t => {
    document.documentElement.setAttribute('data-theme', t)
  }, theme)
  await page.waitForTimeout(theme === 'light' ? 400 : 600)
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
  return page.evaluate(findWideElements)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ isMobile: true, hasTouch: true })
const page = await context.newPage()
const failures = []

try {
  for (const theme of themes) {
    for (const width of widths) {
      for (const path of publicPaths) {
        const result = await auditPath(page, path, width, theme)
        if (result.docScroll > result.inner + 2) {
          failures.push({
            path,
            width,
            theme,
            overflowPx: result.docScroll - result.inner,
            offenders: result.offenders,
          })
        }
      }
    }
  }

  await login(page)
  for (const theme of themes) {
    for (const width of widths) {
      for (const path of authenticatedPaths) {
        const result = await auditPath(page, path, width, theme)
        if (result.docScroll > result.inner + 2) {
          failures.push({
            path,
            width,
            theme,
            overflowPx: result.docScroll - result.inner,
            offenders: result.offenders,
          })
        }
      }
    }
  }

  // Mushaf mode on memorisation
  await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)
  await page.evaluate(async () => {
    function walk(node) {
      if (!node) return null
      if (node.component?.type?.name === 'MutqinApp') return node.component.proxy
      if (node.component) {
        const found = walk(node.component.subTree)
        if (found) return found
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = walk(child)
          if (found) return found
        }
      }
      return null
    }
    const vm = walk(document.querySelector('#app')?.__vue_app__?._container?._vnode)
    if (!vm) return
    vm.readingViewMode = 'mushaf'
    vm.showTools = false
    await vm.$nextTick()
  })
  await page.waitForTimeout(1200)

  for (const theme of ['light', 'sepia', 'dark']) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 })
      await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t) }, theme)
      await page.waitForTimeout(500)
      const result = await page.evaluate(findWideElements)
      if (result.docScroll > result.inner + 2) {
        failures.push({
          path: '/memorisation (mushaf)',
          width,
          theme,
          overflowPx: result.docScroll - result.inner,
          offenders: result.offenders,
        })
      }
    }
  }

  const overlayStates = ['stacked', 'tools', 'player', 'shortcuts', 'exit-modal']

  async function setMemorisationOverlay(state, theme) {
    await page.evaluate(async ({ state, theme }) => {
      function walk(node) {
        if (!node) return null
        if (node.component?.type?.name === 'MutqinApp') return node.component.proxy
        if (node.component) {
          const found = walk(node.component.subTree)
          if (found) return found
        }
        if (Array.isArray(node.children)) {
          for (const child of node.children) {
            const found = walk(child)
            if (found) return found
          }
        }
        return null
      }
      const vm = walk(document.querySelector('#app')?.__vue_app__?._container?._vnode)
      if (!vm) return
      document.documentElement.setAttribute('data-theme', theme)
      vm.showSelfCheckModal = false
      vm.showRecordingsLibrary = false
      vm.showPostSessionModal = false
      vm.workspaceTourActive = false
      vm.showTools = false
      vm.playerVisible = false
      vm.playerDismissed = true
      vm.showSessionExitModal = false
      vm.showKeyboardShortcuts = false
      vm.readingViewMode = 'stacked'
      if (state === 'tools') {
        vm.openToolsPanel?.({ tab: 'tools' })
      } else if (state === 'player') {
        vm.playerVisible = true
        vm.playerDismissed = false
        vm.duration = 120
        vm.currentTime = 12
      } else if (state === 'shortcuts') {
        vm.showKeyboardShortcuts = true
      } else if (state === 'exit-modal') {
        if (typeof vm.openSessionExitModal === 'function') vm.openSessionExitModal()
        else vm.showSessionExitModal = true
      }
      vm.syncBodyScrollLock?.()
      await vm.$nextTick()
    }, { state, theme })
  }

  await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)

  for (const state of overlayStates) {
    for (const theme of themes) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 844 })
        await setMemorisationOverlay(state, theme)
        await page.waitForTimeout(450)
        const result = await page.evaluate(findWideElements)
        if (result.docScroll > result.inner + 2) {
          failures.push({
            path: `/memorisation (${state})`,
            width,
            theme,
            overflowPx: result.docScroll - result.inner,
            offenders: result.offenders,
          })
        }
      }
    }
  }
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2))
}
assert.deepEqual(failures, [], `Horizontal overflow at 360–430px (${failures.length} cases)`)
console.log(`mobile-horizontal-overflow.test.mjs: ok (${widths.length} widths × themes × routes)`)
