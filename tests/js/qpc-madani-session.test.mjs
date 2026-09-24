import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isQpcMadaniMushafView,
  isReadingViewMode,
  READING_VIEW_MODES,
} from '../../resources/js/scripts/mushaf/readingViewModes.js'
import { resolveMadaniPage } from '../../resources/js/scripts/mushaf/qpcMadaniVersePage.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const sessionDefaults = readFileSync(join(root, 'resources/js/scripts/session/sessionDefaults.js'), 'utf8')
const index = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/verse-pages.json'), 'utf8'))

assert.ok(READING_VIEW_MODES.includes('madani_mushaf'))
assert.ok(isReadingViewMode('madani_mushaf'))
assert.ok(isQpcMadaniMushafView('madani_mushaf'))

assert.equal(resolveMadaniPage(2, 30, index), 6)
assert.equal(resolveMadaniPage(2, 37, index), 6)
assert.notEqual(resolveMadaniPage(2, 29, index), resolveMadaniPage(2, 30, index))

assert.match(sessionDefaults, /readingViewMode: 'mushaf'/)
assert.match(memorisationJs, /readingViewMode: this\.clampReadingViewMode\(this\.readingViewMode\)/)
assert.match(memorisationJs, /readingViewMode: this\.readingViewMode/)
assert.match(memorisationJs, /hydrateSessionFromPayload[\s\S]{0,900}payload\.readingViewMode/)
assert.match(memorisationJs, /ensureReadingLayoutReadyForSession/)
assert.match(memorisationJs, /startSession[\s\S]{0,4200}ensureReadingLayoutReadyForSession/)
assert.match(memorisationJs, /softResumePausedSession[\s\S]{0,500}ensureReadingLayoutReadyForSession/)
assert.match(
  memorisationJs,
  /restoreWorkspaceToContinuePayload\(payload = null\)[\s\S]{0,2500}ensureReadingLayoutReadyForSession/,
)
assert.match(memorisationJs, /setReadingViewMode[\s\S]{0,2200}madani_mushaf/)
assert.doesNotMatch(memorisationJs, /setReadingViewMode[\s\S]{0,1800}startSession|madaniSessionEngine|madaniSessionState/)
assert.match(memorisationVue, /setReadingViewMode\('madani_mushaf'\)/)
assert.match(memorisationVue, /:range-start-ayah="''"/)
assert.match(memorisationVue, /:range-end-ayah="''"/)
assert.match(memorisationVue, /:active-ayah="qpcMadaniSelectionActiveAyah"/)
assert.match(memorisationJs, /qpcMadaniSessionStartAyah\(\)[\s\S]{0,220}rangeStart/)
assert.match(memorisationJs, /qpcMadaniCurrentPage\(\)[\s\S]{0,520}resolveQpcMadaniPageForVerseKey/)

console.log('qpc-madani-session.test.mjs: ok')
