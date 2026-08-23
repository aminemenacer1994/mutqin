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
  for (const key of ['welcome', 'controls', 'setup', 'start', 'session', 'ai', 'results', 'plan', 'dashboard']) {
    assert.match(steps, new RegExp(`key:\\s*'${key}'`))
  }
  assert.match(steps, /data-tour="ai-modal"/)
  assert.match(steps, /data-tour="ai-results"/)
  assert.match(steps, /data-tour="rec-plan"/)
  assert.match(steps, /nav-link-dashboard/)
  assert.match(steps, /nav-dashboard/)
  assert.match(steps, /workspace-welcome/)
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
  assert.doesNotMatch(hole, /0 0 0 2px/)
  assert.doesNotMatch(hole, /workspace-tour-pulse/)
}

{
  assert.match(amdVue, /data-tour="ai-modal"/)
  assert.match(memorisationVue, /data-tour="ai-results"/)
  assert.match(memorisationVue, /data-tour="rec-plan"/)
  assert.match(memorisationVue, /data-tour="workspace-welcome"/)
  assert.match(memorisationVue, /data-tour="tour-dashboard"/)
  assert.match(memorisationVue, /'rec-start'/)
  assert.match(appBlade, /data-tour="nav-dashboard"/)
}

{
  const tour = en.memorisation.workspaceTour.steps
  assert.ok(tour.ai.title)
  assert.ok(tour.results.title)
  assert.ok(tour.plan.title)
  assert.ok(tour.dashboard.title)
  assert.match(tour.results.body, /Green|wrong|care/i)
}

{
  const auto = sliceMethod(memorisationJs, 'shouldAutoStartWorkspaceTour')
  assert.match(auto, /just_registered/)
  assert.match(auto, /isDemoWorkspaceAccount/)
  assert.match(auto, /hasDismissedWorkspaceTour/)
  assert.doesNotMatch(auto, /just_logged_in/)

  const schedule = sliceMethod(memorisationJs, 'scheduleWorkspaceTourStart')
  assert.match(schedule, /just_logged_in/)
  assert.match(schedule, /!this\.auth\?\.just_registered/)
  assert.doesNotMatch(schedule, /localStorage\.removeItem\(this\.getTesterGuideStorageKey/)

  const init = sliceMethod(memorisationJs, 'initWorkspaceTour')
  assert.doesNotMatch(init, /just_logged_in/)
  assert.doesNotMatch(init, /localStorage\.removeItem/)

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
  assert.match(measure, /isWorkspaceTourTargetVisible/)
  assert.match(measure, /allowScroll/)
  assert.match(measure, /behavior: 'auto'/)
  assert.doesNotMatch(measure, /behavior: 'smooth'/)

  const apply = sliceMethod(memorisationJs, 'applyWorkspaceTourStep')
  assert.doesNotMatch(apply, /step\.key === 'welcome' && !this\.showWelcomeBackModal/)

  const prepare = sliceMethod(memorisationJs, 'prepareWorkspaceTourStep')
  assert.match(prepare, /ensureWorkspaceTourAiModal/)
  assert.match(prepare, /ensureWorkspaceTourResultsPreview/)
  assert.match(prepare, /ensureWorkspaceTourPlanPreview/)
  assert.match(prepare, /workspaceTourDashboardOpen = true/)
  assert.doesNotMatch(prepare, /topCardMenuOpen = true/)

  const preview = sliceMethod(memorisationJs, 'applyWorkspaceTourPracticePreview')
  assert.match(preview, /buildWorkspaceTourPracticeConfig/)
  assert.match(sliceMethod(memorisationJs, 'buildWorkspaceTourPracticeConfig'), /rangeEnd: 3/)
  assert.match(sliceMethod(memorisationJs, 'buildWorkspaceTourPracticeConfig'), /ar\.alafasy/)
  assert.match(sliceMethod(memorisationJs, 'teardownWorkspaceTourPreview'), /restoreWorkspaceTourPracticePreview/)

  const complete = sliceMethod(memorisationJs, 'maybeCompleteAmdMemorisationTest')
  assert.match(complete, /workspaceTourActive/)

  const persist = sliceMethod(memorisationJs, 'persistUiState')
  assert.match(persist, /workspaceTourConfigSnapshot/)

  const advance = sliceMethod(memorisationJs, 'maybeAdvanceWorkspaceTourFromSession')
  assert.match(advance, /step\.key === 'ai'/)
  assert.doesNotMatch(advance, /findIndex\(\(step\) => step\.key === 'plan'\)/)
}
