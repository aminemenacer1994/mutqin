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

    // Skip parameter list (may contain `{ ... }` defaults) to the method body brace.
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

// 1. Brand-new: finish lands in first session (Fatihah 1–3) and auto-starts
{
  const first = buildFirstOnboardingSessionConfig()
  assert.equal(first.chapterId, 1)
  assert.equal(first.rangeStart, 1)
  assert.equal(first.rangeEnd, 3)
  assert.equal(buildDefaultWorkspaceSessionConfig().rangeEnd, 7)

  const finish = sliceMethod(memorisationJs, 'completeOnboardingIntoFirstSession')
  assert.match(finish, /markOnboardingCompleted\(\)/)
  assert.match(finish, /applyFirstOnboardingSessionConfig/)
  assert.match(finish, /startSessionWithCountdown\(\{\s*skipPrime:\s*true\s*\}\)/)
  assert.match(
    sliceMethod(memorisationJs, 'completeOnboardingOpenSetup'),
    /completeOnboardingIntoFirstSession/,
  )
}

// 2. Incomplete: step + prefs persist; Continue restores via openOnboardingModal
{
  assert.match(memorisationJs, /persistOnboardingProgress\s*\(/)
  assert.match(memorisationJs, /readOnboardingStepIndex\s*\(/)
  assert.match(memorisationJs, /onboardingPreferences/)
  const open = sliceMethod(memorisationJs, 'openOnboardingModal')
  assert.match(open, /readOnboardingStepIndex\(\)/)
  assert.match(open, /applyPersistedOnboardingPreferences\(\)/)
  const header = sliceMethod(memorisationJs, 'handleHeaderSessionAction')
  assert.match(header, /openOnboardingModal\(false\)/)
  assert.doesNotMatch(
    header,
    /START_ONBOARDING[\s\S]*this\.showPostLoginOnboarding = true/,
  )
}

// 3. Refresh mid-tour: isolation reset only on fresh activation
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

// 4. Completed: clears isolation + pending and force-pushes
{
  const mark = sliceMethod(memorisationJs, 'markOnboardingCompleted')
  assert.match(mark, /clearSignupIsolation\(\)/)
  assert.match(mark, /deleteWorkspaceStateValue\('onboardingPending'\)/)
  assert.match(mark, /pushLearningState\(true\)/)
  assert.match(mark, /onboardingStepIndex/)
}

// 5. Returning user path intact
{
  assert.match(memorisationJs, /just_logged_in && !this\.auth\?\.just_registered/)
  assert.match(memorisationJs, /isExistingUserLogin\(\)/)
  assert.match(memorisationJs, /maybeShowWelcomeBackModal/)
}

// 6. Skip completes + starts; Close dismisses without completing; no auto-open when dismissed
{
  assert.match(memorisationVue, /@click="skipOnboardingToFirstSession"/)
  assert.match(memorisationVue, /modal-close-btn[\s\S]*@click="dismissOnboardingTour"/)
  assert.match(
    sliceMethod(memorisationJs, 'skipOnboardingToFirstSession'),
    /completeOnboardingIntoFirstSession/,
  )
  const dismiss = sliceMethod(memorisationJs, 'dismissOnboardingTour')
  assert.match(dismiss, /onboardingDismissed/)
  assert.doesNotMatch(dismiss, /markOnboardingCompleted\(\)/)
  assert.match(
    sliceMethod(memorisationJs, 'shouldAutoOpenOnboarding'),
    /hasDismissedFirstTimeOnboarding/,
  )
  assert.match(
    sliceMethod(memorisationJs, 'applyFirstOnboardingSessionConfig'),
    /focusModeEnabled/,
  )
}

// 7. Logged-in recommendation: recoverable empty/error — no inventing plans
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
