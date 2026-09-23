import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ayahKeyFromWord,
  buildMadaniSelection,
  compareAyahKeys,
  isAyahInCanonicalRange,
  madaniWordVisualClass,
  resolveMadaniAyahVisualState,
} from '../../resources/js/scripts/mushaf/qpcMadaniSelection.js'
import { resolveMadaniPage } from '../../resources/js/scripts/mushaf/qpcMadaniVersePage.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const index = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/verse-pages.json'), 'utf8'))

assert.equal(ayahKeyFromWord({ surah: '2', ayah: '30', location: '2:30:5' }), '2:30')
assert.equal(ayahKeyFromWord({ location: '2:34:1' }), '2:34')
assert.ok(compareAyahKeys('2:30', '2:34') < 0)
assert.ok(compareAyahKeys('2:34', '3:1') < 0)

const samePage = buildMadaniSelection({
  activeAyah: '2:32',
  rangeStartAyah: '2:30',
  rangeEndAyah: '2:34',
  sessionStartAyah: '2:30',
  sessionEndAyah: '2:34',
})
assert.equal(samePage.activeAyah, '2:32')
assert.equal(samePage.rangeStartAyah, '2:30')
assert.equal(samePage.rangeEndAyah, '2:34')
assert.equal(resolveMadaniAyahVisualState('2:32', samePage).active, true)
assert.equal(resolveMadaniAyahVisualState('2:30', samePage).rangeRole, 'start')
assert.equal(resolveMadaniAyahVisualState('2:32', samePage).rangeRole, 'middle')
assert.equal(resolveMadaniAyahVisualState('2:34', samePage).rangeRole, 'end')
assert.equal(resolveMadaniAyahVisualState('2:35', samePage).inRange, false)
assert.equal(madaniWordVisualClass(resolveMadaniAyahVisualState('2:32', samePage))['is-ayah-active'], true)

const single = buildMadaniSelection({
  activeAyah: '2:30',
  rangeStartAyah: '2:30',
  rangeEndAyah: '2:30',
})
assert.equal(resolveMadaniAyahVisualState('2:30', single).rangeRole, 'single')
assert.equal(resolveMadaniAyahVisualState('2:30', single).active, true)

assert.equal(resolveMadaniPage(2, 29, index), 5)
assert.equal(resolveMadaniPage(2, 30, index), 6)
const crossPage = buildMadaniSelection({
  activeAyah: '2:29',
  rangeStartAyah: '2:29',
  rangeEndAyah: '2:34',
})
assert.equal(isAyahInCanonicalRange('2:29', crossPage.rangeStartAyah, crossPage.rangeEndAyah), true)
assert.equal(isAyahInCanonicalRange('2:34', crossPage.rangeStartAyah, crossPage.rangeEndAyah), true)
assert.notEqual(resolveMadaniPage(2, 29, index), resolveMadaniPage(2, 34, index))

const reversed = buildMadaniSelection({
  activeAyah: '2:34',
  rangeStartAyah: '2:34',
  rangeEndAyah: '2:30',
})
assert.equal(reversed.rangeStartAyah, '2:30')
assert.equal(reversed.rangeEndAyah, '2:34')

const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')

assert.match(memorisationJs, /onQpcMadaniWordSelect[\s\S]{0,320}onMushafAyahClick/)
assert.match(memorisationVue, /:range-start-ayah="qpcMadaniSessionStartAyah"/)
assert.match(memorisationVue, /:active-ayah="qpcMadaniActiveAyah"/)
assert.match(wordVue, /data-ayah-key/)
assert.match(wordVue, /is-ayah-active/)
assert.doesNotMatch(
  memorisationJs,
  /madaniCurrentAyah|madaniSelectedRange|madaniAudioPlayer/,
)

console.log('qpc-madani-selection.test.mjs: ok')
