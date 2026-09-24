import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ayahKeyFromWord,
  buildMadaniSelection,
  compareAyahKeys,
  filterQpcPageLinesToSession,
  prepareQpcMadaniSessionLines,
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

const selectIdx = memorisationJs.indexOf('onQpcMadaniWordSelect(location)')
assert.ok(selectIdx >= 0)
assert.match(memorisationJs.slice(selectIdx, selectIdx + 1400), /resolveQpcWordAudioIndex/)
assert.match(memorisationJs.slice(selectIdx, selectIdx + 1400), /onMushafAyahClick/)
assert.match(memorisationVue, /:range-start-ayah="''"/)
assert.match(memorisationVue, /:active-ayah="qpcMadaniSelectionActiveAyah"/)
assert.match(memorisationVue, /:active-ayah="qpcMadaniSelectionActiveAyah"/)
assert.match(wordVue, /data-ayah-key/)
assert.match(wordVue, /is-ayah-active/)
assert.doesNotMatch(
  memorisationJs,
  /madaniCurrentAyah|madaniSelectedRange|madaniAudioPlayer/,
)

const sessionLines = filterQpcPageLinesToSession([
  { line_type: 'ayah', words: [{ surah: '51', ayah: '60', location: '51:60:1' }] },
  { line_type: 'surah_name', surah_number: 52, words: [] },
  { line_type: 'basmallah', surah_number: 52, words: [] },
  { line_type: 'ayah', words: [{ surah: '52', ayah: '1', location: '52:1:1' }, { surah: '52', ayah: '4', location: '52:4:1' }] },
], '52:1', '52:3')
assert.equal(sessionLines.length, 2)
assert.equal(sessionLines[0].line_type, 'surah_name')
assert.equal(sessionLines[1].words.length, 1)
assert.equal(sessionLines[1].words[0].location, '52:1:1')

const midSurah = prepareQpcMadaniSessionLines([
  { line_type: 'ayah', line_number: 4, words: [{ surah: '85', ayah: '12', location: '85:12:1' }] },
  { line_type: 'ayah', line_number: 5, words: [{ surah: '85', ayah: '13', location: '85:13:1' }] },
], '85:12', '85:13')
assert.equal(midSurah.length, 3)
assert.equal(midSurah[0].line_type, 'surah_name')
assert.equal(Number(midSurah[0].surah_number), 85)

const burujPage = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/pages/590.json'), 'utf8'))
const buruj = prepareQpcMadaniSessionLines(
  burujPage.page?.lines || burujPage.lines || [],
  '85:12',
  '85:22',
)
assert.ok(buruj.some((line) => String(line.line_type) === 'surah_name'))
assert.equal(buruj.filter((line) => String(line.line_type) === 'ayah').length, 4)

console.log('qpc-madani-selection.test.mjs: ok')
