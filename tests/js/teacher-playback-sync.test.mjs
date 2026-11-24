import assert from 'node:assert/strict'
import test from 'node:test'
import {
  activeWordAt,
  ayahAtTime,
  ayahRepeatWindow,
  ayahStartTime,
  flaggedWordAt,
  isValidSegmentMs,
  playbackSummary,
  wordWindow,
} from '../../resources/js/scripts/teacher/playbackSync.js'

const words = [
  { ayah: 1, word_index: 0, status: 'correct', text: 'قُلْ', start: 0.1, end: 0.4 },
  { ayah: 1, word_index: 1, status: 'incorrect', text: 'أَعُوذُ', start: 0.4, end: 0.9, recognised: 'اعوذ' },
  { ayah: 1, word_index: 2, status: 'partial', text: 'بِرَبِّ', start: 1.2, end: 1.6 },
  { ayah: 2, word_index: 0, status: 'skipped', text: 'مَلِكِ' },
  { ayah: 2, word_index: 1, status: 'correct', text: 'ٱلنَّاسِ', start: 2.0 },
]

test('word windows keep stored times and drop an end that precedes its start', () => {
  assert.deepEqual(wordWindow({ start_time: 0.4, end_time: 0.9 }), { start: 0.4, end: 0.9 })
  assert.deepEqual(wordWindow({ start: 1.2, end: 0.2 }), { start: 1.2, end: null })
  assert.equal(wordWindow({ status: 'incorrect' }), null)
  assert.equal(wordWindow({ start: 'soon' }), null)
})

test('playback follows stored timings and leaves gaps inactive', () => {
  assert.equal(activeWordAt(words, 0.2)?.key, '1:0')
  assert.equal(activeWordAt(words, 0.4)?.key, '1:1')
  assert.equal(activeWordAt(words, 1.0), null)
  assert.equal(activeWordAt(words, 1.4)?.key, '1:2')
  assert.equal(activeWordAt(words, 2.4)?.key, '2:1')
  assert.equal(activeWordAt(words, 0.05), null)
})

test('flagged jumps use incorrect words that have a stored start', () => {
  assert.equal(flaggedWordAt(words, 0, 1)?.key, '1:1')
  assert.equal(flaggedWordAt(words, 0.4, 1), null)
  assert.equal(flaggedWordAt(words, 1.5, -1)?.key, '1:1')
  assert.equal(ayahStartTime(words, 2), 2)
  assert.equal(ayahStartTime(words, 3), null)
  assert.deepEqual(ayahRepeatWindow(words, 1), { start: 0.1, end: 2 })
  assert.deepEqual(ayahRepeatWindow(words, 2), { start: 2, end: null })
  assert.equal(ayahRepeatWindow(words, 3), null)
  assert.equal(ayahAtTime(words, 0.5), 1)
  assert.equal(ayahAtTime(words, 1.0), null)
})

test('summary counts checker states without turning uncertain words into flags', () => {
  const summary = playbackSummary(words)
  assert.deepEqual(summary.counts, { flagged: 1, uncertain: 1, skipped: 1, correct: 2 })
  assert.deepEqual(summary.ayahs.map((ayah) => ayah.ayah), [1, 2])
  assert.equal(summary.ayahs[1].start, null)
  assert.equal(summary.items.find((item) => item.status === 'incorrect').recognised, 'اعوذ')
  assert.equal(summary.items.find((item) => item.status === 'skipped').start, null)
})

test('segment milliseconds reject invalid windows and honour duration', () => {
  assert.equal(isValidSegmentMs(0, 500, 4200), true)
  assert.equal(isValidSegmentMs(500, 400, 4200), false)
  assert.equal(isValidSegmentMs(0, 5000, 4200), false)
})
