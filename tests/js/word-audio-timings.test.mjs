import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildAudioIndexMap,
  buildEstimatedWordTimings,
  listSpokenAudioWords,
} from '../../resources/js/scripts/mushaf/madaniWordSync.js'
import { resolveQpcWordAudioIndex } from '../../resources/js/scripts/mushaf/qpcMadaniAudioDom.js'
import { resolveQpcMadaniWordTechniqueState } from '../../resources/js/scripts/mushaf/qpcMadaniTechniques.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

const getWordTimings = memorisationJs.slice(
  memorisationJs.indexOf('async getWordTimings(verse, actualDuration = null)'),
  memorisationJs.indexOf('calculateWordTimings(verse, audioDuration = null)'),
)

assert.match(getWordTimings, /listSpokenAudioWords/)
assert.match(getWordTimings, /buildEstimatedWordTimings/)
assert.doesNotMatch(
  getWordTimings,
  /word\?\.ar \|\| ''/,
  'QPC/IndoPak glyphs have text, not ar — timings must not require word.ar',
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

console.log('word-audio-timings.test.mjs: ok')
