import assert from 'node:assert/strict'
import test from 'node:test'
import { recordAyahRange } from '../../resources/js/scripts/teacher/recordAyahRange.js'

test('record previews use the actual persisted passage or explicit ayah reference', () => {
  assert.deepEqual(recordAyahRange({ range: { surah: 112, from: 1, to: 4 }, arabicText: 'untrusted text' }), { surah: 112, from: 1, to: 4 })
  assert.deepEqual(recordAyahRange({ range: { surah_number: '1', ayah_start: '2', ayah_end: '3' } }), { surah: 1, from: 2, to: 3 })
  assert.deepEqual(recordAyahRange({ firstSurah: 114, ayah: 6 }), { surah: 114, from: 6, to: 6 })
  assert.deepEqual(recordAyahRange({ surah_number: 2, ayah_number: 286 }), { surah: 2, from: 286, to: 286 })
})

test('record previews never guess a verse from display text, title or incomplete metadata', () => {
  for (const row of [null, {}, { arabicText: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' }, { title: 'Al-Ikhlas 1–4' }, { range: { surah: 112 } }, { range: { from: 1 } }]) {
    assert.equal(recordAyahRange(row), null)
  }
})

test('invalid, reversed and out-of-surah references cannot render an unrelated canonical ayah', () => {
  for (const range of [
    { surah: 0, from: 1 }, { surah: 115, from: 1 }, { surah: true, from: 1 },
    { surah: 112, from: true }, { surah: 112, from: '' }, { surah: 112, from: -1 },
    { surah: 112, from: 2, to: 1 }, { surah: 112, from: 4, to: 5 }, { surah: 112, from: 5 },
    { surah: 112, from: 1.5 }, { surah: 112, from: 1, to: 'unknown' },
  ]) assert.equal(recordAyahRange({ range }), null)
  assert.equal(recordAyahRange({ range: { surah: 0, from: 1 }, firstSurah: 112 }), null, 'Invalid stored values cannot silently fall back to another reference')
})
