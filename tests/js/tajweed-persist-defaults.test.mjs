import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_TAJWEED_ENABLED,
  TAJWEED_DEFAULT_REVISION,
  resolveStoredTajweedEnabled,
  buildDefaultWorkspaceSessionConfig,
} from '../../resources/js/scripts/session/sessionDefaults.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

assert.equal(DEFAULT_TAJWEED_ENABLED, false)
assert.equal(buildDefaultWorkspaceSessionConfig().readingViewMode, 'madani_mushaf')
assert.equal(buildDefaultWorkspaceSessionConfig().tajweedEnabled, false)

assert.equal(resolveStoredTajweedEnabled(true, TAJWEED_DEFAULT_REVISION), true)
assert.equal(resolveStoredTajweedEnabled(false, TAJWEED_DEFAULT_REVISION), false)
assert.equal(resolveStoredTajweedEnabled(true, 0), false, 'pre-revision saves adopt the off default once')

assert.match(
  memorisationJs,
  /applyMemorisationPageLoadDefaults\(\) \{\s*\/\/ Product defaults on every visit: mushaf layout \+ tajweed off\./,
  'page load defaults document mushaf + tajweed-off',
)
assert.match(
  memorisationJs,
  /if \(this\.tajweedEnabled !== DEFAULT_TAJWEED_ENABLED\) \{\s*this\.tajweedEnabled = DEFAULT_TAJWEED_ENABLED/,
  'page load must force tajweed off',
)
assert.match(
  memorisationJs,
  /clampReadingViewMode\('madani_mushaf'\)/,
  'page load must force mushaf layout',
)
assert.match(
  memorisationJs,
  /const markCompleteLocally = \(\) => \{[\s\S]*?this\.openPostSessionModal\(endedSnapshot, \{ previousStreak \}\)/,
  'natural completion always opens the success modal locally',
)
assert.match(
  memorisationJs,
  /handleSessionComplete\(\) \{[\s\S]*?markCompleteLocally\(\)[\s\S]*?finaliseCompletedSessionOnBackend/,
  'success modal must open before production endSession',
)
assert.doesNotMatch(
  memorisationJs,
  /handleSessionComplete\(\) \{[\s\S]*?if \(!endResult\) \{[\s\S]*?toasts\.sessionEndFailed[\s\S]*?return null/,
  'natural completion must not trap the learner on Unable to end session',
)
{
  const openModal = memorisationJs.match(
    /openPostSessionModal\(snapshot = null, options = \{\}\) \{[\s\S]*?\n    clearPostSessionConfettiTimer\(\)/,
  )?.[0] || ''
  assert.doesNotMatch(
    openModal,
    /preloadAiMemorisationDetectionModal|loadAdaptiveAssessmentBundle/,
    'opening the success modal must not preload chunks that can reload production',
  )
}
assert.match(
  memorisationJs,
  /typeof uiState\?\.tajweedEnabled === 'boolean'/,
  'central session restore must prefer scoped uiState tajweed',
)
assert.match(
  memorisationJs,
  /addEventListener\('pointerdown',\s*this\.handleClickOutside,\s*true\)/,
  'dropdown outside-close must use capture pointerdown',
)

assert.match(
  memorisationVue,
  /<\/section>\s*<div\s+v-if="showSessionProgressRail"/,
  'progress rail must sit below the top dashboard shell',
)
assert.doesNotMatch(
  memorisationVue,
  /<div class="workspace">\s*<div\s+v-if="showSessionProgressRail"/,
  'progress rail must not sit above the top dashboard',
)
assert.match(memorisationVue, /'dark-mode': theme === 'dark'/)
assert.match(
  memorisationVue,
  /workspace-shell-surah-sep/,
  'top dashboard must separate Latin and Arabic surah names',
)
assert.match(
  memorisationJs,
  /document\.documentElement\.getAttribute\('data-theme'\) \|\| theme/,
  'workspace theme must follow the live html colour mode',
)
assert.match(
  memorisationJs,
  /resetIsolatedSignupWorkspace\(\)[\s\S]*?tajweedEnabled = DEFAULT_TAJWEED_ENABLED[\s\S]*?setGlobalTheme\(DEFAULT_THEME/,
  'new signups force sepia + tajweed off',
)

const blade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')
assert.match(
  blade,
  /navbar-inline-tools[\s\S]*?global-lang-switcher[\s\S]*?global-theme-switcher[\s\S]*?app-auth-links--bar/,
  'lang + theme must sit left of login/register in the navbar',
)

console.log('tajweed-persist-defaults.test.mjs: ok')
