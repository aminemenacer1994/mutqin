import { chromium } from 'playwright'

const email = process.env.MUTQIN_TEST_EMAIL || 'practice01@example.com'
const password = process.env.MUTQIN_TEST_PASSWORD || 'Practice01!'
const demoEmail = 'layla.beginner@mutqin.test'
const demoPassword = 'DemoPass1!'

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]

function vueVmSource() {
  return `
    const root = document.querySelector('#app')?.__vue_app__?._container?._vnode
    let vm = window.__mutqinInspectVm || null
    const walk = node => {
      if (!node || vm) return
      if (node.component?.type?.name === 'MutqinApp') {
        vm = node.component.proxy
        return
      }
      if (node.component) walk(node.component.subTree)
      if (Array.isArray(node.children)) node.children.forEach(walk)
    }
    if (!vm) walk(root)
    window.__mutqinInspectVm = vm
  `
}

function findAskMutqinModalSource() {
  return `
    function findAskMutqinModal() {
      const root = document.querySelector('#app')?.__vue_app__?._container?._vnode
      const walk = node => {
        if (!node) return null
        if (node.component?.type?.name === 'AskMutqinModal') return node.component.proxy
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
      return walk(root)
    }
  `
}

async function resolveBaseUrl() {
  for (const port of [8000, 8001]) {
    const url = `http://127.0.0.1:${port}`
    try {
      const res = await fetch(`${url}/login`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok && res.status >= 500) continue
      const html = await res.text()
      if (/Mutqin|mutqin|auth_demo_use|Sign in with demo/i.test(html)) return url
    } catch {
      // try next port
    }
  }
  throw new Error('Could not reach Mutqin on http://127.0.0.1:8000 or :8001')
}

async function tryCredentialLogin(page, baseUrl, credEmail, credPassword) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const emailInput = page.locator('input[name="email"]')
  if (!(await emailInput.count())) return { ok: false, reason: 'no email input' }

  await emailInput.fill(credEmail)
  await page.locator('input[name="password"]').fill(credPassword)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.getByRole('button', { name: /^(login|sign in)$/i }).click(),
  ])
  await page.waitForTimeout(800)

  if (!page.url().includes('/login')) {
    return { ok: true, method: 'credentials', email: credEmail }
  }

  const error = (await page.locator('.invalid-feedback, .alert, [role="alert"]').allTextContents()).join(' ').trim()
  return { ok: false, reason: error || 'still on login page' }
}

async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })

  const demoButton = page.getByRole('button', { name: /sign in with demo/i })
  if (await demoButton.count()) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      demoButton.click(),
    ])
    if (!page.url().includes('/login')) return { method: 'demo-button' }
  }

  for (const [credEmail, credPassword, label] of [
    [email, password, 'requested-credentials'],
    [demoEmail, demoPassword, 'local-demo-account'],
  ]) {
    const result = await tryCredentialLogin(page, baseUrl, credEmail, credPassword)
    if (result.ok) return { method: label, email: credEmail }
  }

  const csrf = await page.locator('input[name="_token"]').inputValue().catch(() => null)
  if (csrf) {
    const resp = await page.request.post(`${baseUrl}/login/demo`, { form: { _token: csrf } })
    if (resp.ok()) return { method: 'post-login-demo' }
  }

  return {
    method: 'failed',
    reason: 'All login paths failed',
    pageText: (await page.locator('body').innerText()).slice(0, 500),
    url: page.url(),
  }
}

async function dismissOverlays(page) {
  const dismissed = []

  await page.evaluate(async source => {
    eval(source)
    const vm = window.__mutqinInspectVm
    if (!vm) return
    vm.showWelcomeBackModal = false
    vm.workspaceTourActive = false
    vm.returningUserChoicePending = false
    vm.welcomeBackWorkspaceHidden = false
    vm.showPostLoginOnboarding = false
    vm.showPostSessionModal = false
    vm.showSessionExitModal = false
    vm.showSelfCheckModal = false
    vm.showRecordingsLibrary = false
    vm.showKeyboardShortcuts = false
    vm.showTools = false
    vm.playerVisible = false
    vm.playerDismissed = true
    vm.showCountdownOverlay = false
    if (vm.mutqinState?.sessionState) vm.mutqinState.sessionState.active = false
    vm.sessionCompleted = false
    if (typeof vm.completeOnboardingExploreWorkspace === 'function') {
      await vm.completeOnboardingExploreWorkspace()
    }
    await vm.$nextTick()
  }, vueVmSource())

  dismissed.push('vue-state')

  for (const selector of [
    '.workspace-tour__btn--ghost',
    '.workspace-tour button:has-text("Skip")',
    '.welcome-back-flow .modal-close-btn',
    '.welcome-back-flow button',
  ]) {
    const btn = page.locator(selector).first()
    if (await btn.count()) {
      try {
        if (await btn.isVisible()) {
          await btn.click({ timeout: 2000 })
          dismissed.push(selector)
        }
      } catch {
        // ignore
      }
    }
  }

  return dismissed
}

