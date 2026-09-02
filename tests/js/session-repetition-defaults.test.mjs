import assert from 'node:assert/strict'
import {
  DEFAULT_SESSION_REPETITIONS,
  DEFAULT_TAJWEED_ENABLED,
  buildDefaultWorkspaceSessionConfig,
  buildFirstOnboardingSessionConfig,
  freshSessionRepetitionDefaults,
  resolveSessionRepetitions,
} from '../../resources/js/scripts/session/sessionDefaults.js'
import {
  buildActivePracticeSetup,
  buildAppliedPracticeSetupSnapshot,
  collectPracticeSetupInputFromSession,
} from '../../resources/js/scripts/session/activePracticeSetup.js'
import { buildRecommendedSessionTemplate } from '../../resources/js/scripts/recommendations/postSessionChoice.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

assert.equal(DEFAULT_SESSION_REPETITIONS, 1, 'new sessions default to 1x')
assert.equal(DEFAULT_TAJWEED_ENABLED, false, 'tajweed is off until the learner turns it on')

// Fresh workspace / reset config
{
  const defaults = buildDefaultWorkspaceSessionConfig()
  assert.equal(defaults.repetitionsPerStep, 1)
  assert.equal(defaults.selectedLoopCount, 1)
  assert.equal(defaults.tajweedEnabled, false)
}

// First onboarding session uses a short Fatihah window
{
  const first = buildFirstOnboardingSessionConfig({ focusModeEnabled: true })
  assert.equal(first.chapterId, 1)
  assert.equal(first.rangeStart, 1)
  assert.equal(first.rangeEnd, 3)
  assert.equal(first.focusModeEnabled, true)
  assert.equal(first.repetitionsPerStep, 2)
  assert.equal(first.reciterId, 'ar.alafasy')
}

// Fresh-session helper always returns 1x (clears sticky 2x+ from prior plans)
{
  const fresh = freshSessionRepetitionDefaults()
  assert.equal(fresh.repetitionsPerStep, 1)
  assert.equal(fresh.selectedLoopCount, 1)
  assert.notEqual(fresh.repetitionsPerStep, 2)
}

// Missing values resolve to 1x; explicit / saved values are retained
{
  assert.equal(resolveSessionRepetitions(), 1)
  assert.equal(resolveSessionRepetitions(null, undefined, 0, ''), 1)
  assert.equal(resolveSessionRepetitions(4), 4)
  assert.equal(resolveSessionRepetitions(null, 5), 5)
  assert.equal(resolveSessionRepetitions(2, 7), 2, 'first positive candidate wins (resumed / saved)')
}

// Legacy memorisation modes wire the shared 1x default
{
  const root = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(join(root, '../../resources/js/scripts/engine/session_state.js'), 'utf8')
  assert.match(source, /DEFAULT_SESSION_REPETITIONS/)
  assert.doesNotMatch(source, /repetitionCount:\s*[2-9]/)
}

const t = (key, params = {}) => {
  if (key.endsWith('repetitionsValue')) return `${params.count} repetitions`
  return key
}

// New session practice setup with no repetitions → 1x (no flash of a higher default)
{
  const setup = buildActivePracticeSetup({ repetitions: undefined }, t)
  const reps = setup.items.find((item) => item.id === 'repetitions')
  assert.equal(reps.shortValue, '1×')
  assert.equal(buildAppliedPracticeSetupSnapshot({}).repetitions, 1)
}

// Resumed session keeps saved repetitions
{
  const input = collectPracticeSetupInputFromSession({
    repetitionsPerStep: 4,
    speed: 1,
    sessionConfig: { repetitionsPerStep: 4 },
  })
  assert.equal(input.repetitions, 4)
  assert.equal(buildAppliedPracticeSetupSnapshot(input).repetitions, 4)
}

// Recommendation / template may set an explicit different value
{
  const template = buildRecommendedSessionTemplate({
    chapterId: 1,
    rangeStart: 1,
    rangeEnd: 3,
    repetitions: 5,
  })
  assert.equal(template.repetitions, 5)

  const withoutReps = buildRecommendedSessionTemplate({
    chapterId: 1,
    rangeStart: 1,
    rangeEnd: 3,
  })
  assert.equal(withoutReps.repetitions, 1)
}

