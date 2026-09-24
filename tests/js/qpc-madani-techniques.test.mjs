import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildMadaniAmdHiddenIndexesByAyah,
  isAyahBlurred,
  isAyahPeekRevealed,
  madaniQpcWordTechniqueClass,
  qpcWordLocationKey,
  resolveCheckerHiddenWordState,
  resolveHiddenRevealWordState,
  resolveMadaniAmdPeekAyahKey,
  resolveQpcMadaniWordTechniqueState,
} from '../../resources/js/scripts/mushaf/qpcMadaniTechniques.js'
import {
  normaliseDifficultyPercent,
  selectHiddenWordIndexes,
} from '../../resources/js/scripts/memorisationDetection/hiddenWords.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

assert.equal(qpcWordLocationKey({ location: '2:30:5' }), '2:30:5')
assert.equal(qpcWordLocationKey({ surah: '2', ayah: '30', word: '5' }), '2:30:5')

const blurSnap = {
  blurModeEnabled: true,
  effectiveActiveAyah: '2:30',
  hoverPeekAyah: '',
  touchPeekAyah: '',
  blurPeekHoldingSpace: false,
}
assert.equal(isAyahBlurred('2:31', blurSnap), true)
assert.equal(isAyahBlurred('2:30', blurSnap), false)
assert.equal(isAyahPeekRevealed('2:31', { ...blurSnap, hoverPeekAyah: '2:31' }), true)

const wordCount = 12
for (const pct of [25, 50, 75, 100]) {
  const hiddenIndexes = selectHiddenWordIndexes(wordCount, pct, `hide-${pct}`)
  const expected = pct === 100
    ? wordCount
    : Math.max(1, Math.min(wordCount, Math.round((wordCount * normaliseDifficultyPercent(pct)) / 100)))
  assert.equal(hiddenIndexes.length, expected, `hide ${pct}% count`)
  assert.equal(new Set(hiddenIndexes).size, hiddenIndexes.length, `hide ${pct}% unique`)
}

const hiddenIndexes = selectHiddenWordIndexes(wordCount, 50, 'test-seed')
assert.equal(hiddenIndexes.length, 6)

const checkerSnap = {
  effectiveActiveAyah: '2:30',
  checkerHiddenIndexesByAyah: { '2:30': hiddenIndexes },
  checkerPeekActive: false,
}
assert.equal(resolveCheckerHiddenWordState(0, '2:30', checkerSnap).masked, hiddenIndexes.includes(0))
assert.equal(resolveCheckerHiddenWordState(11, '2:30', checkerSnap).masked, hiddenIndexes.includes(11))

const revealSnap = {
  hiddenRevealModeEnabled: true,
  hiddenRevealVerseKey: '2:30',
  hiddenRevealRevealed: [0, 1],
  hiddenRevealCurrentIndex: 1,
}
assert.equal(resolveHiddenRevealWordState(2, '2:30', revealSnap).masked, true)
assert.equal(resolveHiddenRevealWordState(1, '2:30', revealSnap).masked, false)
assert.equal(resolveHiddenRevealWordState(1, '2:30', revealSnap).current, true)

const word = { location: '2:31:3', surah: '2', ayah: '31', word: '3', text: 'x' }
const peekTechnique = resolveQpcMadaniWordTechniqueState(word, {
  ...blurSnap,
  hoverPeekAyah: '2:31',
})
assert.equal(peekTechnique.blurUpcoming, true)
assert.equal(peekTechnique.peekRevealed, true)
assert.equal(madaniQpcWordTechniqueClass(peekTechnique)['peek-revealed'], true)

const focusTechnique = resolveQpcMadaniWordTechniqueState(word, {
  ...blurSnap,
  focusModeEnabled: true,
  hasSessionStarted: true,
})
assert.equal(focusTechnique.focusDimmed, true)

const amdByAyah = buildMadaniAmdHiddenIndexesByAyah({
  ayahKeys: ['2:30', '2:31'],
  ayahBounds: [{ start: 0, end: 5 }, { start: 5, end: 12 }],
  globalHiddenIndexes: [0, 1, 6, 7],
  hideAllWords: false,
  liveWords: [{ status: 'correct' }],
})
assert.deepEqual(amdByAyah['2:30'], [1])
assert.deepEqual(amdByAyah['2:31'], [1, 2])

const hideAll = buildMadaniAmdHiddenIndexesByAyah({
  ayahKeys: ['2:30'],
  ayahBounds: [{ start: 0, end: 4 }],
  globalHiddenIndexes: [],
  hideAllWords: true,
  liveWords: [],
})
assert.deepEqual(hideAll['2:30'], [0, 1, 2, 3])

assert.equal(
  resolveCheckerHiddenWordState(1, '2:30', {
    checkerHiddenIndexesByAyah: { '2:30': [1, 2] },
    checkerPeekActive: true,
    checkerPeekAyah: '2:30',
    effectiveActiveAyah: '2:30',
  }).masked,
  false,
)

assert.equal(
  resolveMadaniAmdPeekAyahKey({
    ayahKeys: ['2:30', '2:31'],
    ayahBounds: [{ start: 0, end: 5 }, { start: 5, end: 12 }],
    peekAyahBound: { start: 6, end: 12 },
  }),
  '2:31',
)

assert.match(wordVue, /is-word-masked/)
assert.match(wordVue, /::after/)
assert.match(wordVue, /display: inline-block/)
assert.doesNotMatch(wordVue, /visibility:\s*hidden/)
assert.doesNotMatch(wordVue, /display:\s*none/)
assert.match(wordVue, /data-verse-key/)
assert.match(wordVue, /data-word-index/)
assert.match(wordVue, /qpcMadaniTechniques/)
assert.match(memorisationJs, /qpcMadaniTechniqueSnapshot/)
assert.doesNotMatch(memorisationJs, /buildMadaniAmdHiddenIndexesByAyah/)
assert.match(memorisationJs, /checkerHiddenIndexesByAyah: \{\}/)
assert.match(memorisationVue, /:technique-snapshot="qpcMadaniTechniqueSnapshot"/)
assert.match(memorisationVue, /@peek-enter="onVersePeekEnter"/)
assert.match(memorisationJs, /qpc-madani-word\[data-verse-key/)
assert.doesNotMatch(memorisationJs, /madaniTechniqueEngine|qpcTechniqueEngine/)

console.log('qpc-madani-techniques.test.mjs: ok')
