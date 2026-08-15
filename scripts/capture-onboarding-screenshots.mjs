/**
 * Capture real onboarding step screenshots from /memorisation.
 * Usage: node scripts/capture-onboarding-screenshots.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8001'
const email = process.env.MUTQIN_TEST_EMAIL || 'practice01@example.com'
const password = process.env.MUTQIN_TEST_PASSWORD || 'Practice01!'
const outDir = path.resolve('public/images/onboarding')

fs.mkdirSync(outDir, { recursive: true })

function vueVmSource() {
  return `
    const root = document.querySelector('#app')?.__vue_app__?._container?._vnode
    let vm = null
    const walk = node => {
      if (!node || vm) return
      if (node.component?.type?.name === 'TelawaApp') {
        vm = node.component.proxy
        return
      }
      if (node.component) walk(node.component.subTree)
      if (Array.isArray(node.children)) node.children.forEach(walk)
    }
    if (root) walk(root)
    window.__mutqinCaptureVm = vm
  `
}

async function nextPaint(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.waitForTimeout(500)
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(5000)
  if (!page.url().includes('/memorisation')) {
    await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(2000)
  }
  await page.waitForSelector('.workspace-shell', { timeout: 60000 })
}

async function getVm(page) {
  return page.evaluate(source => {
    eval(source)
    const vm = window.__mutqinCaptureVm
    if (!vm) throw new Error('TelawaApp Vue instance was not found')
    return true
  }, vueVmSource())
}

async function runVm(page, fn) {
  await getVm(page)
  await page.evaluate(async fnBody => {
    const vm = window.__mutqinCaptureVm
    const run = new Function('vm', `return (async () => { ${fnBody} })()`)
    await run(vm)
    await vm.$nextTick()
  }, fn)
}

async function prepareWorkspace(page) {
  await runVm(page, `
    vm.showWelcomeBackModal = false
    vm.returningUserChoicePending = false
    vm.welcomeBackWorkspaceHidden = false
    vm.showPostLoginOnboarding = false
    vm.showPostSessionModal = false
    vm.showSessionExitModal = false
    vm.amdOpen = false
    vm.showTools = false
    if (typeof vm.completeOnboardingExploreWorkspace === 'function') {
      await vm.completeOnboardingExploreWorkspace()
    }
    if (!vm.verses?.length) {
      vm.chapterId = vm.chapterId || 1
      vm.rangeStart = vm.rangeStart || 1
      vm.rangeEnd = vm.rangeEnd || 7
      await vm.loadChapter(vm.currentMode || 'advanced')
    }
  `)
  await page.waitForSelector('.workspace-shell', { timeout: 60000 })
  await nextPaint(page)
}

async function captureElement(page, selector, fileName, setupFn) {
  await runVm(page, setupFn)
  await nextPaint(page)
  const element = page.locator(selector).first()
  await element.waitFor({ state: 'visible', timeout: 30000 })
  await element.screenshot({ path: path.join(outDir, fileName) })
  console.log(`  ${fileName}`)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

try {
  await login(page)
  await prepareWorkspace(page)

  console.log('Capturing onboarding screenshots…')

  await captureElement(page, '.tools', 'setup.png', `
    vm.openToolsPanel({ tab: 'tools' })
    vm.sectionOpen.advanced_setup = true
    vm.sectionOpen.advanced_playback = false
  `)

  await captureElement(page, '.tools', 'practice.png', `
    vm.openToolsPanel({ tab: 'techniques' })
    vm.sectionOpen.focus_mode = true
    vm.sectionOpen.blur_mode = false
  `)

  await captureElement(page, '.amd-modal', 'coach.png', `
    vm.showTools = false
    vm.showPostSessionModal = false
    const verse = vm.verses?.[0]
    if (typeof vm.openAiMemorisationDetection === 'function') {
      await vm.openAiMemorisationDetection({ verse, scope: 'ayah', fromTestWithAi: true })
    }
  `)

  await captureElement(page, '.post-session-simple', 'improve.png', `
    vm.showTools = false
    vm.amdOpen = false
    const snapshot = typeof vm.buildSessionEndedSnapshot === 'function'
      ? vm.buildSessionEndedSnapshot({ force: true })
      : null
    if (typeof vm.openPostSessionModal === 'function') {
      vm.openPostSessionModal(snapshot, { previousStreak: Number(vm.analytics?.currentStreak || 0) })
    } else {
      vm.postSessionSnapshot = snapshot
      vm.showPostSessionModal = true
      vm.postSessionStatsExpanded = true
    }
    if (!vm.postSessionRecommendation && typeof vm.enrichPostSessionRecommendation === 'function') {
      const fallback = {
        headline: 'Continue with Al-Fatihah 4-6',
        reason: 'Build on today’s progress with a short next range.',
        config: { chapterId: 1, rangeStart: 4, rangeEnd: 6 },
      }
      vm.postSessionRecommendation = vm.enrichPostSessionRecommendation(fallback)
      vm.postSessionRecommendationStatus = 'ready'
      vm.postSessionViewState = 'recommendation_ready'
    }
  `)

  console.log(`Done — saved to ${outDir}`)
} catch (error) {
  console.error('Capture failed:', error.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
