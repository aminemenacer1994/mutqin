import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'

const baseUrl = process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8001'
const email = process.env.MUTQIN_TEST_EMAIL || 'practice01@example.com'
const password = process.env.MUTQIN_TEST_PASSWORD || 'Practice01!'
const capturePrefix = process.env.MUTQIN_CAPTURE_PREFIX || ''
const browserName = process.env.MUTQIN_BROWSER || 'chromium'
const browserType = browserName === 'webkit' ? webkit : chromium
const fullViewportMatrix = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 767, height: 900 }
]
const viewports = process.env.MUTQIN_TEST_QUICK === '1'
  ? [{ width: 390, height: 844 }]
  : fullViewportMatrix

const stateSelectors = {
  workspace: ['.workspace-shell', '.workspace-shell-head', '.workspace-shell-actions', '.workspace-shell-metadata', '.verses-grid', '.verse-card', '.verse-header', '.verse-actions', '.verse-arabic'],
  active: ['.workspace-shell', '.workspace-shell-head', '.workspace-shell-actions', '.workspace-shell-metadata', '.verse-card', '.verse-header', '.verse-statuses', '.verse-actions', '.verse-arabic'],
  mushaf: ['.workspace-shell', '.mushaf-workspace', '.mushaf-frame', '.mushaf-pill-toolbar', '.mushaf-stage', '.mushaf-viewport', '.mushaf-page', '.mushaf-ayah-text'],
  controls: ['.tools', '.tools-top', '.tools-tabs', '.tools-body', '.sheet', '.sheet-toggle', '.sheet-content', '.tools-footer'],
  practice: ['.tools', '.tools-top', '.tools-tabs', '.tools-body', '.sheet', '.sheet-toggle', '.st-txt', '.st-right-group', '.tools-footer'],
  saved: ['.tools', '.tools-top', '.tools-tabs', '.tools-body', '.sheet', '.saved-sessions-list', '.saved-session-row', '.saved-session-row-main', '.saved-session-row-actions', '.tools-footer'],
  player: ['.player-dock', '.player-bar', '.player-main', '.player-progress-wrap'],
  shortcuts: ['.keyboard-shortcuts-modal', '.keyboard-shortcuts-header', '.keyboard-shortcuts-body', '.keyboard-shortcuts-device-note', '.keyboard-shortcuts-grid', '.keyboard-shortcuts-group.is-open', '.keyboard-shortcuts-list'],
  selfCheck: ['.self-check-modal', '.self-check-modal-header', '.self-check-modal-head-copy', '#selfCheckModalTitle', '.self-check-modal-body', '.self-check-modal-stage', '.self-check-section-head', '.self-check-header-tools', '.self-check-modal-ayah-shell', '.self-check-mobile-start-card'],
  recording: ['.self-check-modal', '.self-check-modal-header', '.self-check-modal-body', '.ai-check-step-guide', '.self-check-modal-stage', '.self-check-mobile-recording-card', '.self-check-mobile-recording-copy'],
  processing: ['.self-check-modal', '.self-check-modal-header', '.self-check-modal-body', '.ai-check-step-guide', '.self-check-modal-stage', '.self-check-modal-recorder-grid', '.recitation-check-panel-inline', '.recitation-check-status'],
  recordingError: ['.self-check-modal', '.self-check-modal-header', '.self-check-modal-body', '.ai-check-step-guide', '.self-check-modal-stage', '.self-check-modal-recorder-grid', '.recitation-check-panel-inline', '.recitation-check-error'],
  report: ['.self-check-modal', '.self-check-modal-header', '.self-check-modal-head-copy', '#selfCheckModalTitle', '.self-check-modal-body', '.recitation-check-panel-inline', '.shared-result-section', '.recitation-result-stats', '.shared-result-support-grid', '.recitation-result-actions'],
  recordings: ['.recordings-library-modal', '.recordings-library-header', '.recordings-library-body', '.recordings-library-shell', '.recordings-library-detail', '.recording-history-card'],
  recordingsLoading: ['.recordings-library-modal', '.recordings-library-header', '.recordings-library-body', '.recordings-library-loading'],
  recordingsEmpty: ['.recordings-library-modal', '.recordings-library-header', '.recordings-library-body', '.recordings-library-empty'],
  onboarding: ['.post-onboarding-modal', '.onboarding-hero', '.onboarding-progress', '.onboarding-body', '.mutqin-modal-footer'],
  paused: ['.session-exit-modal', '.session-exit-hero', '.session-exit-body', '.mutqin-modal-footer', '.session-exit-actions-layout'],
  complete: ['.post-session-simple', '.post-session-simple__header', '.post-session-simple__body', '.post-session-simple__footer', '.post-session-simple__actions']
}

const touchTargetSelectors = {
  workspace: '.top-card-action-trigger, .verse-ai-check-btn, .verse-inline-action-btn',
  active: '.top-card-action-trigger, .verse-ai-check-btn, .verse-inline-action-btn',
  mushaf: '.mushaf-toolbar-trigger, .mushaf-pill, .mushaf-stage-nav',
  controls: '.tools-x, .tools-tabs button, .tools-footer button',
  practice: '.tools-x, .tools-tabs button, .sheet-toggle, .mode-radio, .tools-footer button',
  saved: '.tools-x, .tools-tabs button, .saved-session-row button, .tools-footer button',
  player: '.player-controls button, .player-actions button',
  shortcuts: '.keyboard-shortcuts-header button, .keyboard-shortcuts-group-header, .keyboard-shortcuts-modal .mutqin-modal-footer button',
  selfCheck: '.self-check-modal-header button, .self-check-header-tools button',
  recording: '.self-check-modal-header button, .self-check-header-tools button, .self-check-mobile-recording-card button',
  processing: '.self-check-modal-header button, .self-check-header-tools button',
  recordingError: '.self-check-modal-header button, .self-check-header-tools button, .recitation-check-error-card button',
  report: '.self-check-modal-header button, .self-check-header-tools button, .recitation-result-actions button',
  recordings: '.recordings-library-header button, .recordings-library-nav-toggle, .recording-history-actions button',
  recordingsLoading: '.recordings-library-header button',
  recordingsEmpty: '.recordings-library-header button',
  onboarding: '.onboarding-close-btn, .onboarding-nav-actions button',
  paused: '.session-exit-actions-layout button',
  complete: '.post-session-simple__footer button'
}