async function installAskMutqinStartStub(page) {
  return page.evaluate(({ vmSource, modalSource }) => {
    eval(vmSource)
    eval(modalSource)
    if (window.__askMutqinStartStubInstalled) return true
    window.__askMutqinStartStubInstalled = true
    window.__askMutqinStubObserver = new MutationObserver(() => {
      const modal = findAskMutqinModal()
      if (!modal) return
      modal.startSession = async () => {}
      window.__askMutqinStubObserver?.disconnect()
    })
    window.__askMutqinStubObserver.observe(document.body, { childList: true, subtree: true })
    return true
  }, { vmSource: vueVmSource(), modalSource: findAskMutqinModalSource() })
}

async function clickAskMutqin(page) {
  await installAskMutqinStartStub(page)

  const openedViaVm = await page.evaluate(source => {
    eval(source)
    const vm = window.__mutqinInspectVm
    if (!vm || typeof vm.openAskMutqin !== 'function') return false
    vm.showCountdownOverlay = false
    vm.openAskMutqin()
    return !!vm.askMutqinOpen
  }, vueVmSource())

  if (openedViaVm) return { clicked: 'vue:openAskMutqin()' }

  const selectors = [
    '[data-testid="workspace-ayah-search"]',
    '[data-testid="workspace-ask-mutqin"]',
    '[data-testid="workspace-ask-mutqin-idle"]',
    '[data-testid="workspace-ask-mutqin-aside"]',
  ]

  for (const selector of selectors) {
    const el = page.locator(selector).first()
    if (await el.count()) {
      try {
        await el.scrollIntoViewIfNeeded()
        if (await el.isVisible()) {
          await el.click({ timeout: 5000 })
          return { clicked: selector }
        }
      } catch {
        // try next
      }
    }
  }

  const findButton = page.locator('button').filter({ hasText: /find|ask/i }).first()
  if (await findButton.count()) {
    try {
      await findButton.scrollIntoViewIfNeeded()
      await findButton.click({ timeout: 5000 })
      return { clicked: 'button:has-text(Find|Ask)' }
    } catch (err) {
      return { clicked: null, error: String(err) }
    }
  }

  return { clicked: null }
}

async function withAskMutqinModal(page, body) {
  return page.evaluate(({ source, body: innerBody }) => {
    eval(source)
    return eval(`(() => { ${innerBody} })()`)
  }, { source: findAskMutqinModalSource(), body })
}

async function stubAskMutqinAutoStart(page) {
  return withAskMutqinModal(page, `
    const modal = findAskMutqinModal()
    if (modal) modal.startSession = async () => {}
    return !!modal
  `)
}

async function resetModalToIntro(page) {
  return withAskMutqinModal(page, `
    const modal = findAskMutqinModal()
    if (!modal || typeof modal.resetSession !== 'function') return { ok: false }
    modal.startSession = async () => {}
    modal.resetSession()
    modal.state = 'intro'
    modal.errorMessage = ''
    modal.errorCode = ''
    modal.match = null
    return {
      ok: true,
      state: modal.state,
      hasIntro: !!document.querySelector('.ask-mutqin-intro'),
      hasStage: !!document.querySelector('.ask-mutqin-ayah__stage'),
    }
  `)
}

