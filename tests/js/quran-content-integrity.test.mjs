#!/usr/bin/env node
/**
 * Offline CI entry: fail when protected Qur'an content changes unexpectedly.
 */

import assert from 'node:assert/strict'
import {
  detectRecordDefects,
  loadIntegrityJson,
  runAllIntegrityChecks,
  verifyNormalizationPreservesCanonical
} from '../../resources/js/scripts/quran/contentIntegrity.js'
import {
  normalizeArabicForRecitation,
  cleanRecitationDisplayText
} from '../../resources/js/scripts/engine/recitation_analysis.js'
import {
  chapterHasBismillahPre,
  isFatihahBasmalaVerseKey,
  MADANI_TOTAL_PAGES
} from '../../resources/js/scripts/mushaf/madaniPageLayout.js'

const result = runAllIntegrityChecks()
if (!result.ok) {
  for (const error of result.errors) console.error(`FAIL: ${error}`)
  process.exit(1)
}

// Surah boundaries / totals
const meta = loadIntegrityJson('surah-metadata.json')
const corpus = loadIntegrityJson('canonical-corpus.json')
assert.equal(meta.ayah_counts.length, 114)
assert.equal(meta.ayah_counts.reduce((a, b) => a + b, 0), 6236)
assert.equal(corpus.surah_boundaries[0].last_key, '1:7')
assert.equal(corpus.surah_boundaries[1].ayah_count, 286)
assert.equal(corpus.surah_boundaries[8].ayah_count, 129)
assert.equal(corpus.surah_boundaries[113].last_global, 6236)
assert.equal(MADANI_TOTAL_PAGES, 604)

// Selected canonical ayahs
const ikhlas = corpus.selected_ayahs.find(a => a.key === '112:1')
assert.ok(ikhlas)
assert.match(ikhlas.uthmani, /قُلْ/)
assert.equal(ikhlas.global_number, 6222)
assert.equal(ikhlas.page, 604)

// Bismillah edge cases
assert.equal(isFatihahBasmalaVerseKey('1:1'), true)
assert.equal(chapterHasBismillahPre(1), false)
assert.equal(chapterHasBismillahPre(2), true)
assert.equal(chapterHasBismillahPre(9), true)

// Page transitions
const byPage = Object.fromEntries(corpus.page_pins.map(p => [p.page, p]))
assert.equal(byPage[1].last_key, '1:7')
assert.equal(byPage[2].first_key, '2:1')
assert.equal(byPage[2].first_global, byPage[1].last_global + 1)
assert.equal(byPage[604].last_key, '114:6')

// Invalid duplicate / missing / misaligned / reorder detectors
const goodFatiha = [1, 2, 3, 4, 5, 6, 7].map(ayah => ({
  surah: 1,
  ayah,
  key: `1:${ayah}`,
  global_number: ayah,
  page: 1,
  translation_en_asad: 'x',
  transliteration: 'y'
}))
assert.deepEqual(detectRecordDefects(goodFatiha, { expectSurah: 1, expectCount: 7 }), [])

assert.ok(detectRecordDefects(goodFatiha.slice(0, 6), { expectSurah: 1, expectCount: 7 }).some(e => e.includes('Missing')))
assert.ok(detectRecordDefects([...goodFatiha, goodFatiha[0]], { expectSurah: 1, expectCount: 7 }).some(e => e.includes('Duplicated')))
assert.ok(detectRecordDefects([...goodFatiha].reverse(), { expectSurah: 1, expectCount: 7 }).some(e => e.includes('reordered')))
assert.ok(detectRecordDefects([{
  surah: 1,
  ayah: 1,
  key: '1:2',
  translation_en_asad: 'wrong link',
  transliteration: 'x'
}], {}).some(e => e.includes('wrong ayah')))
assert.ok(detectRecordDefects([{
  surah: 1,
  ayah: 1,
  key: '1:1',
  global_number: 99
}], {}).some(e => e.includes('Misaligned')))
assert.ok(detectRecordDefects([{
  surah: 1,
  ayah: 1,
  key: '1:1',
  page: 999
}], {}).some(e => e.includes('outside Madani')))

// Normalization is compare-only — must not mutate stored canonical Arabic
const preserveErrors = verifyNormalizationPreservesCanonical(normalizeArabicForRecitation)
assert.deepEqual(preserveErrors, [])
const fatihaText = corpus.selected_ayahs.find(a => a.key === '1:1').uthmani
const original = fatihaText
const forCompare = normalizeArabicForRecitation(fatihaText)
const forDisplay = cleanRecitationDisplayText(fatihaText)
assert.equal(fatihaText, original)
assert.notEqual(forCompare, fatihaText)
assert.match(forDisplay, /[ًٌٍَُِّْ]/) // display path keeps harakat

console.log('Qur\'an content integrity OK')