const publicRoutes = [
  {
    path: '/',
    selectors: ['.vue-onboarding', '.hero', '.hero-container', '.demo-card', '.demo-wave', '.section-container', '.features-grid', '.steps-grid', '.pricing-grid', '.pricing-comparison', '.contact-grid', '.footer-container'],
    gridSelectors: ['.navbar-shell', '.hero-layout', '.problem-solution', '.hero-buttons', '.demo-card', '.features-grid', '.steps-grid', '.testimonials-grid', '.pricing-grid', '.contact-grid', '.cta-layout', '.footer-grid']
  },
  {
    path: '/billing',
    selectors: ['.vue-onboarding', '.hero', '.pricing-grid', '.pricing-comparison', '.contact-grid', '.footer-container'],
    gridSelectors: ['.navbar-shell', '.hero-layout', '.problem-solution', '.hero-buttons', '.pricing-grid', '.contact-grid', '.cta-layout', '.footer-grid']
  },
  {
    path: '/about',
    selectors: ['.story-page', '.story-shell', '.story-hero', '.story-copy', '.story-panel', '.story-columns', '.story-band'],
    gridSelectors: ['.navbar-shell', '.story-shell', '.story-hero', '.story-columns', '.story-signals', '.story-band', '.story-band-metrics']
  },
  {
    path: '/about-us',
    selectors: ['.story-page', '.story-shell', '.story-hero', '.story-copy', '.story-panel', '.story-columns', '.story-band'],
    gridSelectors: ['.navbar-shell', '.story-shell', '.story-hero', '.story-columns', '.story-signals', '.story-band', '.story-band-metrics']
  },
  {
    path: '/our-mission',
    selectors: ['.mission-page', '.mission-shell', '.mission-hero', '.mission-copy', '.mission-side-panel', '.mission-roadmap', '.mission-band'],
    gridSelectors: ['.navbar-shell', '.mission-shell', '.mission-hero', '.mission-roadmap', '.mission-band', '.mission-band-points']
  },
  {
    path: '/donate',
    selectors: ['.donation-page', '.donation-shell', '.donation-hero', '.donation-copy', '.donation-focus', '.donation-grid', '.donation-cta'],
    gridSelectors: ['.navbar-shell', '.donation-shell', '.donation-hero', '.donation-grid', '.donation-signals', '.donation-cta']
  },
  {
    path: '/login',
    selectors: ['.auth-shell', '.auth-stage', '.auth-form-wrap'],
    gridSelectors: ['.navbar-shell', '.auth-stage', '.auth-form-wrap', '.auth-form-grid']
  },
  {
    path: '/register',
    selectors: ['.auth-shell', '.auth-stage', '.auth-form-wrap'],
    gridSelectors: ['.navbar-shell', '.auth-stage', '.auth-form-wrap', '.auth-form-grid']
  },
  {
    path: '/password/reset',
    selectors: ['.auth-shell', '.auth-card', '.auth-form-wrap'],
    gridSelectors: ['.navbar-shell', '.auth-form-wrap']
  }
]

const authenticatedRoutes = [
  {
    path: '/profile',
    selectors: ['.profile-page', '.profile-stage', '.profile-hero-card', '.profile-grid', '.profile-pane', '.profile-subscription-grid'],
    gridSelectors: ['.navbar-shell', '.profile-stage', '.profile-hero-card', '.profile-grid', '.profile-subscription-grid']
  }
]

function vueVmSource() {
  return `
    const root = document.querySelector('#app')?.__vue_app__?._container?._vnode
    let vm = window.__mutqinResponsiveVm || null
    const walk = node => {
      if (!node || vm) return
      if (node.component?.type?.name === 'TelawaApp') {
        vm = node.component.proxy
        return
      }
      if (node.component) walk(node.component.subTree)
      if (Array.isArray(node.children)) node.children.forEach(walk)
    }
    if (!vm) walk(root)
    window.__mutqinResponsiveVm = vm
  `
}

async function nextPaint(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.waitForTimeout(450)
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('button[type="submit"]').click()
  ])
  await page.goto(`${baseUrl}/memorisation`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('#app .app', { timeout: 60000 })
  await page.waitForTimeout(1200)
}

async function prepareWorkspace(page) {
  await page.evaluate(async source => {
    eval(source)
    const vm = window.__mutqinResponsiveVm
    if (!vm) throw new Error('TelawaApp Vue instance was not found')
    vm.showWelcomeBackModal = false
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
    vm.readingViewMode = 'stacked'
    if (typeof vm.completeOnboardingExploreWorkspace === 'function') {
      await vm.completeOnboardingExploreWorkspace()
    }
    await vm.$nextTick()
  }, vueVmSource())
  await page.waitForSelector('.workspace-shell')
  await nextPaint(page)
}

