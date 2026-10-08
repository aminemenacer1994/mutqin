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
  /Never force-reset them here/,
  'page-load defaults must not wipe per-user tajweed',
)
assert.doesNotMatch(
  memorisationJs,
  /applyMemorisationPageLoadDefaults\(\) \{\s*this\.tajweedEnabled = DEFAULT_TAJWEED_ENABLED/,
  'must not assign DEFAULT_TAJWEED_ENABLED on every page load',
)
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
