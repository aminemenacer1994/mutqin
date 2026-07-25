import assert from 'node:assert/strict'
import {
  buildAudioIndexMap,
  getAudioWordCount,
  resolveAudioWordIndex
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

console.log('madani-word-sync tests passed')
