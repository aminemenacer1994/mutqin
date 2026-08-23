import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  buildDefaultWorkspaceSessionConfig,
  buildFirstOnboardingSessionConfig,
} from '../../resources/js/scripts/session/sessionDefaults.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

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
  const first = buildFirstOnboardingSessionConfig()
  assert.equal(first.chapterId, 1)
  assert.equal(first.rangeStart, 1)
  assert.equal(first.rangeEnd, 3)
  assert.equal(first.repetitionsPerStep, 2)
  assert.equal(first.reciterId, 'ar.alafasy')
  assert.equal(buildDefaultWorkspaceSessionConfig().rangeEnd, 7)
}

{
  assert.doesNotMatch(memorisationVue, /post-onboarding-modal/)
  assert.doesNotMatch(memorisationVue, /showPostLoginOnboarding/)
  assert.doesNotMatch(memorisationVue, /onboarding-step-rail--four/)
  assert.match(memorisationVue, /data-workspace-tour/)
}

{
  const open = sliceMethod(memorisationJs, 'openOnboardingModal')
  assert.match(open, /startWorkspaceTour\(0\)/)
  assert.doesNotMatch(open, /showPostLoginOnboarding = true/)

  const header = sliceMethod(memorisationJs, 'handleHeaderSessionAction')
  assert.match(header, /startWorkspaceTour\(0\)/)
  assert.doesNotMatch(header, /openOnboardingModal\(false\)/)

  const active = sliceMethod(memorisationJs, 'isOnboardingExperienceActive')
  assert.match(active, /return false/)

  assert.match(
    sliceMethod(memorisationJs, 'sessionLifecycleInput'),
    /requiresOnboarding:\s*false/,
  )
}

{
  assert.match(memorisationJs, /_signupIsolationFreshlyActivated/)
  assert.match(memorisationJs, /freshIsolation/)
  assert.match(
    memorisationJs,
    /if \(signupIsolated && freshIsolation\)\s*\{\s*this\.resetIsolatedSignupWorkspace\(\)/,
  )
  assert.match(sliceMethod(memorisationJs, 'activateSignupIsolation'), /return !already/)
  const bind = sliceMethod(memorisationJs, 'bindMutqinStateForCurrentOwner')
  assert.match(bind, /signupIsolated && freshIsolation/)
  assert.match(bind, /allowGuestFallback:\s*false/)
}

{
  const mark = sliceMethod(memorisationJs, 'markOnboardingCompleted')
  assert.match(mark, /clearSignupIsolation\(\)/)
  assert.match(mark, /deleteWorkspaceStateValue\('onboardingPending'\)/)
  assert.match(mark, /pushLearningState\(true\)/)
  assert.match(mark, /onboardingStepIndex/)
}

{
  assert.match(memorisationJs, /just_logged_in && !this\.auth\?\.just_registered/)
  assert.match(memorisationJs, /isExistingUserLogin\(\)/)
  assert.match(memorisationJs, /maybeShowWelcomeBackModal/)
  assert.match(memorisationJs, /preferWelcomeBackOnLogin/)
  const welcomeGate = sliceMethod(memorisationJs, 'maybeShowWelcomeBackModal')
  assert.doesNotMatch(welcomeGate, /\|\|\s*this\.sessionPaused/)
  assert.match(welcomeGate, /shouldSuppressWelcomeBackModal\(\)/)
  assert.match(sliceMethod(memorisationJs, 'isExistingUserLogin'), /shouldSuppressWelcomeBackModal\(\)/)
  assert.match(sliceMethod(memorisationJs, 'shouldSuppressWelcomeBackModal'), /shouldAutoStartWorkspaceTour/)
}

{
  const finish = sliceMethod(memorisationJs, 'finishWorkspaceTour')
  assert.match(finish, /markOnboardingCompleted\(\)/)
  assert.doesNotMatch(
    sliceMethod(memorisationJs, 'scheduleWorkspaceTourStart'),
    /openOnboardingModal\(\)/,
  )
}

{
  const load = sliceMethod(memorisationJs, 'loadPostSessionRecommendation')
  assert.match(load, /useBackendRecommendations/)
  assert.match(load, /applyResult\(null, 'error'\)/)
  assert.match(load, /'empty'/)
  const backendBranch = load.slice(load.indexOf('useBackendRecommendations'))
  const guestFallbackIdx = backendBranch.indexOf('applyResult(snapshotFallback()')
  const firstEmptyOrError = Math.min(
    ...['applyResult(null, \'error\')', 'applyResult(recommendation || null, \'empty\')', "applyResult(recommendation, 'empty')"]
      .map((needle) => {
        const idx = backendBranch.indexOf(needle)
        return idx < 0 ? Number.POSITIVE_INFINITY : idx
      }),
  )
  assert.ok(Number.isFinite(firstEmptyOrError), 'backend branch must surface empty/error')
  if (guestFallbackIdx >= 0) {
    assert.ok(
      guestFallbackIdx > firstEmptyOrError,
      'authenticated empty/error must come before any guest snapshotFallback apply',
    )
  }
}

console.log('onboarding-journey passed')