async function setState(page, state) {
  await page.evaluate(async ({ state, source }) => {
    eval(source)
    const vm = window.__mutqinResponsiveVm
    if (!vm) throw new Error('TelawaApp Vue instance was not found')

    vm.showTools = false
    vm.showPostLoginOnboarding = false
    vm.showPostSessionModal = false
    vm.showSessionExitModal = false
    vm.showSelfCheckModal = false
    vm.showRecordingsLibrary = false
    vm.showKeyboardShortcuts = false
    vm.playerVisible = false
    vm.playerDismissed = true
    vm.readingViewMode = 'stacked'
    vm.recitationCheckRecording = false
    vm.recitationCheckPreparing = false
    vm.recitationCheckError = ''
    vm.isRecordingsLibraryLoading = false

    const activeFixtureStates = ['active', 'paused', 'complete']
    const needsActiveFixture = activeFixtureStates.includes(state)
    if (vm.mutqinState?.sessionState) {
      vm.mutqinState.sessionState.active = needsActiveFixture
    }
    if (needsActiveFixture) {
      vm.sessionCompleted = false
      vm.sessionStartedAt = Date.now() - 15000
      if (!Array.isArray(vm.queue) || !vm.queue.length) vm.buildQueue(vm.currentMode)
    }

    const verse = vm.verses?.[0]
    if (state === 'mushaf') {
      vm.readingViewMode = 'mushaf'
    } else if (state === 'controls') {
      vm.openToolsPanel({ tab: 'tools' })
    } else if (state === 'practice') {
      vm.openToolsPanel({ tab: 'techniques' })
    } else if (state === 'saved') {
      vm.openToolsPanel({ tab: 'saved' })
      const now = new Date().toISOString()
      vm.savedSessions = [
        {
          id: 'mobile-saved-1',
          name: 'Al-Fatihah 1-3 · Ayah 1 · Evening revision after class · 15:25',
          savedAt: now,
          config: { chapterId: 1, chapterName: 'Al-Fatihah', rangeStart: 1, rangeEnd: 3 },
          stats: { verses_read: 1, session_flow_steps: 3 }
        },
        {
          id: 'mobile-saved-2',
          name: 'Al-Fatihah 3-5 · Ayah 3 · 14:31',
          savedAt: new Date(Date.now() - 3600000).toISOString(),
          config: { chapterId: 1, chapterName: 'Al-Fatihah', rangeStart: 3, rangeEnd: 5 },
          stats: { verses_read: 3, session_flow_steps: 3, sessions_completed: 1 }
        }
      ]
    } else if (state === 'player') {
      vm.activeVerseKey = verse?.key || vm.activeVerseKey
      vm.currentTime = 3
      vm.duration = 4
      vm.playerVisible = true
      vm.playerDismissed = false
    } else if (state === 'shortcuts') {
      vm.activeKeyboardShortcutGroup = 'playback'
      vm.showKeyboardShortcuts = true
    } else if (['selfCheck', 'recording', 'processing', 'recordingError', 'report', 'recordings', 'recordingsLoading', 'recordingsEmpty'].includes(state)) {
      vm.selfCheckVerseRef = typeof vm.buildSelfCheckVerseRef === 'function' ? vm.buildSelfCheckVerseRef(verse) : verse
      vm.selfCheckVerseKey = verse?.key || ''
      vm.recitationCheckTargetVerseKey = verse?.key || ''
      vm.recitationCheckPendingTargets = verse ? [verse] : []
      vm.recitationCheckScope = 'ayah'
      vm.recitationCheckPanelOpen = true
      let result = null
      if (['report', 'recordings'].includes(state)) {
        const targetText = vm.getPlainVerseArabicForCheck(verse)
        const recognitionWords = vm.tokenizeRecitationDisplayWords(targetText).map((text, index) => ({
          text,
          transcript: text,
          confidence: 0.99,
          isFinal: true,
          index
        }))
        result = vm.assessRecitationRecognitionWords(recognitionWords, [verse], {
          id: 'mobile-responsive-fixture',
          sessionId: 'mobile-responsive-session',
          startedAt: Date.now() - 6000,
          endedAt: Date.now()
        })
        vm.recitationCheckResult = result
        vm.recitationLiveWords = result.wordStatuses || []
      } else {
        vm.recitationCheckResult = null
      }
      if (state === 'recording') {
        vm.recitationCheckRecording = true
        vm.recitationCheckStartedAt = Date.now() - 2500
        vm.showSelfCheckModal = true
      } else if (state === 'processing') {
        vm.recitationCheckStartedAt = Date.now() - 6000
        vm.recitationCheckPreparing = true
        vm.showSelfCheckModal = true
      } else if (state === 'recordingError') {
        vm.recitationCheckError = 'Microphone access was denied. Check browser permissions and try again.'
        vm.showSelfCheckModal = true
      } else if (state === 'recordings') {
        const savedEntry = {
          id: 'mobile-responsive-fixture',
          source: 'ai-check',
          type: 'ai-check',
          chapterId: verse?.chapterId || vm.currentChapter?.id || 1,
          chapterName: vm.currentChapter?.name_simple || 'Al-Fatihah',
          ayahNumber: verse?.number || 1,
          ayahKey: verse?.key || '1:1',
          recordedAt: result.timestamp || new Date().toISOString(),
          durationSeconds: 6,
          result: 'Excellent',
          accuracyScore: result.accuracyScore,
          transcript: result.transcript,
          targetText: result.targetText,
          wordStatuses: result.wordStatuses,
          tajweedRules: result.tajweedRules || [],
          recommendation: result.recommendation,
          mistakeBreakdown: result.mistakes,
          reviewMetadata: result.reviewMetadata,
          validationReport: result.validationReport || null,
          audioSrc: '',
          sessionRangeStart: Number(vm.rangeStart || 1),
          sessionRangeEnd: Number(vm.rangeEnd || 1)
        }
        vm.recordingsLibrary = [savedEntry]
        vm.selectedRecordingsEntryId = savedEntry.id
        vm.selectedRecordingsAyahKey = savedEntry.ayahKey
        vm.showSelfCheckModal = false
        vm.showRecordingsLibrary = true
        vm.recordingsNavExpanded = false
        vm.ensureSelectedRecordingsSelection()
      } else if (['recordingsLoading', 'recordingsEmpty'].includes(state)) {
        vm.recordingsLibrary = []
        vm.selectedRecordingsEntryId = ''
        vm.selectedRecordingsAyahKey = ''
        vm.showSelfCheckModal = false
        vm.showRecordingsLibrary = true
        vm.recordingsNavExpanded = false
        vm.isRecordingsLibraryLoading = state === 'recordingsLoading'
      } else {
        vm.showSelfCheckModal = true
      }
    } else if (state === 'onboarding') {
      vm.onboardingStepIndex = 0
      vm.showPostLoginOnboarding = true
    } else if (state === 'paused') {
      if (typeof vm.openSessionExitModal === 'function') vm.openSessionExitModal()
      else vm.showSessionExitModal = true
    } else if (state === 'complete') {
      const snapshot = typeof vm.buildSessionEndedSnapshot === 'function'
        ? vm.buildSessionEndedSnapshot({ force: true })
        : null
      vm.postSessionSnapshot = snapshot
      vm.postSessionAutoSaved = true
      vm.showPostSessionModal = true
      vm.postSessionStatsExpanded = true
    }

    vm.syncBodyScrollLock()
    await vm.$nextTick()
  }, { state, source: vueVmSource() })
  await nextPaint(page)
}