function measureStyles() {
  const pick = (el, props) => {
    if (!el) return null
    const cs = getComputedStyle(el)
    const out = {}
    for (const prop of props) out[prop] = cs[prop]
    return out
  }

  const rectOf = el => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }
  }

  const overlay = document.querySelector('.ask-mutqin-overlay')
  const dialog = document.querySelector('.ask-mutqin-dialog')
  const modal = document.querySelector('.ask-mutqin-modal')
  const intro = document.querySelector('.ask-mutqin-intro')
  const placeholder = document.querySelector('.ask-mutqin-ayah__placeholder')
  const stage = document.querySelector('.ask-mutqin-ayah__stage')

  const modalRect = rectOf(modal)
  const viewportHeight = window.innerHeight

  return {
    viewport: { width: window.innerWidth, height: viewportHeight },
    overlay: {
      rect: rectOf(overlay),
      styles: pick(overlay, ['display', 'placeItems', 'alignItems', 'justifyContent', 'height', 'padding']),
    },
    dialog: {
      rect: rectOf(dialog),
      styles: pick(dialog, ['minHeight', 'height', 'maxHeight', 'alignSelf', 'display', 'alignItems', 'margin']),
    },
    modal: {
      rect: modalRect,
      styles: pick(modal, ['minHeight', 'height', 'maxHeight', 'fontSize', 'display']),
    },
    intro: {
      rect: rectOf(intro),
      styles: pick(intro, ['fontSize']),
    },
    placeholder: {
      rect: rectOf(placeholder),
      styles: pick(placeholder, ['fontSize']),
    },
    stage: {
      rect: rectOf(stage),
      styles: pick(stage, ['minHeight', 'height']),
    },
    centering: modalRect
      ? {
          modalTop: modalRect.top,
          modalBottom: modalRect.bottom,
          viewportHeight,
          sumTopBottom: modalRect.top + modalRect.bottom,
          centerOffset: (modalRect.top + modalRect.bottom) / 2 - viewportHeight / 2,
        }
      : null,
  }
}

async function inspectViewport(browser, baseUrl, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.name === 'mobile',
    hasTouch: viewport.name === 'mobile',
  })

  try {
    const loginResult = await login(page, baseUrl)
    if (loginResult.method === 'failed') {
      return { viewport: viewport.name, success: false, step: 'login', ...loginResult }
    }

    await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded', timeout: 60000 })

    try {
      await page.waitForSelector('#app .app', { timeout: 60000 })
    } catch (err) {
      return {
        viewport: viewport.name,
        success: false,
        step: 'wait-for-app',
        error: String(err),
        url: page.url(),
        pageText: (await page.locator('body').innerText()).slice(0, 800),
      }
    }

    await page.waitForTimeout(1200)
    const dismissed = await dismissOverlays(page)
    await page.waitForTimeout(600)

    const clickResult = await clickAskMutqin(page)
    if (!clickResult.clicked) {
      const visibleButtons = await page.locator('button:visible').evaluateAll(nodes =>
        nodes.slice(0, 20).map(n => ({
          text: (n.textContent || '').trim().slice(0, 80),
          testid: n.getAttribute('data-testid'),
          className: n.className,
        }))
      )
      return {
        viewport: viewport.name,
        success: false,
        step: 'click-ask-mutqin',
        clickResult,
        dismissed,
        url: page.url(),
        visibleButtons,
        pageText: (await page.locator('body').innerText()).slice(0, 800),
      }
    }

    let resetResult = null
    try {
      await page.waitForSelector('.ask-mutqin-overlay', { state: 'visible', timeout: 15000 })
      await page.waitForSelector('.ask-mutqin-modal', { state: 'visible', timeout: 15000 })
      await stubAskMutqinAutoStart(page)
      resetResult = await resetModalToIntro(page)
      await page.waitForFunction(() => {
        const intro = document.querySelector('.ask-mutqin-intro')
        const stage = document.querySelector('.ask-mutqin-ayah__stage')
        const modal = document.querySelector('.ask-mutqin-modal')
        return !!(intro && stage && modal && modal.getBoundingClientRect().height > 220)
      }, { timeout: 10000 })
      await page.waitForTimeout(300)
    } catch (err) {
      return {
        viewport: viewport.name,
        success: false,
        step: 'wait-for-modal',
        error: String(err),
        clickResult,
        resetResult,
        dismissed,
        url: page.url(),
        pageText: (await page.locator('body').innerText()).slice(0, 800),
      }
    }

    const measurements = await page.evaluate(measureStyles)

    return {
      viewport: viewport.name,
      success: true,
      login: loginResult,
      clickResult,
      resetResult,
      dismissed,
      measurements,
    }
  } finally {
    await page.close()
  }
}

const baseUrl = await resolveBaseUrl()
const browser = await chromium.launch({ headless: true })

const results = {}
for (const viewport of viewports) {
  results[viewport.name] = await inspectViewport(browser, baseUrl, viewport)
}

await browser.close()

console.log(JSON.stringify({ baseUrl, results }, null, 2))
