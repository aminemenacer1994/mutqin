import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyAyahRecitationMastery,
  filterReliableWeakWords,
  isReliableSessionWeakWord,
  mergePersistentWeakWords,
  recordPersistentWordWeaknesses,
  savePersistentWordWeaknessMap,
  sessionScoreFromOutcome,
} from '../../resources/js/scripts/recommendations/recitationMastery.js'

const memory = new Map()

globalThis.__MUTQIN_STORAGE_BRIDGE__ = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null
  },
  setItem(key, value) {
    memory.set(key, value)
  },
  removeItem(key) {
    memory.delete(key)
  },
}

test('uncertain words are not reliable weaknesses', () => {
  assert.equal(isReliableSessionWeakWord({
    surahId: 1,
    ayahNumber: 1,
    wordIndex: 0,
    status: 'uncertain',
    confidence: 0.2,
  }), false)
})

test('high-confidence hard mistakes are reliable on first sight', () => {
  assert.equal(isReliableSessionWeakWord({
    surahId: 1,
    ayahNumber: 1,
    wordIndex: 0,
    status: 'wrong',
    confidence: 0.88,
  }), true)
})

test('persistent map requires repeat before soft mistakes focus', () => {
  savePersistentWordWeaknessMap({})
  const soft = {
    surahId: 2,
    ayahNumber: 255,
    wordIndex: 3,
    status: 'partial',
    confidence: 0.6,
  }
  assert.equal(isReliableSessionWeakWord(soft), false)
  recordPersistentWordWeaknesses([{
    ...soft,
    status: 'wrong',
    confidence: 0.9,
  }])
  assert.equal(isReliableSessionWeakWord(soft), true)
})

test('mergePersistentWeakWords surfaces repeated local weaknesses', () => {
  savePersistentWordWeaknessMap({})
  recordPersistentWordWeaknesses([{
    surahId: 1,
    ayahNumber: 2,
    wordIndex: 1,
    status: 'wrong',
    confidence: 0.95,
    text: 'test',
  }])
  recordPersistentWordWeaknesses([{
    surahId: 1,
    ayahNumber: 2,
    wordIndex: 1,
    status: 'wrong',
    confidence: 0.95,
    text: 'test',
  }])
  const merged = mergePersistentWeakWords([], 8)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].persistent, true)
})

test('mastery EMA does not jump to maximum after one strong session', () => {
  memory.clear()
  const first = applyAyahRecitationMastery(1, 1, sessionScoreFromOutcome('strong', 95), 'strong')
  const second = applyAyahRecitationMastery(1, 1, sessionScoreFromOutcome('strong', 95), 'strong')
  assert.ok(first.masteryScore < 0.85)
  assert.ok(second.masteryScore >= first.masteryScore)
  assert.ok(second.masteryScore < 0.98)
})

test('filterReliableWeakWords removes low-confidence first-time amber', () => {
  savePersistentWordWeaknessMap({})
  const filtered = filterReliableWeakWords([
    { surahId: 1, ayahNumber: 1, wordIndex: 0, status: 'partial', confidence: 0.4 },
    { surahId: 1, ayahNumber: 1, wordIndex: 1, status: 'wrong', confidence: 0.91 },
  ])
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].wordIndex, 1)
})

test.after(() => {
  delete globalThis.__MUTQIN_STORAGE_BRIDGE__
  memory.clear()
})