async function inspectState(page, state) {
  const selectors = stateSelectors[state] || stateSelectors.workspace
  return page.evaluate(({ selectors, state, touchTargetSelectors }) => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const measurements = []
    const issues = []

    const visibleElements = selector => Array.from(document.querySelectorAll(selector)).filter(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0
    })

    const countGridTracks = value => {
      const source = String(value || '').trim()
      if (!source || source === 'none') return 0
      const repeated = source.match(/^repeat\(\s*(\d+)/)
      if (repeated) return Number(repeated[1])
      let depth = 0
      let tracks = 0
      let inTrack = false
      for (const character of source) {
        if (character === '(') depth += 1
        if (character === ')') depth = Math.max(0, depth - 1)
        if (/\s/.test(character) && depth === 0) {
          if (inTrack) tracks += 1
          inTrack = false
        } else {
          inTrack = true
        }
      }
      return tracks + (inTrack ? 1 : 0)
    }

    const expectGrid = (selector, expectedTracks = 4) => {
      const elements = visibleElements(selector)
      if (!elements.length) {
        issues.push(`${state}: grid contract ${selector} is missing`)
        return
      }
      for (const element of elements.slice(0, 4)) {
        const style = getComputedStyle(element)
        const tracks = countGridTracks(style.gridTemplateColumns)
        if (!['grid', 'inline-grid'].includes(style.display) || tracks !== expectedTracks) {
          issues.push(`${state}: ${selector} has ${tracks} tracks with display ${style.display}; expected ${expectedTracks}`)
        }
      }
    }

    const expectParallel = (firstSelector, secondSelector, label) => {
      const first = visibleElements(firstSelector)[0]
      const second = visibleElements(secondSelector)[0]
      if (!first || !second) {
        issues.push(`${state}: ${label} parallel regions are missing`)
        return
      }
      const a = first.getBoundingClientRect()
      const b = second.getBoundingClientRect()
      const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (verticalOverlap < 2 || horizontalOverlap > 2) {
        issues.push(`${state}: ${label} is not composed as parallel grid regions`)
      }
    }

    const gridContracts = {
      workspace: ['.workspace-shell', '.workspace-shell-head', '.workspace-shell-actions', '.workspace-shell-metadata', '.verse-header'],
      active: ['.workspace-shell', '.workspace-shell-head', '.workspace-shell-actions', '.workspace-shell-metadata', '.verse-header'],
      mushaf: ['.workspace-shell', '.workspace-shell-head', '.workspace-shell-actions', '.workspace-shell-metadata', '.mushaf-pill-toolbar', '.mushaf-stage'],
      controls: ['.tools-topbar', ['.tools-tabs', 3], '.tools-body', '.sheet', '.sheet-toggle', '.sheet-content > .field-stack-compact', '.tools-footer'],
      practice: ['.tools-topbar', ['.tools-tabs', 3], '.tools-body', '.sheet', '.sheet-toggle', '.tools-footer'],
      saved: ['.tools-topbar', ['.tools-tabs', 3], '.tools-body', '.sheet', '.saved-sessions-list', '.saved-session-row', '.saved-current-session-sheet', '.tools-footer'],
      player: ['.player-main'],
      shortcuts: ['.keyboard-shortcuts-grid'],
      selfCheck: ['.self-check-modal-header', '.self-check-modal-body', '.self-check-modal-stage', '.self-check-section-head'],
      recording: ['.self-check-modal-header', '.self-check-modal-body', '.ai-check-step-guide', '.self-check-modal-stage', '.self-check-mobile-recording-card'],
      processing: ['.self-check-modal-header', '.self-check-modal-body', '.ai-check-step-guide', '.self-check-modal-stage', '.self-check-modal-recorder-grid', '.recitation-check-panel-inline'],
      recordingError: ['.self-check-modal-header', '.self-check-modal-body', '.ai-check-step-guide', '.self-check-modal-stage', '.self-check-modal-recorder-grid', '.recitation-check-panel-inline'],
      report: ['.self-check-modal-header', '.self-check-modal-body', '.ai-check-step-guide', '.self-check-modal-stage', '.recitation-check-panel-inline', '.shared-result-flow', '.recitation-result-stats', '.shared-result-support-grid', '.recitation-result-actions'],
      recordings: ['.recordings-library-header', '.recordings-library-body', '.recordings-library-shell', '.recordings-library-nav-head', '.recordings-library-detail-head', '.recording-history-top'],
      recordingsLoading: ['.recordings-library-header', '.recordings-library-body'],
      recordingsEmpty: ['.recordings-library-header', '.recordings-library-body'],
      onboarding: ['.onboarding-hero', '.onboarding-body', '.onboarding-preview-grid', '.onboarding-nav-actions'],
      paused: ['.session-exit-body', '.session-exit-actions-layout', ['.session-exit-actions-secondary', 2], '.session-exit-progress-summary'],
      complete: ['.post-session-simple__header', '.post-session-simple__body', '.post-session-simple__row', '.post-session-simple__actions']
    }

    if (viewportWidth < 768) {
      for (const contract of gridContracts[state] || []) {
        const [selector, tracks] = Array.isArray(contract) ? contract : [contract, 4]
        expectGrid(selector, tracks)
      }

      if (['workspace', 'active'].includes(state)) {
        expectParallel('.verse-badges', '.verse-actions', 'ayah header')
        expectParallel('.workspace-shell-metadata > :nth-child(1)', '.workspace-shell-metadata > :nth-child(2)', 'metadata')
      }
      if (state === 'active') {
        expectParallel('.action-btn-exit', '.top-card-controls-trigger', 'secondary action rail')
        const primary = visibleElements('.top-card-session-actions.has-paired-actions > .session-primary-action')[0]?.getBoundingClientRect()
        const exit = visibleElements('.top-card-session-actions.has-paired-actions > .action-btn-exit')[0]?.getBoundingClientRect()
        if (!primary || !exit || exit.top < primary.bottom - 2) issues.push('active: primary and end-session actions did not reflow to separate rows')
      }
      if (state === 'controls') expectParallel('.sheet-content > .field-stack-compact > .field:nth-child(1)', '.sheet-content > .field-stack-compact > .field:nth-child(3)', 'Surah and reciter fields')
      if (state === 'practice') expectParallel('.sheet-toggle > .st-left .st-txt', '.sheet-toggle > .st-right-group', 'practice copy and controls')
      if (state === 'saved') {
        if (viewportWidth < 480) {
          const copy = visibleElements('.saved-session-row-main')[0]?.getBoundingClientRect()
          const actions = visibleElements('.saved-session-row-actions')[0]?.getBoundingClientRect()
          if (!copy || !actions || actions.top < copy.bottom - 2) issues.push('saved: copy and actions did not reflow to separate rows')
        } else {
          expectParallel('.saved-session-row-main', '.saved-session-row-actions', 'saved-session copy and actions')
        }
      }
      if (state === 'player') {
        expectParallel('.player-info', '.player-actions', 'player title and utilities')
        if (viewportWidth >= 430) {
          expectParallel('.player-controls', '.player-progress-wrap', 'player controls and progress')
        } else {
          const controls = visibleElements('.player-controls')[0]?.getBoundingClientRect()
          const progress = visibleElements('.player-progress-wrap')[0]?.getBoundingClientRect()
          if (!controls || !progress || progress.top < controls.bottom - 2) issues.push('player: narrow timeline did not move below playback controls')
        }
      }
      if (['recording', 'processing', 'recordingError', 'report'].includes(state)) expectParallel('.ai-check-step-badge', '.ai-check-step-copy', 'AI Recite step guide')
      if (state === 'recordings') expectParallel('.recordings-library-nav-intro', '.recordings-library-nav-toggle', 'recordings navigation')
      if (state === 'onboarding') expectParallel('.onboarding-step-icon', '.onboarding-hero-copy', 'onboarding hero')
      if (state === 'paused' && viewportWidth >= 350) {
        expectParallel('.session-exit-actions-secondary > :nth-child(1)', '.session-exit-actions-secondary > :nth-child(2)', 'paused secondary actions')
        const keepBtn = Array.from(document.querySelectorAll('.session-exit-actions-layout button')).find(btn => /keep practising/i.test(btn.textContent || ''))
        const endBtn = Array.from(document.querySelectorAll('.session-exit-actions-layout button')).find(btn => /end session/i.test(btn.textContent || ''))
        if (!keepBtn) issues.push('paused: Keep practising button missing')
        if (!endBtn) issues.push('paused: End session button missing')
        const startNew = Array.from(document.querySelectorAll('.session-exit-actions-layout button')).find(btn => /start new session/i.test(btn.textContent || ''))
        const repeat = Array.from(document.querySelectorAll('.session-exit-actions-layout button')).find(btn => /repeat session/i.test(btn.textContent || ''))
        if (startNew) issues.push('paused: Start new session must wait until completion succeeds')
        if (repeat) issues.push('paused: Repeat session must wait until completion succeeds')
        if (document.querySelector('.mutqin-session-summary-row')) {
          issues.push('paused: Session Overview detail rows should be removed from exit modal')
        }
      }
      if (state === 'complete' && viewportWidth >= 430) {
        const confidence = document.querySelector('.post-session-simple__confidence')
        if (!confidence) issues.push('completion: confidence control missing')
        if (document.querySelector('.post-session-simple__ai')) {
          issues.push('completion: AI Recite section should be removed')
        }
      }
    }

    for (const selector of selectors) {
      const visible = visibleElements(selector)
      if (!visible.length) {
        issues.push(`${selector}: missing`)
        continue
      }
      for (const element of visible.slice(0, 4)) {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const record = {
          selector,
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          columns: style.gridTemplateColumns
        }
        measurements.push(record)
        if (rect.left < -1 || rect.right > viewportWidth + 1) {
          issues.push(`${selector}: outside viewport (${record.left}..${record.right} of ${viewportWidth})`)
        }
        if (element.scrollWidth > element.clientWidth + 2 && !['auto', 'scroll'].includes(style.overflowX)) {
          issues.push(`${selector}: content width ${element.scrollWidth} exceeds ${element.clientWidth}`)
        }
      }
    }

    const documentOverflow = document.documentElement.scrollWidth - viewportWidth
    if (documentOverflow > 2) issues.push(`document: ${documentOverflow}px horizontal overflow`)

    const touchSelector = touchTargetSelectors[state]
    if (touchSelector && viewportWidth < 768) {
      const targets = Array.from(document.querySelectorAll(touchSelector)).filter(element => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return !element.disabled && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      for (const target of targets) {
        const rect = target.getBoundingClientRect()
        if (rect.width < 43.5 || rect.height < 43.5) {
          const style = getComputedStyle(target)
          issues.push(`${state}: undersized touch target ${target.className || target.tagName} (${Math.round(rect.width)}x${Math.round(rect.height)}; CSS ${style.width}x${style.height}; transform ${style.transform})`)
        }
      }
    }

    if (state === 'controls') {
      const body = document.querySelector('.tools-body')
      const tools = document.querySelector('.tools')
      const nested = Array.from(document.querySelectorAll('.tools .sheet-content')).filter(element => {
        const style = getComputedStyle(element)
        return ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2
      })
      if (getComputedStyle(document.body).overflow !== 'hidden') issues.push('controls: body is not scroll locked')
      if (!body || !['auto', 'scroll'].includes(getComputedStyle(body).overflowY)) issues.push('controls: tools body is not the scroll container')
      if (nested.length) issues.push(`controls: ${nested.length} nested scrolling sheet(s)`)
      if (tools) {
        const style = getComputedStyle(tools)
        const centerHit = document.elementFromPoint(viewportWidth / 2, viewportHeight / 2)
        if (Number(style.opacity) < 0.99 || style.filter !== 'none') issues.push('controls: active sheet is visually dimmed')
        if (centerHit && !tools.contains(centerHit)) issues.push(`controls: sheet is covered by ${centerHit.className || centerHit.tagName}`)
      }
    }

    if (['selfCheck', 'recording', 'processing', 'recordingError', 'report', 'recordings', 'recordingsLoading', 'recordingsEmpty', 'shortcuts'].includes(state)) {
      const surface = document.querySelector(
        state === 'shortcuts'
          ? '.keyboard-shortcuts-modal'
          : state.startsWith('recordings')
            ? '.recordings-library-modal'
            : '.self-check-modal'
      )
      if (surface && Math.abs(surface.getBoundingClientRect().height - viewportHeight) > 4) {
        issues.push(`${state}: full-screen surface is ${Math.round(surface.getBoundingClientRect().height)}px, expected ${viewportHeight}px`)
      }
    }

    if (['selfCheck', 'recording', 'processing', 'recordingError', 'report'].includes(state)) {
      const title = document.querySelector('#selfCheckModalTitle')
      const titleStyle = title ? getComputedStyle(title) : null
      const titleRect = title?.getBoundingClientRect()
      if (!title?.textContent?.trim()) issues.push(`${state}: modal title is empty`)
      if (titleRect && (titleRect.left < -1 || titleRect.right > viewportWidth + 1)) issues.push(`${state}: modal title is outside viewport`)
      if (titleRect && (titleRect.top < -1 || titleRect.bottom > viewportHeight + 1)) issues.push(`${state}: modal title is outside viewport vertically`)
      if (titleStyle && (titleStyle.visibility === 'hidden' || Number(titleStyle.opacity) === 0 || titleStyle.color === 'rgba(0, 0, 0, 0)')) {
        issues.push(`${state}: modal title is not visible`)
      }
      if (titleRect) {
        const hit = document.elementFromPoint(titleRect.left + Math.min(8, titleRect.width / 2), titleRect.top + titleRect.height / 2)
        if (hit && hit !== title && !title.contains(hit)) issues.push(`${state}: modal title is covered by ${hit.className || hit.tagName}`)
      }
    }

    if (state === 'shortcuts') {
      const groups = visibleElements('.keyboard-shortcuts-group')
      const openGroups = groups.filter(group => group.classList.contains('is-open'))
      if (openGroups.length !== 1) issues.push(`shortcuts: expected one expanded category, found ${openGroups.length}`)
      for (const group of groups.filter(group => !group.classList.contains('is-open'))) {
        const list = group.querySelector('.keyboard-shortcuts-list')
        if (list && getComputedStyle(list).display !== 'none') issues.push('shortcuts: a collapsed category still exposes its rows')
      }
      const body = document.querySelector('.keyboard-shortcuts-body')
      if (!body || !['auto', 'scroll'].includes(getComputedStyle(body).overflowY)) issues.push('shortcuts: body is not independently scrollable')
    }

    const normalCopy = visibleElements([
      '.workspace-shell-main-title',
      '.workspace-shell-metadata-pill',
      '.verse-status-badge',
      '.st-title',
      '.st-sub',
      '.saved-session-row-title',
      '.saved-session-row-meta',
      '.ai-check-step-copy',
      '.shared-result-section-head',
      '.recording-history-copy',
      '.recordings-library-recording-title',
      '.self-check-mobile-start-copy',
      '.recitation-check-error-copy'
    ].join(','))
    for (const element of normalCopy) {
      if (getComputedStyle(element).wordBreak === 'break-all') {
        issues.push(`${state}: normal interface copy uses word-break: break-all (${element.className || element.tagName})`)
      }
    }

    const textHeavyCards = visibleElements('.shared-result-support-grid > .shared-result-section, .post-session-autosaved-note, .post-session-next-step-card')
    for (let index = 0; index < textHeavyCards.length; index += 1) {
      const current = textHeavyCards[index].getBoundingClientRect()
      const sharesRow = textHeavyCards.some((other, otherIndex) => {
        if (otherIndex === index) return false
        const rect = other.getBoundingClientRect()
        return Math.min(current.bottom, rect.bottom) - Math.max(current.top, rect.top) > 2
          && Math.min(current.right, rect.right) - Math.max(current.left, rect.left) < 2
      })
      if (sharesRow && current.width < 158) issues.push(`${state}: text-heavy parallel card is only ${Math.round(current.width)}px wide`)
    }

    if (state === 'recordings') {
      const detail = document.querySelector('.recordings-library-detail')?.getBoundingClientRect()
      const card = document.querySelector('.recording-history-card')?.getBoundingClientRect()
      if (detail && card && card.width < detail.width - 48) issues.push(`recordings: selected report wastes ${Math.round(detail.width - card.width)}px of available width`)
    }

    if (['onboarding', 'paused', 'complete'].includes(state)) {
      const selector = state === 'onboarding' ? '.post-onboarding-modal' : state === 'paused' ? '.session-exit-modal' : '.post-session-simple__dialog'
      const surface = document.querySelector(selector)
      if (surface && surface.getBoundingClientRect().height > viewportHeight - 18) {
        issues.push(`${state}: centered dialog has no viewport gutter`)
      }
    }

    return { state, viewportWidth, viewportHeight, documentOverflow, issues, measurements }
  }, { selectors, state, touchTargetSelectors })
}

