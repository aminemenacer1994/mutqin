import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const amdVue = readFileSync(join(root, 'resources/js/components/AiMemorisationDetectionModal.vue'), 'utf8')
const appBlade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))
const ar = JSON.parse(readFileSync(join(root, 'resources/js/locales/ar.json'), 'utf8'))
const fr = JSON.parse(readFileSync(join(root, 'resources/js/locales/fr.json'), 'utf8'))

function sliceMethod(source, name) {
  const needle = `${name}(`
  let from = 0
  while (from < source.length) {
    const idx = source.indexOf(needle, from)
    if (idx < 0) break
    from = idx + needle.length
    const before = source.slice(Math.max(0, idx - 24), idx)
    if (before.includes('this.')) continue
    if (!/\n\s{2,6}$/.test(before) && !/async\s+$/.test(before)) continue

    let depth = 0
    let bodyBrace = -1
    for (let i = idx + needle.length - 1; i < source.length; i += 1) {
      const ch = source[i]
      if (ch === '(') depth += 1
      if (ch === ')') {
        depth -= 1
        if (depth === 0) {
          bodyBrace = source.indexOf('{', i)
          break
        }
      }
    }
    if (bodyBrace < 0) continue

    depth = 0
    for (let i = bodyBrace; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1
      if (source[i] === '}') {
        depth -= 1
        if (depth === 0) return source.slice(idx, i + 1)
      }
    }
  }
  assert.fail(`missing method ${name}`)
}

{
  const steps = sliceMethod(memorisationJs, 'workspaceTourSteps')
  for (const key of ['welcome', 'controls', 'setup', 'practice', 'saved', 'start', 'session', 'ai', 'results', 'weak', 'plan', 'dashboard']) {
    assert.match(steps, new RegExp(`key:\\s*'${key}'`))
  }
  assert.match(steps, /data-tour="ai-modal"/)
  assert.match(steps, /data-tour="ai-results"/)
  assert.match(steps, /post-session-section-1/)
  assert.match(steps, /scroll:\s*'start'/)
  assert.match(steps, /placement:\s*'dock-outside'/)
  assert.match(steps, /data-tour="weak-areas"/)
  assert.match(steps, /data-tour="rec-why"/)
  assert.match(steps, /data-tour="rec-plan"/)
  assert.match(steps, /data-tour="rec-plans"/)
  assert.match(steps, /workspace-welcome/)
  assert.match(steps, /placement:\s*'dock-bottom'/)
  assert.match(steps, /tour-dashboard/)
  assert.doesNotMatch(steps, /data-tour="rec-cta"/)
}