// Memorisation view initial state + reset defaults use 1x (prevents UI flash)
{
  const root = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(join(root, '../../resources/js/views/Memorisation.js'), 'utf8')
  assert.match(source, /repetitionsPerStep:\s*DEFAULT_SESSION_REPETITIONS/)
  assert.match(source, /selectedLoopCount:\s*DEFAULT_SESSION_REPETITIONS/)
  assert.match(source, /from '\.\.\/scripts\/session\/sessionDefaults'/)
  assert.match(source, /freshSessionRepetitionDefaults/)
  assert.match(source, /resetRepetitionsForFreshSession\s*\(/)
  // Initial data() must not hardcode a higher flash value before hydration
  assert.match(
    source,
    /\/\/ Feature 1: Repetitions[^\n]*\n\s*repetitionsPerStep: DEFAULT_SESSION_REPETITIONS,\n\s*selectedLoopCount: DEFAULT_SESSION_REPETITIONS,/,
  )

  // Fresh-session entry points must clear sticky prior repetitions (e.g. recommendation 2x)
  const freshEntryPoints = [
    'welcomeBackStartNewSession',
    'openNewSessionSetup',
    'openPostSessionNewSessionOffcanvas',
    'createCustomSessionFromChoice',
    'openSessionExitNewSessionOffcanvas',
    'performResetControls',
    'applyOnboardingGoalPreset',
  ]
  for (const name of freshEntryPoints) {
    const methodRe = new RegExp(`${name}\\s*\\([^)]*\\)\\s*\\{`)
    const match = methodRe.exec(source)
    assert.ok(match, `${name} method must exist`)
    const slice = source.slice(match.index, match.index + 900)
    assert.match(
      slice,
      /resetRepetitionsForFreshSession\s*\(/,
      `${name} must reset repetitions to 1x for a new normal session`,
    )
  }

  // Resume / recommendation apply paths must NOT force a fresh 1x overwrite helper
  const applySessionConfigIdx = source.indexOf('applySessionConfig(config)')
  assert.ok(applySessionConfigIdx >= 0, 'applySessionConfig(config) must exist')
  assert.doesNotMatch(
    source.slice(applySessionConfigIdx, applySessionConfigIdx + 1600),
    /resetRepetitionsForFreshSession/,
    'applySessionConfig must preserve resumed / recommended repetitions',
  )
}

// Repetitions range is continuous 1–10 so thumb position matches the pill (not discrete index snap).
{
  const root = dirname(fileURLToPath(import.meta.url))
  const vue = readFileSync(join(root, '../../resources/js/views/Memorisation.vue'), 'utf8')
  const js = readFileSync(join(root, '../../resources/js/views/Memorisation.js'), 'utf8')
  const css = readFileSync(join(root, '../../resources/js/views/Memorisation.css'), 'utf8')
  assert.match(vue, /:value="sliderRepetitionValue"/)
  assert.match(vue, /@input="setRepetitionsFromSlider\(Number\(\$event\.target\.value\)\)"/)
  assert.match(vue, /min="1" max="10" step="1"/)
  assert.doesNotMatch(vue, /setRepetitionsFromSliderIndex/)
  assert.match(
    js,
    /sessionRepetitionSliderStyle\(\)\s*\{[\s\S]*?sliderRepetitionValue - 1/,
    'fill progress must track the 1–10 value, not discrete marker index',
  )
  assert.match(
    js,
    /setRepetitionsFromSlider\(value\)\s*\{[\s\S]*?selectedLoopCount\s*=\s*next/,
    'offcanvas slider must keep selectedLoopCount in sync with repetitionsPerStep',
  )
  assert.match(
    css,
    /\.tools-body \.field-repetitions-clean \.range-control[\s\S]*?direction:\s*ltr/,
    'offcanvas repetitions slider must stay LTR so thumb/markers match in Arabic RTL',
  )
}

console.log('session-repetition-defaults: ok')
