import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')

assert.match(memorisationJs, /sessionMadaniLineWords/, 'template filters words via sessionMadaniLineWords')
assert.match(memorisationJs, /syncSessionScrubAttrsToDocument/, 'session scrub attrs synced to documentElement')
assert.match(memorisationJs, /getMadaniChapterRangeVerses/, 'mushaf session pages load chapter-range verses only')
assert.match(
  memorisationVue,
  /sessionMadaniLineWords\(line\)/,
  'mushaf template only iterates session words'
)
assert.match(memorisationJs, /filterVersesToSession/, 'page verses filtered before layout build')
assert.match(memorisationJs, /wantSessionOnly/, 'mushaf mode bakes session-only layouts')
assert.match(
  memorisationJs,
  /wantSessionOnly = this\.readingViewMode === 'mushaf'/,
  'only classic mushaf uses session-only page builds'
)
assert.match(
  memorisationJs,
  /readingViewMode: 'mushaf'/,
  'mushaf is the permanent default layout'
)
assert.match(
  memorisationJs,
  /this\.readingViewMode = this\.clampReadingViewMode\(state\.readingViewMode \|\| 'mushaf'\)/,
  'loadUiState restores persisted reading layout'
)
assert.doesNotMatch(memorisationJs, /showOriginalMadaniViewToggle/, 'Printed scan mode removed')
assert.doesNotMatch(memorisationJs, /showMadaniMushafViewToggle/, 'legacy Madani toggle removed')
assert.doesNotMatch(memorisationVue, /MadaniMushafReader|OriginalMadaniMushaf/, 'legacy Madani reader components removed')
assert.match(
  memorisationVue,
  /readingViewMode === 'madani_mushaf'/,
  'QPC Madani Mushaf layout is available in the reader'
)
assert.match(
  memorisationVue,
  /hide-dev-nav/,
  'embedded Madani spread hides standalone dev navigation'
)
assert.match(
  memorisationVue,
  /:active-ayah="qpcMadaniActiveAyah"/,
  'Madani renderer receives canonical activeAyah'
)
assert.doesNotMatch(
  memorisationJs,
  /madaniCurrentAyah|madaniCurrentSurah|madaniSession/,
  'Madani does not duplicate Quran/session state'
)
assert.doesNotMatch(
  readFileSync(join(root, 'resources/js/components/madani/MadaniSpread.vue'), 'utf8'),
  /window\.location\.href = this\.pageHref/,
  'Madani navigation stays client-side without full document reload'
)
assert.match(
  memorisationJs,
  /Only render session-filtered lines from mushafPages/,
  'currentMadaniLines never reads raw full-page layout'
)
assert.match(
  memorisationVue,
  /mushafSessionSignature/,
  'mushaf page remounts when session range changes'
)
assert.match(
  memorisationVue,
  /workspace-shell-reading-toggles/,
  'Stacked/Mushaf switcher remains in session header'
)
assert.doesNotMatch(
  memorisationVue,
  /mushaf-shell__pager/,
  'full-mushaf page pager removed from mushaf toolbar'
)

assert.match(
  memorisationVue,
  /v-for="\(mushafPage, mushafPageIdx\) in mushafPages"/,
  'mushaf renders the full session page stack, not a single page'
)
assert.match(
  memorisationVue,
  /mushaf-session-stack/,
  'mushaf session pages share one scrollable stack'
)
assert.match(
  memorisationJs,
  /verseKeys: Array\.isArray\(layout\?\.verseKeys\)/,
  'mushaf page verseKeys stay page-local so sync does not stick on page 0'
)
assert.match(
  memorisationJs,
  /Eager-load every session page/,
  'all session Madani pages load so the full range paints'
)
assert.match(memorisationJs, /verseBelongsToMadaniPage/, 'cross-page ayah words stay on the correct sheet')
assert.match(
  memorisationJs,
  /cacheCoversSession = cached\.verses\.length >= expectedCount/,
  'incomplete verse caches are rejected so stacked shows the full session range'
)

console.log('mushaf-session-only.test.mjs: ok')
