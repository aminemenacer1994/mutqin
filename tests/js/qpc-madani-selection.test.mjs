import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ayahKeyFromWord,
  buildMadaniSelection,
  compareAyahKeys,
  filterQpcPageLinesToSession,
  stripBasmalaAfterLastSessionAyah,
  padQpcMadaniLinesToPrintedGrid,
  prepareQpcMadaniSessionLines,
  pageHasSessionAyahWords,
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
assert.equal(sessionLines.length, 3)
assert.equal(sessionLines[0].line_type, 'surah_name')
assert.equal(sessionLines[1].line_type, 'basmallah')
assert.equal(sessionLines[2].words.length, 1)
assert.equal(sessionLines[2].words[0].location, '52:1:1')

const trailingBasmala = stripBasmalaAfterLastSessionAyah([
  { line_type: 'ayah', line_number: 10, words: [{ surah: '2', ayah: '30', location: '2:30:1' }] },
  { line_type: 'basmallah', surah_number: 2, line_number: 15, words: [] },
], '2:30', '2:30')
assert.equal(trailingBasmala.length, 1)
assert.equal(trailingBasmala[0].line_type, 'ayah')

const singleAyahPartial = prepareQpcMadaniSessionLines([
  {
    line_type: 'ayah',
    line_number: 8,
    words: [
      { surah: '16', ayah: '13', location: '16:13:99' },
      { surah: '16', ayah: '14', location: '16:14:1' },
    ],
  },
  { line_type: 'ayah', line_number: 9, words: [{ surah: '16', ayah: '14', location: '16:14:2' }] },
], '16:14', '16:14')
const singleAyahRows = singleAyahPartial.filter((line) => line.line_type === 'ayah')
assert.equal(singleAyahRows.length, 2, 'single-ayah sessions must not merge continuation rows')
assert.deepEqual(
  singleAyahRows.flatMap((line) => (line.words || []).map((word) => word.location)),
  ['16:14:1', '16:14:2'],
)

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

const nahlPage = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/pages/267.json'), 'utf8'))
const nahlSource = nahlPage.page?.lines || nahlPage.lines || []
const nahlSession = prepareQpcMadaniSessionLines(nahlSource, '16:1', '16:14')
assert.ok(nahlSession.length < 15)
assert.ok(!nahlSession.some((line) => (line.words || []).some((word) => String(word.surah) === '15')))
const nahlGrid = prepareQpcMadaniSessionLines(nahlSource, '16:1', '16:14', {
  preservePrintedGrid: true,
  includeSurahOpening: true,
})
assert.equal(nahlGrid.length, 15)
const nahlSurahRow = nahlGrid.find((line) => String(line.line_type) === 'surah_name')
const nahlBasmalaRow = nahlGrid.find((line) => ['basmallah', 'basmala'].includes(String(line.line_type)))
assert.ok(nahlSurahRow)
assert.ok(nahlBasmalaRow)
assert.equal(Number(nahlBasmalaRow.line_number), Number(nahlSurahRow.line_number) + 1)
assert.ok(nahlGrid.some((line) => (line.words || []).some((word) => word.location === '16:1:1')))
assert.ok(!nahlGrid.some((line) => (line.words || []).some((word) => String(word.surah) === '15')))
assert.equal(padQpcMadaniLinesToPrintedGrid(nahlSource, nahlSession, '16:1', '16:14').length, 15)

const hijrMidSource = [
  { line_type: 'surah_name', surah_number: 15, line_number: 1, words: [] },
  { line_type: 'basmallah', surah_number: 15, line_number: 2, words: [] },
  { line_type: 'ayah', line_number: 8, words: [{ surah: '15', ayah: '91', location: '15:91:1' }] },
]
const hijrMidPrepared = prepareQpcMadaniSessionLines(hijrMidSource, '15:91', '15:94')
assert.ok(!hijrMidPrepared.some((line) => ['basmallah', 'basmala'].includes(String(line.line_type))))
const hijrMidGrid = padQpcMadaniLinesToPrintedGrid(hijrMidSource, hijrMidPrepared, '15:91', '15:94')
assert.ok(!hijrMidGrid.some((line) => ['basmallah', 'basmala'].includes(String(line.line_type))))

