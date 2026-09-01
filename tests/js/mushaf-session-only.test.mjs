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
assert.match(memorisationJs, /showOriginalMadaniViewToggle:\s*false/, 'Madani Mushaf switch hidden')
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
assert.match(
  memorisationVue,
  /v-if="showOriginalMadaniViewToggle"/,
  'Madani Mushaf switch gated behind flag'
)
assert.doesNotMatch(
  memorisationVue,
  /mushaf-shell__pager/,
  'full-mushaf page pager removed from mushaf toolbar'
)

assert.match(
  memorisationCss,
  /\.main\.mushaf-mode-active \.madani-word--out[\s\S]*?display:\s*none\s*!important/,
  'out-of-session mushaf words are hidden, not dimmed'
)

console.log('mushaf-session-only.test.mjs: ok')
