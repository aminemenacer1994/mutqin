import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildAudioIndexMap,
  buildAuthoritativeWordTimings,
  buildEstimatedWordTimings,
  listSpokenAudioWords,
} from '../../resources/js/scripts/mushaf/madaniWordSync.js'
import {
  audioSourceMatchesWordTrack,
  QURAN_COM_WORD_TIMING_RECITERS,
} from '../../resources/js/scripts/audio/ayahWordTrack.js'
import { resolveQpcWordAudioIndex } from '../../resources/js/scripts/mushaf/qpcMadaniAudioDom.js'
import { resolveQpcMadaniWordTechniqueState } from '../../resources/js/scripts/mushaf/qpcMadaniTechniques.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

const getWordTimings = memorisationJs.slice(
  memorisationJs.indexOf('async getWordTimings(verse, options = {})'),
  memorisationJs.indexOf('calculateWordTimings(verse, audioDuration = null)'),
)

assert.match(getWordTimings, /listSpokenAudioWords/)
assert.match(getWordTimings, /audioSourceMatchesWordTrack/)
assert.match(getWordTimings, /buildEstimatedWordTimings/)
assert.match(getWordTimings, /boundaryCurve: 0\.82/)
assert.equal(
  QURAN_COM_WORD_TIMING_RECITERS['ar.alafasy'],
  7,
  'the default reciter must use its matching Quran.com word-segment recording',
)
assert.equal(audioSourceMatchesWordTrack(
  'https://verses.quran.com/Alafasy/mp3/001001.mp3',
  { audioUrl: 'https://verses.quran.com/Alafasy/mp3/001001.mp3' },
), true)
assert.equal(audioSourceMatchesWordTrack(
  'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
  { audioUrl: 'https://verses.quran.com/Alafasy/mp3/001001.mp3' },
), false, 'word segments cannot be applied to a different media source')
assert.match(
  memorisationJs,
  /authoritativeTrack\?\.audioUrl/,
  'playback must use the same ayah file that supplied authoritative segments',
)
assert.ok(
  [...memorisationJs.matchAll(/authoritativeTrack\?\.audioUrl/g)].length >= 2,
  'both full-ayah playback and individual-word preview must use the paired file',
)
assert.doesNotMatch(
  getWordTimings,
  /word\?\.ar \|\| ''/,
  'QPC/IndoPak glyphs have text, not ar — timings must not require word.ar',
)

const loadedMetadataHandler = memorisationJs.slice(
  memorisationJs.indexOf('this.audioLoadedMetadata = () => {'),
  memorisationJs.indexOf('this.audioError = (e, detail = null) => {'),
)

assert.match(
  loadedMetadataHandler,
  /ensureWordHighlightTrack\(verse, \{ force: true \}\)/,
  'metadata must replace any pre-metadata timing estimate with the actual media duration',
)
assert.match(
  loadedMetadataHandler,
  /this\.activeVerseRef\?\.key !== verse\.key/,
  'a delayed metadata timing refresh must not overwrite a newly selected ayah',
)

const wbwVerse = {
  key: '1:1',
  arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  words: [
    { ar: 'بِسْمِ' },
    { ar: 'ٱللَّهِ' },
    { ar: 'ٱلرَّحْمَٰنِ' },
    { ar: 'ٱلرَّحِيمِ' },
  ],
}
const wbwMap = buildAudioIndexMap([wbwVerse])
assert.equal(resolveQpcWordAudioIndex(1, '1:1', wbwMap), 0)
assert.equal(resolveQpcWordAudioIndex(4, '1:1', wbwMap), 3)

const pageWord = { location: '1:1:2', surah: '1', ayah: '1', word: '2', text: '\uFC42' }
const highlight = resolveQpcMadaniWordTechniqueState(pageWord, {
  highlightedAyahKey: '1:1',
  highlightedWordIndex: 1,
}, wbwMap)
assert.equal(highlight.wordAudioIndex, 1)
assert.equal(highlight.isAudioHighlighted, true)

const qpcVerse = {
  key: '2:1',
  words: [
    { word: '1', text: '\uFC41' },
    { word: '2', text: '\uFC42' },
    { isEnd: true, word: '0', text: '۝' },
  ],
}
const spoken = listSpokenAudioWords(qpcVerse)
assert.equal(spoken.length, 2)
const timestamps = buildEstimatedWordTimings(spoken.map((item) => item.text), 4)
assert.equal(timestamps.length, 2)
assert.equal(timestamps[1].end, 4)

const regularFallback = buildEstimatedWordTimings(['one', 'two', 'three', 'four'], 8)
const conservativeFallback = buildEstimatedWordTimings(
  ['one', 'two', 'three', 'four'],
  8,
  { boundaryCurve: 0.82 },
)
assert.ok(
  conservativeFallback[1].start > regularFallback[1].start,
  'fallback highlighting must delay interior transitions instead of racing ahead',
)
assert.equal(conservativeFallback.at(-1).end, 8)

const authoritative = buildAuthoritativeWordTimings([
  [1, 6025, 7025],
  [2, 7025, 7885],
  [3, 7885, 8515],
  [4, 8515, 11550],
], 4, { relativeToFirstSegment: true })
assert.deepEqual(authoritative, [
  { index: 0, start: 0, end: 1 },
  { index: 1, start: 1, end: 1.86 },
  { index: 2, start: 1.86, end: 2.49 },
  { index: 3, start: 2.49, end: 5.525 },
])
assert.deepEqual(
  buildAuthoritativeWordTimings([
    [0, 1, 80, 960],
    [1, 2, 970, 1800],
  ], 2),
  [
    { index: 0, start: 0.08, end: 0.96 },
    { index: 1, start: 0.97, end: 1.8 },
  ],
  'ayah response rows retain their real leading-silence offset',
)
assert.deepEqual(
  buildAuthoritativeWordTimings([[1, 0, 500], [2]], 2),
  [],
  'marker-only rows must not produce a shifted partial timing map',
)

console.log('word-audio-timings.test.mjs: ok')