async function inspectRoute(page, route) {
  return page.evaluate(({ route }) => {
    const issues = []
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const countGridTracks = value => {
      const source = String(value || '').trim()
      if (!source || source === 'none') return 0
      const repeated = source.match(/^repeat\(\s*(\d+)/)
      if (repeated) return Number(repeated[1])
      let depth = 0
      let tracks = 0
      let inTrack = false
      for (const character of source) {
        if (character === '(') depth += 1
        if (character === ')') depth = Math.max(0, depth - 1)
        if (/\s/.test(character) && depth === 0) {
          if (inTrack) tracks += 1
          inTrack = false
        } else {
          inTrack = true
        }
      }
      return tracks + (inTrack ? 1 : 0)
    }
    const documentOverflow = document.documentElement.scrollWidth - viewportWidth
    if (documentOverflow > 2) issues.push(`document has ${documentOverflow}px horizontal overflow`)

    for (const selector of route.selectors) {
      const elements = Array.from(document.querySelectorAll(selector))
      if (!elements.length) {
        issues.push(`${selector}: missing`)
        continue
      }
      for (const element of elements.slice(0, 8)) {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        if (style.display === 'none' || style.visibility === 'hidden' || !rect.width || !rect.height) continue
        if (rect.left < -1 || rect.right > viewportWidth + 1) {
          issues.push(`${selector}: outside viewport (${Math.round(rect.left)}..${Math.round(rect.right)})`)
        }
        if (element.scrollWidth > element.clientWidth + 2) {
          issues.push(`${selector}: content width ${element.scrollWidth} exceeds ${element.clientWidth}`)
        }
      }
    }

    const formControls = Array.from(document.querySelectorAll('input, select, textarea, button')).filter(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    })
    for (const control of formControls) {
      const rect = control.getBoundingClientRect()
      if (rect.left < -1 || rect.right > viewportWidth + 1) {
        issues.push(`${control.tagName.toLowerCase()}: control outside viewport`)
      }
    }

    if (viewportWidth < 768) {
      for (const selector of route.gridSelectors || []) {
        const elements = Array.from(document.querySelectorAll(selector)).filter(element => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
        })
        if (!elements.length) {
          issues.push(`${selector}: grid contract is missing`)
          continue
        }
        for (const element of elements.slice(0, 8)) {
          const style = getComputedStyle(element)
          const tracks = countGridTracks(style.gridTemplateColumns)
          if (!['grid', 'inline-grid'].includes(style.display) || tracks !== 4) {
            issues.push(`${selector}: ${tracks} grid tracks with display ${style.display}; expected 4`)
          }
        }
      }

      if (route.path === '/') {
        for (const selector of ['.demo-card > h3', '.demo-card > p', '.demo-card > .demo-wave']) {
          const element = document.querySelector(selector)
          const rect = element?.getBoundingClientRect()
          const style = element ? getComputedStyle(element) : null
          if (!element || !rect || rect.width < 120) issues.push(`${selector}: voice status copy has insufficient width`)
          if (style?.wordBreak === 'break-all') issues.push(`${selector}: voice status copy breaks per character`)
        }
      }
    }

    return { path: route.path, viewportWidth, viewportHeight, issues }
  }, { route })
}