{
  const hole = memorisationCss.slice(
    memorisationCss.indexOf('.workspace-tour__hole {'),
    memorisationCss.indexOf('.workspace-tour__tooltip {'),
  )
  assert.match(hole, /border:\s*0/)
  assert.match(hole, /border-radius:\s*var\(--tour-hole-radius/)
  assert.match(hole, /pointer-events:\s*auto/)
  assert.doesNotMatch(hole, /0 0 0 2px/)
  assert.doesNotMatch(hole, /workspace-tour-pulse/)
  assert.match(memorisationCss, /\.workspace-tour \{[\s\S]*?pointer-events:\s*auto/)
  assert.match(memorisationCss, /\.workspace-tour__tooltip \{[\s\S]*?pointer-events:\s*none/)
  assert.match(memorisationCss, /\.workspace-tour__tooltip \{[\s\S]*?--tour-card:\s*#fffaf3/)
  assert.match(memorisationCss, /\.workspace-tour__tooltip \{[\s\S]*?background:\s*var\(--tour-card\)/)
  assert.doesNotMatch(
    memorisationCss.slice(
      memorisationCss.indexOf('.workspace-tour__tooltip {'),
      memorisationCss.indexOf('.workspace-tour__kicker {'),
    ),
    /color-mix\(in srgb, var\(--surface/,
  )
  assert.match(memorisationCss, /\.workspace-tour__btn--ghost \{[\s\S]*?background:\s*var\(--tour-card/)
  assert.doesNotMatch(
    memorisationCss.slice(
      memorisationCss.indexOf('.workspace-tour__btn--ghost {'),
      memorisationCss.indexOf('.workspace-tour__btn--primary {'),
    ),
    /background:\s*transparent/,
  )
  assert.doesNotMatch(memorisationVue, /workspace-tour__wait/)
  assert.match(memorisationJs, /dockWorkspaceTourTooltip\(/)
  assert.match(memorisationJs, /shouldDockWorkspaceTourTooltip\(/)
  assert.match(memorisationCss, /\.workspace-tour__tooltip\.is-dock-bottom/)
  assert.match(memorisationCss, /\.workspace-tour__btn \{[\s\S]*?pointer-events:\s*auto/)
  assert.match(memorisationCss, /\.workspace-tour__dashboard \{[\s\S]*?pointer-events:\s*none/)
  assert.match(memorisationJs, /guardWorkspaceTourPointer\(/)
  assert.match(memorisationJs, /closest\('\.workspace-tour__btn'\)/)
  assert.doesNotMatch(memorisationVue, /is-tour-clickable/)
  assert.match(memorisationCss, /@media \(max-width: 720px\)/)
  assert.match(memorisationCss, /safe-area-inset/)
  assert.match(memorisationCss, /#ff8f8f/)
}

{
  assert.match(amdVue, /data-tour="ai-modal"/)
  assert.match(memorisationVue, /data-testid="post-session-section-1"[\s\S]{0,180}data-tour="ai-results"/)
  assert.doesNotMatch(memorisationVue, /post-session-main-focus"[\s\S]{0,80}data-tour="ai-results"/)
  assert.match(memorisationVue, /data-tour="weak-areas"/)
  assert.match(memorisationVue, /data-tour="rec-why"/)
  assert.match(memorisationVue, /data-tour="rec-plan"/)
  assert.match(memorisationVue, /data-tour="rec-plans"/)
  assert.match(memorisationVue, /data-tour="practice-sheet"/)
  assert.match(memorisationVue, /data-tour="saved-sheet"/)
  assert.match(memorisationVue, /class="workspace-shell"[\s\S]{0,280}data-tour="workspace-welcome"/)
  assert.doesNotMatch(memorisationVue, /class="workspace"[^>]*data-tour="workspace-welcome"/)
  assert.doesNotMatch(memorisationVue, /workspace-shell-head"[^>]*data-tour="workspace-welcome"/)
  assert.match(memorisationVue, /data-tour="tour-dashboard"/)
  assert.match(memorisationVue, /data-tour="tour-dashboard-activity"/)
  assert.match(memorisationVue, /'rec-start'/)
  assert.match(appBlade, /data-tour="nav-dashboard"/)
}

{
  const tour = en.memorisation.workspaceTour.steps
  assert.ok(tour.ai.title)
  assert.ok(tour.results.title)
  assert.ok(tour.weak.title)
  assert.ok(tour.practice.title)
  assert.ok(tour.saved.title)
  assert.ok(tour.plan.title)
  assert.ok(tour.dashboard.title)
  assert.match(tour.results.body, /Green|wrong|care|Several/i)
  assert.match(tour.plan.body, /plans|weak ayahs|revise/i)
  for (const step of Object.values(tour)) {
    assert.doesNotMatch(step.body, /\b(tap|press|click|touch)\b/i)
    assert.equal(step.waitHint, '')
  }
  for (const locale of [ar, fr]) {
    for (const step of Object.values(locale.memorisation.workspaceTour.steps)) {
      assert.doesNotMatch(step.body, /اضغط|المس|Touchez|Appuyez|tapez/i)
      assert.equal(step.waitHint, '')
    }
  }
  assert.match(sliceMethod(memorisationJs, 'workspaceTourStepCopy'), /waitHint:\s*''/)
}

{
  const auto = sliceMethod(memorisationJs, 'shouldAutoStartWorkspaceTour')
  assert.match(auto, /just_registered/)
  assert.match(auto, /hasDismissedWorkspaceTour/)
  assert.match(auto, /hasCompletedOnboarding/)
  assert.match(auto, /isDemoWorkspaceAccount\(\)\) return true/)
  assert.match(auto, /just_logged_in && !this\.auth\?\.just_registered/)
  assert.match(auto, /isSignupIsolationActive/)

  const schedule = sliceMethod(memorisationJs, 'scheduleWorkspaceTourStart')
  assert.match(schedule, /shouldAutoStartWorkspaceTour\(\)/)
  assert.doesNotMatch(schedule, /just_logged_in && !this\.auth\?\.just_registered/)
  assert.doesNotMatch(schedule, /localStorage\.removeItem\(this\.getTesterGuideStorageKey/)

  const init = sliceMethod(memorisationJs, 'initWorkspaceTour')
  assert.doesNotMatch(init, /just_logged_in/)
  assert.doesNotMatch(init, /localStorage\.removeItem/)

  const firstRun = sliceMethod(memorisationJs, 'requiresFirstTimeOnboarding')
  assert.match(firstRun, /just_logged_in && !this\.auth\?\.just_registered/)
  assert.match(firstRun, /just_registered \|\| this\._signupIsolationFreshlyActivated/)
  assert.match(firstRun, /isDemoWorkspaceAccount/)
  assert.match(firstRun, /hasDismissedWorkspaceTour/)

  const run = (name, ctx) => {
    const fn = new Function(`return function ${sliceMethod(memorisationJs, name)}`)()
    return fn.call(ctx)
  }
  const existingLogin = {
    auth: { check: true, just_logged_in: true, just_registered: false },
    hasDismissedWorkspaceTour: () => false,
    hasCompletedOnboarding: () => false,
    _signupIsolationFreshlyActivated: false,
    isDemoWorkspaceAccount: () => false,
    isSignupIsolationActive: () => false,
  }
  const firstRunCtx = {
    ...existingLogin,
    isLoggedIn: true,
    onboardingManualLaunch: false,
    hasPostOnboardingPracticeEvidence: () => false,
    readWorkspaceStateValue: () => false,
  }
  // Regular existing login never auto-starts.
  assert.equal(run('shouldAutoStartWorkspaceTour', existingLogin), false)
  assert.equal(run('requiresFirstTimeOnboarding', firstRunCtx), false)
  // Demo testers: first time only, even when seeded completion/practice exists.
  assert.equal(run('shouldAutoStartWorkspaceTour', {
    ...existingLogin,
    isDemoWorkspaceAccount: () => true,
    hasCompletedOnboarding: () => true,
  }), true)
  assert.equal(run('requiresFirstTimeOnboarding', {
    ...firstRunCtx,
    isDemoWorkspaceAccount: () => true,
    hasCompletedOnboarding: () => true,
    hasPostOnboardingPracticeEvidence: () => true,
  }), true)
  // After Skip / Done they are existing — no second auto-show.
  assert.equal(run('shouldAutoStartWorkspaceTour', {
    ...existingLogin,
    isDemoWorkspaceAccount: () => true,
    hasDismissedWorkspaceTour: () => true,
  }), false)
  assert.equal(run('requiresFirstTimeOnboarding', {
    ...firstRunCtx,
    isDemoWorkspaceAccount: () => true,
    hasDismissedWorkspaceTour: () => true,
  }), false)
  // New signup: first time only.
  assert.equal(run('shouldAutoStartWorkspaceTour', {
    ...existingLogin,
    auth: { check: true, just_logged_in: false, just_registered: true },
  }), true)
  assert.equal(run('shouldAutoStartWorkspaceTour', {
    ...existingLogin,
    auth: { check: true, just_logged_in: true, just_registered: false },
    hasCompletedOnboarding: () => true,
  }), false)

  const reopen = sliceMethod(memorisationJs, 'openOnboardingFromTopMenu')
  assert.match(reopen, /startWorkspaceTour\(0\)/)
  assert.doesNotMatch(reopen, /openOnboardingModal\(true\)/)

  const welcome = sliceMethod(memorisationJs, 'maybeShowWelcomeBackModal')
  assert.match(welcome, /shouldSuppressWelcomeBackModal\(\)/)
  const existing = sliceMethod(memorisationJs, 'isExistingUserLogin')
  assert.match(existing, /shouldSuppressWelcomeBackModal\(\)/)
  const suppress = sliceMethod(memorisationJs, 'shouldSuppressWelcomeBackModal')
  assert.match(suppress, /just_registered/)
  assert.match(suppress, /shouldAutoStartWorkspaceTour\(\)/)
  assert.doesNotMatch(suppress, /isDemoWorkspaceAccount\(\)\) return true/)
  assert.match(sliceMethod(memorisationJs, 'getTesterGuideStorageKey'), /workspaceTourDismissed\.v3/)
}

{
  const measure = sliceMethod(memorisationJs, 'measureWorkspaceTourTarget')
  assert.match(measure, /findWorkspaceTourTarget/)
  assert.match(measure, /scrollWorkspaceTourTargetIntoView/)
  assert.match(measure, /clampWorkspaceTourHole/)
  assert.match(measure, /allowScroll/)
  assert.doesNotMatch(measure, /behavior: 'smooth'/)
  assert.match(sliceMethod(memorisationJs, 'scrollWorkspaceTourTargetIntoView'), /behavior: 'auto'/)
  assert.match(sliceMethod(memorisationJs, 'scrollWorkspaceTourTargetIntoView'), /scroll === 'start'/)
  assert.match(sliceMethod(memorisationJs, 'isWorkspaceTourTargetFramed'), /scroll === 'start'/)
  assert.match(sliceMethod(memorisationJs, 'clampWorkspaceTourHole'), /readWorkspaceTourSafeInset/)
  assert.match(sliceMethod(memorisationJs, 'clampWorkspaceTourHole'), /shouldCoverWorkspaceTourPlanCards/)
  assert.match(sliceMethod(memorisationJs, 'clampWorkspaceTourHole'), /shouldExpandWorkspaceTourHole/)
  assert.match(sliceMethod(memorisationJs, 'clampWorkspaceTourHole'), /expandHole \? 0/)
  assert.match(sliceMethod(memorisationJs, 'shouldCoverWorkspaceTourPlanCards'), /key\) === 'plan'/)
  assert.match(sliceMethod(memorisationJs, 'shouldCoverWorkspaceTourPlanCards'), /isWorkspaceTourMobileViewport/)
  assert.match(sliceMethod(memorisationJs, 'shouldCoverWorkspaceTourDashboardCards'), /key\) === 'dashboard'/)
  assert.match(sliceMethod(memorisationJs, 'shouldCoverWorkspaceTourDashboardCards'), /isWorkspaceTourMobileViewport/)
  assert.match(sliceMethod(memorisationJs, 'shouldExpandWorkspaceTourHole'), /shouldCoverWorkspaceTourDashboardCards/)
  assert.match(sliceMethod(memorisationJs, 'isWorkspaceTourMobileViewport'), /mutqin-pwa-mobile/)
  assert.match(sliceMethod(memorisationJs, 'isWorkspaceTourMobileViewport'), /mutqin-pwa-standalone/)
  assert.match(sliceMethod(memorisationJs, 'readWorkspaceTourTargetRect'), /post-session-simple__scope-card/)
  assert.match(sliceMethod(memorisationJs, 'readWorkspaceTourTargetRect'), /tour-dashboard-activity/)
  assert.match(sliceMethod(memorisationJs, 'measureWorkspaceTourTarget'), /readWorkspaceTourTargetRect/)
  assert.match(sliceMethod(memorisationJs, 'measureWorkspaceTourTarget'), /tour-dashboard-activity/)
  assert.match(memorisationVue, /workspace-tour-plan-active/)
  assert.match(memorisationVue, /workspace-tour-dashboard-active/)
  assert.match(memorisationVue, /data-tour="tour-dashboard-activity"/)
  assert.match(memorisationCss, /tour-dashboard-activity/)
  assert.match(memorisationCss, /data-tour-step="dashboard"[\s\S]*?max-height:\s*calc\(100dvh/)
  assert.match(memorisationCss, /html\.mutqin-pwa-mobile[\s\S]*?workspace-tour__dashboard[\s\S]*?height:\s*auto/)
  assert.match(memorisationVue, /data-tour-step/)

  const coverDash = new Function(`return function ${sliceMethod(memorisationJs, 'shouldCoverWorkspaceTourDashboardCards')}`)()
  assert.equal(coverDash.call({
    workspaceTourStep: { key: 'dashboard' },
    isWorkspaceTourMobileViewport: () => true,
  }), true)
  assert.equal(coverDash.call({
    workspaceTourStep: { key: 'dashboard' },
    isWorkspaceTourMobileViewport: () => false,
  }), false)
  assert.equal(coverDash.call({
    workspaceTourStep: { key: 'plan' },
    isWorkspaceTourMobileViewport: () => true,
  }), false)

  const readRect = new Function(`return function ${sliceMethod(memorisationJs, 'readWorkspaceTourTargetRect')}`)()
  const activityCard = {
    getBoundingClientRect: () => ({ top: 410, left: 16, right: 360, bottom: 528 }),
  }
  const dashEl = {
    getBoundingClientRect: () => ({ top: 72, left: 16, right: 360, bottom: 390 }),
    closest: () => ({
      querySelectorAll: () => [activityCard],
    }),
  }
  const united = readRect.call({
    shouldCoverWorkspaceTourPlanCards: () => false,
    shouldCoverWorkspaceTourDashboardCards: () => true,
  }, dashEl, { key: 'dashboard' })
  assert.equal(united.top, 72)
  assert.equal(united.bottom, 528)
  assert.ok(united.height > 450)
  assert.match(memorisationCss, /workspace-tour-plan-active[\s\S]*?max-height:\s*min\(96dvh/)
  assert.match(memorisationCss, /html\.mutqin-pwa-mobile[\s\S]*?workspace-tour-plan-active[\s\S]*?96dvh/)
  assert.match(memorisationVue, /post-session-simple--sample'[\s\S]{0,180}workspace-tour-plan-active/)

  const apply = sliceMethod(memorisationJs, 'applyWorkspaceTourStep')
  assert.doesNotMatch(apply, /step\.key === 'welcome' && !this\.showWelcomeBackModal/)
  assert.match(apply, /'weak', 'plan', 'dashboard'/)

  const prepare = sliceMethod(memorisationJs, 'prepareWorkspaceTourStep')
  assert.match(prepare, /ensureWorkspaceTourAiModal/)
  assert.match(prepare, /ensureWorkspaceTourResultsPreview/)
  assert.match(prepare, /ensureWorkspaceTourPlanPreview/)
  assert.match(prepare, /openWorkspaceTourControlsTab/)
  assert.match(prepare, /workspaceTourDashboardOpen = true/)
  assert.doesNotMatch(prepare, /topCardMenuOpen = true/)

  const preview = sliceMethod(memorisationJs, 'applyWorkspaceTourPracticePreview')
  assert.match(preview, /buildWorkspaceTourPracticeConfig/)
  assert.match(sliceMethod(memorisationJs, 'buildWorkspaceTourPracticeConfig'), /rangeEnd: 3/)
  assert.match(sliceMethod(memorisationJs, 'buildWorkspaceTourPracticeConfig'), /ar\.alafasy/)
  assert.match(sliceMethod(memorisationJs, 'teardownWorkspaceTourPreview'), /commitWorkspaceTourFocusedReview/)
  const commit = sliceMethod(memorisationJs, 'commitWorkspaceTourFocusedReview')
  assert.match(commit, /rangeEnd/)
  assert.match(commit, /reciterId/)
  assert.match(commit, /workspaceTourFreshStartPending = true/)
  assert.match(commit, /clearContinueSessionQuietly/)
  assert.match(commit, /clearActiveSessionSnapshot/)
  assert.match(sliceMethod(memorisationJs, 'sessionLifecycleInput'), /workspaceTourFreshStartPending/)
  assert.match(sliceMethod(memorisationJs, 'handleHeaderSessionAction'), /workspaceTourFreshStartPending/)
  assert.match(sliceMethod(memorisationJs, 'canResumePreviousSession'), /workspaceTourFreshStartPending/)
  assert.match(sliceMethod(memorisationJs, 'restoreContinueFromLastPosition'), /workspaceTourFreshStartPending/)
  assert.match(sliceMethod(memorisationJs, 'startSessionWithCountdown'), /workspaceTourFreshStartPending = false/)
  assert.match(sliceMethod(memorisationJs, 'startSessionWithCountdown'), /showCountdown/)
  assert.match(sliceMethod(memorisationJs, 'setActiveTab'), /workspaceTourActive/)
  assert.match(sliceMethod(memorisationJs, 'workspaceTourDashboardGreeting'), /dashboard\.greeting/)
  assert.match(memorisationVue, /workspace-tour__dashboard-preview/)
  assert.doesNotMatch(memorisationVue, /workspace-tour__dashboard-frame/)
  assert.match(sliceMethod(memorisationJs, 'shouldDockWorkspaceTourTooltip'), /key === 'dashboard'/)

  const complete = sliceMethod(memorisationJs, 'maybeCompleteAmdMemorisationTest')
  assert.match(complete, /workspaceTourActive/)

  const sample = sliceMethod(memorisationJs, 'buildWorkspaceTourSampleMistakes')
  assert.match(sample, /ayahNumber:\s*1/)
  assert.match(sample, /ayahNumber:\s*2/)
  assert.match(sample, /ayahNumber:\s*3/)
  assert.match(sample, /status:\s*'incorrect'/)
  assert.match(sample, /status:\s*'partial'/)
  assert.match(sample, /weakAyahs:\s*\[1,\s*2,\s*3\]/)

  const analysis = sliceMethod(memorisationJs, 'ensureWorkspaceTourSampleAnalysis')
  assert.match(analysis, /buildWorkspaceTourSampleMistakes/)
  assert.match(analysis, /practiceFocusWeakWords = weakWords/)
  assert.match(analysis, /aiReciteFinalPlan/)

  const samplePlan = sliceMethod(memorisationJs, 'ensureWorkspaceTourSamplePlan')
  assert.match(samplePlan, /REPEAT_CURRENT_RANGE/)
  assert.match(samplePlan, /PRACTICE_SCOPE\.WEAK_AREAS/)
  assert.match(samplePlan, /practice_weak_words/)
  assert.match(sliceMethod(memorisationJs, 'ensureWorkspaceTourResultsPreview'), /ensureWorkspaceTourSamplePlan/)
  assert.match(sliceMethod(memorisationJs, 'openPostSessionModal'), /workspaceTourActive \|\| this\.workspaceTourPreviewOwned/)
  assert.match(sliceMethod(memorisationJs, 'openPostSessionModal'), /showPostSessionConfetti = !\(/)
  assert.doesNotMatch(sliceMethod(memorisationJs, 'shouldDockWorkspaceTourTooltip'), /key === 'results'/)
  assert.match(sliceMethod(memorisationJs, 'shouldParkWorkspaceTourTooltipOutside'), /key === 'results'/)
  assert.match(memorisationJs, /parkWorkspaceTourTooltipOutside\(/)
  assert.match(memorisationCss, /\.workspace-tour__tooltip\.is-dock-top/)
  assert.match(memorisationVue, /showPostSessionConfetti && !workspaceTourActive/)
  assert.match(sliceMethod(memorisationJs, 'loadPostSessionRecommendation'), /workspaceTourActive \|\| this\.workspaceTourPreviewOwned/)

  const persist = sliceMethod(memorisationJs, 'persistUiState')
  assert.match(persist, /workspaceTourConfigSnapshot/)

  const advance = sliceMethod(memorisationJs, 'maybeAdvanceWorkspaceTourFromSession')
  assert.match(advance, /step\.key === 'ai'/)
  assert.doesNotMatch(advance, /findIndex\(\(step\) => step\.key === 'plan'\)/)
}
