import assert from 'node:assert/strict'
import {
  buildAudioIndexMap,
  buildEstimatedWordTimings,
  getAudioWordCount,
  isSpokenAudioWord,
  listSpokenAudioWords,
  resolveAudioWordIndex,
} from '../../resources/js/scripts/mushaf/madaniWordSync.js'

const verses = [{
  key: '1:1',
  words: [
    { position: 1, ar: 'بِسْمِ' },
    { position: 2, ar: 'ٱللَّهِ' },
    { position: 3, ar: 'ٱلرَّحْمَـٰنِ' },
    { position: 4, ar: '' },
    { position: 5, text: '' }
  ]
}]

const map = buildAudioIndexMap(verses)
assert.equal(map.get('1:1:1'), 0)
assert.equal(map.get('1:1:2'), 1)
assert.equal(map.get('1:1:3'), 2)
assert.equal(map.get('1:1:__count'), 3)
assert.equal(getAudioWordCount(verses[0], map), 3)

assert.equal(resolveAudioWordIndex({ verseKey: '1:1', position: 1 }, map), 0)
assert.equal(resolveAudioWordIndex({ verseKey: '1:1', position: 3 }, map), 2)
assert.equal(resolveAudioWordIndex({ verseKey: '1:1', position: 4, isEnd: true }, map), null)
assert.equal(resolveAudioWordIndex({ verseKey: '1:1', position: 9 }, map), 8)

const wbwVerse = {
  key: '2:30',
  words: [
    { ar: 'وَإِذْ' },
    { ar: 'قَالَ' },
    { ar: 'رَبُّكَ' },
  ],
}
const wbwMap = buildAudioIndexMap([wbwVerse])
assert.equal(wbwMap.get('2:30:1'), 0)
assert.equal(wbwMap.get('2:30:2'), 1)
assert.equal(wbwMap.get('2:30:3'), 2)
assert.equal(wbwMap.get('2:30:__count'), 3)

const qpcVerse = {
  key: '1:1',
  words: [
    { word: '1', text: '\uFC41' },
    { word: '2', text: '\uFC42' },
    { word: '3', text: '\uFC43' },
    { word: '0', text: '\uFC44', isEnd: true },
    { char_type_name: 'end', text: '۝' },
  ],
}
assert.equal(isSpokenAudioWord(qpcVerse.words[0]), true)
assert.equal(isSpokenAudioWord(qpcVerse.words[3]), false)
assert.equal(isSpokenAudioWord(qpcVerse.words[4]), false)
assert.deepEqual(listSpokenAudioWords(qpcVerse).map((item) => item.position), [1, 2, 3])
const qpcMap = buildAudioIndexMap([qpcVerse])
assert.equal(qpcMap.get('1:1:1'), 0)
assert.equal(qpcMap.get('1:1:3'), 2)
assert.equal(qpcMap.get('1:1:__count'), 3)
assert.equal(getAudioWordCount(qpcVerse, qpcMap), 3)

const glyphTimes = buildEstimatedWordTimings(['\uFC41', '\uFC42', '\uFC43'], 6)
assert.equal(glyphTimes.length, 3)
assert.equal(glyphTimes[0].index, 0)
assert.equal(glyphTimes[2].end, 6)
assert.ok(glyphTimes[0].end > glyphTimes[0].start)

console.log('madani-word-sync tests passed')