async function auditRoutes(page, routes) {
  const failures = []
  for (const route of routes) {
    await page.setViewportSize(fullViewportMatrix[3])
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(500)
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const result = await inspectRoute(page, route)
      if (result.issues.length) failures.push(result)
      if (capturePrefix) {
        const routeSlug = route.path === '/' ? 'home' : route.path.replace(/^\//, '').replaceAll('/', '-')
        await page.screenshot({ path: `${capturePrefix}-${viewport.width}-route-${routeSlug}.png`, fullPage: true })
      }
    }
  }
  return failures
}

async function auditKeyboardViewport(page) {
  const viewport = { width: 390, height: 430 }
  await page.setViewportSize(viewport)
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('load')
  await page.waitForTimeout(250)
  const passwordField = page.locator('input[name="password"]')
  await passwordField.focus()
  await passwordField.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(150)
  await passwordField.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  return page.evaluate(({ viewport }) => {
    const issues = []
    const field = document.querySelector('input[name="password"]')
    const rect = field?.getBoundingClientRect()
    if (!field || !rect) issues.push('focused password field is missing')
    if (rect && (rect.top < 0 || rect.bottom > viewport.height)) issues.push(`focused password field is obscured (${Math.round(rect.top)}..${Math.round(rect.bottom)})`)
    if (document.documentElement.scrollWidth > viewport.width + 2) issues.push('keyboard viewport has horizontal overflow')
    if (getComputedStyle(document.body).overflowY === 'hidden') issues.push('login page cannot scroll with the keyboard open')
    return { state: 'software-keyboard', viewportWidth: viewport.width, viewportHeight: viewport.height, issues }
  }, { viewport })
}

