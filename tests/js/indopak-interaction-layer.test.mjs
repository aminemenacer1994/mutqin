import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildIndopakPageLeaf,
  normalizeIndopakPage,
} from '../../resources/js/scripts/mushaf/indopakPageAdapter.js'
import {
  buildAudioIndexMap,
  isMushafOrnamentWordText,
} from '../../resources/js/scripts/mushaf/madaniWordSync.js'
import { resolveQpcWordAudioIndex } from '../../resources/js/scripts/mushaf/qpcMadaniAudioDom.js'
import {
  madaniQpcWordTechniqueClass,
  resolveQpcMadaniWordTechniqueState,
} from '../../resources/js/scripts/mushaf/qpcMadaniTechniques.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const page1 = JSON.parse(
  readFileSync(join(root, 'resources/quran/indopak-15-qudratullah/generated/pages/1.json'), 'utf8'),
)
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

assert.equal(isMushafOrnamentWordText('بِسْمِ'), false)
assert.equal(isMushafOrnamentWordText('۟'), true)
assert.equal(isMushafOrnamentWordText('۟ۙ'), true)

const normalized = normalizeIndopakPage(page1)
const ayahWords = normalized.lines.flatMap((line) => line.words || [])
const spoken = ayahWords.find((word) => word.location === '1:1:1')
const ornament = ayahWords.find((word) => word.location === '1:1:5')
assert.ok(spoken)
assert.ok(ornament)
assert.equal(spoken.isEnd, false)
assert.equal(ornament.isEnd, true)
assert.equal(spoken.verseKey, '1:1')
assert.equal(spoken.wordPosition, 1)
assert.equal(ornament.wordPosition, 5)

// Session audio map uses spoken positions only (canonical verseKey + wordPosition).
const audioIndexMap = buildAudioIndexMap([
  {
    key: '1:1',
    words: [
      { position: 1, ar: 'بِسْمِ' },
      { position: 2, ar: 'اللّٰهِ' },
      { position: 3, ar: 'الرَّحْمٰنِ' },
      { position: 4, ar: 'الرَّحِیْمِ' },
    ],
  },
])
assert.equal(resolveQpcWordAudioIndex(1, '1:1', audioIndexMap), 0)
assert.equal(resolveQpcWordAudioIndex(4, '1:1', audioIndexMap), 3)
assert.equal(
  resolveQpcWordAudioIndex(5, '1:1', audioIndexMap),
  null,
  'ayah-end ornament must not steal a spoken audio index',
)

const hideSnapshot = {
  hiddenRevealModeEnabled: true,
  hiddenRevealVerseKey: '1:1',
  hiddenRevealRevealed: [],
  hiddenRevealCurrentIndex: 0,
}
const spokenState = resolveQpcMadaniWordTechniqueState(spoken, hideSnapshot, audioIndexMap)
const ornamentState = resolveQpcMadaniWordTechniqueState(ornament, hideSnapshot, audioIndexMap)
assert.equal(spokenState.masked, true)
assert.equal(ornamentState.masked, false, 'ornaments stay visible but keep their box')
assert.equal(spokenState.wordAudioIndex, 0)
assert.equal(ornamentState.wordAudioIndex, null)

const classes = madaniQpcWordTechniqueClass(spokenState)
assert.equal(classes['is-word-masked'], true)
assert.equal(classes['word-hidden'], true)

// Shared interaction layer — no IndoPak forks of select/hide/peek wiring.
assert.match(memorisationVue, /:layout-id="mushafLayoutId"/)
assert.match(memorisationVue, /:technique-snapshot="qpcMadaniTechniqueSnapshot"/)
assert.match(memorisationVue, /:progress-snapshot="qpcMadaniProgressSnapshot"/)
assert.match(memorisationVue, /:audio-index-map="madaniAudioIndexMap"/)
assert.match(memorisationVue, /@select="onQpcMadaniWordSelect"/)
assert.match(memorisationVue, /@peek-enter="onVersePeekEnter"/)
assert.doesNotMatch(memorisationVue, /onIndopakWordSelect|indopakTechnique|indopakAudio/)

// Progressive hide must preserve layout width (no display:none / visibility:hidden).
assert.match(wordVue, /is-word-masked/)
assert.match(wordVue, /display: inline-block/)
assert.match(wordVue, /preserve occupied width|Keep the glyph box in flow/i)
assert.doesNotMatch(wordVue, /visibility:\s*hidden/)
assert.doesNotMatch(wordVue, /^\s*display:\s*none\s*;/m)
assert.match(wordVue, /data-verse-key/)
assert.match(wordVue, /data-word-position/)
assert.match(wordVue, /data-location/)

const leaf = buildIndopakPageLeaf(page1)
assert.ok(leaf.page.lines.some((line) => line.words?.some((word) => word.isEnd)))

console.log('indopak-interaction-layer.test.mjs: ok')