const hijrOpenSource = [
  { line_type: 'surah_name', surah_number: 15, line_number: 1, words: [] },
  { line_type: 'basmallah', surah_number: 15, line_number: 2, words: [] },
  { line_type: 'ayah', line_number: 8, words: [{ surah: '15', ayah: '29', location: '15:29:1' }] },
]
const hijrOpenGrid = prepareQpcMadaniSessionLines(hijrOpenSource, '15:29', '15:31', {
  preservePrintedGrid: true,
  includeSurahOpening: true,
})
assert.equal(String(hijrOpenGrid[0].line_type), 'surah_name')
assert.ok(!['basmallah', 'basmala'].includes(String(hijrOpenGrid[1].line_type)), 'mid-surah session must not show basmala')
assert.equal(String(hijrOpenGrid[7].line_type), 'ayah', 'ayah stays on printed line 8 for spread alignment')

const hadidPage = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/pages/537.json'), 'utf8'))
const hadidSource = hadidPage.page?.lines || hadidPage.lines || []
const hadidSession = prepareQpcMadaniSessionLines(hadidSource, '57:1', '57:29')
assert.ok(hadidSession.length < 15)
assert.ok(!hadidSession.some((line) => (line.words || []).some((word) => String(word.surah) === '56')))
assert.ok(hadidSession.some((line) => String(line.line_type) === 'surah_name'))
assert.ok(hadidSession.some((line) => ['basmallah', 'basmala'].includes(String(line.line_type))))
assert.ok(hadidSession.some((line) => (line.words || []).some((word) => word.location === '57:1:1')))
assert.ok(hadidSession.every((line) => String(line.line_type) !== 'empty'))
const hadidPageGrid = prepareQpcMadaniSessionLines(hadidSource, '57:1', '57:29', {
  preservePrintedGrid: true,
  includeSurahOpening: true,
})
assert.equal(hadidPageGrid.length, 15)
assert.ok(!hadidPageGrid.some((line) => (line.words || []).some((word) => String(word.surah) === '56')))
assert.ok(hadidPageGrid.some((line) => (line.words || []).some((word) => word.location === '57:1:1')))
assert.ok(hadidPageGrid.some((line) => String(line.line_type) === 'empty'))

const hijr263 = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/pages/263.json'), 'utf8'))
const hijr263Lines = hijr263.page?.lines || hijr263.lines || []
const hijr263Session = prepareQpcMadaniSessionLines(hijr263Lines, '15:29', '15:94', {
  preservePrintedGrid: true,
  includeSurahOpening: false,
})
assert.equal(hijr263Session.length, 15)
assert.ok(hijr263Session.some((line) => String(line.line_type) === 'surah_name'))
assert.ok(!hijr263Session.some((line) => ['basmallah', 'basmala'].includes(String(line.line_type))))
assert.ok(pageHasSessionAyahWords(hijr263Lines, '15:29', '15:94'))
assert.ok(hijr263Session.some((line) => (line.words || []).some((word) => word.location === '15:29:1')))
assert.ok(!hijr263Session.some((line) => (line.words || []).some((word) => String(word.ayah) === '16' && String(word.surah) === '15')))

const hijr262 = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/pages/262.json'), 'utf8'))
const hijr262Lines = hijr262.page?.lines || hijr262.lines || []
const hijr262Mid = prepareQpcMadaniSessionLines(hijr262Lines, '15:91', '15:94', {
  preservePrintedGrid: true,
})
assert.equal(hijr262Mid.length, 15)
assert.ok(!hijr262Mid.some((line) => String(line.line_type) === 'surah_name'))
assert.ok(!hijr262Mid.some((line) => ['basmallah', 'basmala'].includes(String(line.line_type))))

console.log('qpc-madani-selection.test.mjs: ok')