async function auditNavigation(page, viewport, direction = 'ltr') {
  await page.setViewportSize(viewport)
  await setState(page, 'workspace')
  await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
  const toggler = page.locator('.navbar-toggler')
  await toggler.click()
  await page.waitForTimeout(450)
  const result = await page.evaluate(({ direction }) => {
    const issues = []
    const drawer = document.querySelector('.app-navbar .offcanvas.show')
    if (!drawer) return { direction, issues: ['navigation drawer did not open'] }
    const rect = drawer.getBoundingClientRect()
    const expectedWidth = Math.min(innerWidth * 0.88, 360)
    if (rect.left < -1 || rect.right > innerWidth + 1) issues.push(`drawer outside viewport (${rect.left}..${rect.right})`)
    if (Math.abs(rect.width - expectedWidth) > 2) issues.push(`drawer width ${rect.width}, expected ${expectedWidth}`)
    if (direction === 'rtl' && rect.left > 1) issues.push(`RTL drawer is not anchored to the left (${rect.left})`)
    if (direction === 'ltr' && Math.abs(rect.right - innerWidth) > 1) issues.push(`LTR drawer is not anchored to the right (${rect.right})`)
    const identity = drawer.querySelector('.mobile-nav-identity')
    if (!identity || !identity.textContent.trim()) issues.push('navigation drawer has no product identity or title')
    const destinationLinks = drawer.querySelectorAll('.offcanvas-body .nav-link')
    if (destinationLinks.length < 5) issues.push(`navigation drawer exposes only ${destinationLinks.length} destinations`)
    if (!drawer.querySelector('.offcanvas-body .nav-link.active')) issues.push('navigation drawer has no active destination')
    for (const link of drawer.querySelectorAll('.nav-link')) {
      const linkRect = link.getBoundingClientRect()
      if (linkRect.left < rect.left - 1 || linkRect.right > rect.right + 1) issues.push('navigation link exceeds drawer')
      if (linkRect.height < 42) issues.push('navigation link touch target is undersized')
    }
    for (const link of destinationLinks) {
      const copy = link.querySelector('.nav-link-copy')
      const icon = link.querySelector('.nav-link-icon')
      const copyRect = copy?.getBoundingClientRect()
      const iconStyle = icon ? getComputedStyle(icon) : null
      if (!copy || !copyRect || copyRect.width < Math.min(140, rect.width * 0.42)) {
        issues.push(`navigation copy is constrained to ${Math.round(copyRect?.width || 0)}px`)
      }
      if (copy && getComputedStyle(copy).wordBreak === 'break-all') issues.push('navigation copy uses character-level wrapping')
      if (!icon || iconStyle?.display === 'none') issues.push('navigation destination icon is hidden')
    }
    return { direction, viewportWidth: innerWidth, viewportHeight: innerHeight, issues }
  }, { direction })
  if (capturePrefix) {
    await page.screenshot({ path: `${capturePrefix}-${viewport.width}-navigation-${direction}.png` })
  }
  await page.locator('.app-navbar .offcanvas.show .btn-close').click()
  await page.waitForTimeout(450)
  await page.evaluate(() => { document.documentElement.dir = 'ltr' })
  return result
}

const browser = await browserType.launch({ headless: true })
const context = await browser.newContext({ viewport: fullViewportMatrix[3], hasTouch: true, isMobile: true })
const page = await context.newPage()
const browserErrors = []

function trackBrowserErrors(targetPage) {
  targetPage.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`))
  targetPage.on('response', response => {
    if (response.status() >= 400) browserErrors.push(`response ${response.status()}: ${response.url()}`)
  })
  targetPage.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      browserErrors.push(`console: ${message.text()}`)
    }
  })
}

trackBrowserErrors(page)

try {
  const failures = []
  const guestContext = await browser.newContext({ viewport: fullViewportMatrix[3], hasTouch: true, isMobile: true })
  const guestPage = await guestContext.newPage()
  trackBrowserErrors(guestPage)
  failures.push(...await auditRoutes(guestPage, publicRoutes))
  const keyboardResult = await auditKeyboardViewport(guestPage)
  if (keyboardResult.issues.length) failures.push(keyboardResult)
  await guestContext.close()

  await login(page)
  await prepareWorkspace(page)

  const states = [
    'workspace',
    'active',
    'mushaf',
    'controls',
    'practice',
    'saved',
    'player',
    'shortcuts',
    'selfCheck',
    'recording',
    'processing',
    'recordingError',
    'report',
    'recordings',
    'recordingsLoading',
    'recordingsEmpty',
    'onboarding',
    'paused',
    'complete'
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const state of states) {
      await setState(page, state)
      const result = await inspectState(page, state)
      if (result.issues.length) failures.push(result)
      if (capturePrefix) {
        await page.screenshot({ path: `${capturePrefix}-${viewport.width}-${state}.png` })
      }
    }
  }

  for (const viewport of viewports) {
    const navigationResult = await auditNavigation(page, viewport)
    if (navigationResult.issues.length) {
      failures.push({ ...navigationResult, state: 'navigation-ltr' })
    }
  }

  const rtlViewports = viewports.filter(viewport => [320, 390, 767].includes(viewport.width))
  for (const viewport of rtlViewports) {
    const navigationResult = await auditNavigation(page, viewport, 'rtl')
    if (navigationResult.issues.length) {
      failures.push({ ...navigationResult, state: 'navigation-rtl' })
    }

    await page.evaluate(() => { document.documentElement.dir = 'rtl' })
    const rtlStates = viewport.width === 390 ? states : ['workspace', 'controls']
    for (const state of rtlStates) {
      await setState(page, state)
      const result = await inspectState(page, state)
      if (result.issues.length) failures.push({ ...result, state: `rtl-${state}` })
    }
    await page.evaluate(() => { document.documentElement.dir = 'ltr' })
  }

  await page.setViewportSize({ width: 768, height: 900 })
  await setState(page, 'workspace')
  const boundaryResult = await inspectState(page, 'workspace')
  const mobileMediaActive = await page.evaluate(() => matchMedia('(max-width: 767.98px)').matches)
  if (mobileMediaActive) boundaryResult.issues.push('mobile media layer is active at 768px')
  if (boundaryResult.issues.length) failures.push({ ...boundaryResult, state: 'desktop-boundary' })

  failures.push(...await auditRoutes(page, authenticatedRoutes))

  if (failures.length) {
    console.error(failures.map(result => (
      `${result.viewportWidth}x${result.viewportHeight || '?'} ${result.state || result.path}: ${result.issues.join('; ')}`
    )).join('\n'))
  }
  assert.deepEqual(failures, [], 'Mobile layout issues were detected')
  const unexpectedBrowserErrors = browserErrors.filter(error => (
    !error.includes('/api/profile/locale') && !error.includes('/api/state')
  ))
  assert.deepEqual(unexpectedBrowserErrors, [], `Browser errors were detected:\n${unexpectedBrowserErrors.join('\n')}`)
  console.log(`Mutqin mobile responsiveness passed in ${browserName}: ${states.length} workspace states, ${publicRoutes.length + authenticatedRoutes.length} routes, navigation, RTL, and the 768px boundary across ${viewports.length} mobile viewports.`)
} finally {
  await browser.close()
}
