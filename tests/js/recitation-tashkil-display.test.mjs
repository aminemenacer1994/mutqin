import assert from 'node:assert/strict'
import {
  buildDeterministicRecitationResult,
  buildRealtimePreviewAlignment,
  createRecognitionState,
  createWordsFromTranscript,
  getRecognitionDisplayWords,
  normalizeArabicForRecitation,
  resolveRecitationWordDisplay,
  stabilizeRecognitionEvent,
} from '../../resources/js/scripts/engine/recitation_analysis.js'

const CANONICAL_FATIHA_2 = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'
const ASR_FATIHA_2 = 'الحمد لله رب العالمين'
const opts = { timestamp: '2026-09-10T00:00:00.000Z' }

function speechmaticsWords(pairs) {
  return pairs.map(([word, extras = {}], index) => ({
    word,
    rawWord: word,
    display: word,
    confidence: Number.isFinite(Number(extras.confidence)) ? Number(extras.confidence) : 0.96,
    start: Number.isFinite(Number(extras.start)) ? Number(extras.start) : index,
    end: Number.isFinite(Number(extras.end)) ? Number(extras.end) : index + 0.4,
    provider: 'speechmatics',
  }))
}

// --- Compare-only normaliser: tashkīl / dagger-alef fold for matching only ---
assert.equal(normalizeArabicForRecitation('ٱلْحَمْدُ'), 'الحمد')
assert.equal(normalizeArabicForRecitation('رَبِّ'), 'رب')
assert.equal(normalizeArabicForRecitation('ٱلْعَٰلَمِينَ'), 'العالمين')

// --- Correct recitation maps to vocalised canonical words ---
{
  const result = buildDeterministicRecitationResult(
    CANONICAL_FATIHA_2,
    speechmaticsWords([
      ['الحمد', { confidence: 0.96, start: 1.24, end: 1.67 }],
      ['لله', { confidence: 0.95, start: 1.7, end: 1.92 }],
      ['رب', { confidence: 0.94, start: 1.95, end: 2.1 }],
      ['العالمين', { confidence: 0.97, start: 2.14, end: 2.8 }],
    ]),
    opts,
  )
  assert.deepEqual(result.wordStatuses.map((word) => word.status), [
    'correct', 'correct', 'correct', 'correct',
  ])
  assert.equal(result.wordStatuses[0].displayWord, 'ٱلْحَمْدُ')
  assert.equal(result.wordStatuses[0].rawWord, 'الحمد')
  assert.equal(result.wordStatuses[2].displayWord, 'رَبِّ')
  assert.equal(result.wordStatuses[2].rawWord, 'رب')
  assert.equal(result.wordStatuses[3].displayWord, 'ٱلْعَٰلَمِينَ')
  assert.equal(result.wordStatuses[3].rawWord, 'العالمين')
  assert.equal(resolveRecitationWordDisplay(result.wordStatuses[0]), 'ٱلْحَمْدُ')
  assert.equal(resolveRecitationWordDisplay(result.wordStatuses[3]), 'ٱلْعَٰلَمِينَ')

  // Speechmatics metadata is preserved on the aligned word.
  assert.equal(result.wordStatuses[0].confidence, 0.96)
  assert.equal(result.wordStatuses[0].start, 1.24)
  assert.equal(result.wordStatuses[0].end, 1.67)
  assert.equal(result.wordStatuses[0].startTime, 1.24)
  assert.equal(result.wordStatuses[0].endTime, 1.67)
}

// --- Skipped word does not shift later matches ---
{
  const result = buildDeterministicRecitationResult(
    CANONICAL_FATIHA_2,
    createWordsFromTranscript('الحمد لله العالمين'),
    opts,
  )
  assert.equal(result.wordStatuses[0].status, 'correct')
  assert.equal(result.wordStatuses[0].displayWord, 'ٱلْحَمْدُ')
  assert.equal(result.wordStatuses[1].status, 'correct')
  assert.equal(result.wordStatuses[2].status, 'omitted')
  assert.equal(result.wordStatuses[2].displayWord, '')
  assert.equal(result.wordStatuses[2].rawWord, '')
  assert.equal(result.wordStatuses[3].status, 'correct')
  assert.equal(result.wordStatuses[3].displayWord, 'ٱلْعَٰلَمِينَ')
  assert.equal(result.wordStatuses[3].rawWord, 'العالمين')
}

// --- Wrong word is not silently replaced with canonical tashkīl ---
{
  const result = buildDeterministicRecitationResult(
    CANONICAL_FATIHA_2,
    createWordsFromTranscript('الحمد لله رب صمد'),
    opts,
  )
  const heard = result.wordStatuses[3]
  assert.equal(heard.status, 'incorrect')
  assert.equal(heard.actual, 'صمد')
  assert.equal(heard.rawWord, 'صمد')
  assert.equal(heard.displayWord, '')
  assert.notEqual(resolveRecitationWordDisplay(heard), 'ٱلْعَٰلَمِينَ')
  assert.equal(resolveRecitationWordDisplay(heard), 'صمد')
  assert.notEqual(heard.status, 'correct')
}

// --- Repeated word is handled; later matches stay put ---
{
  const result = buildDeterministicRecitationResult(
    CANONICAL_FATIHA_2,
    speechmaticsWords([
      ['الحمد', { start: 0, end: 0.3 }],
      ['لله', { start: 0.35, end: 0.55 }],
      ['رب', { start: 0.6, end: 0.8 }],
      ['رب', { start: 1.6, end: 1.85 }],
      ['العالمين', { start: 1.9, end: 2.4 }],
    ]),
    opts,
  )
  assert.deepEqual(result.wordStatuses.map((word) => word.status), [
    'correct', 'correct', 'correct', 'correct',
  ])
  assert.equal(result.wordStatuses[2].displayWord, 'رَبِّ')
  assert.equal(result.wordStatuses[3].status, 'correct')
  assert.equal(result.wordStatuses[3].displayWord, 'ٱلْعَٰلَمِينَ')
  assert.equal(result.wordStatuses[3].rawWord, 'العالمين')
  const extras = result.extraWords || []
  assert.ok(extras.some((word) => word.word === 'رب'), 'deliberate repeat of رب should be extra')
  assert.ok(extras.every((word) => !word.displayWord), 'extras must not receive fake canonical tashkīl')
}

// --- Partial → final Speechmatics transcript still aligns to vocalised words ---
{
  let state = createRecognitionState()
  state = stabilizeRecognitionEvent(state, {
    provider: 'speechmatics',
    isFinal: false,
    transcript: ASR_FATIHA_2,
    words: [
      { word: 'الحمد', confidence: 0.7, start: 0.1, end: 0.4 },
      { word: 'لله', confidence: 0.68, start: 0.42, end: 0.6 },
    ],
  })
  const partialWords = getRecognitionDisplayWords(state)
  assert.ok(partialWords.length >= 1)
  assert.equal(partialWords[0].rawWord, 'الحمد')
  const live = buildRealtimePreviewAlignment(CANONICAL_FATIHA_2, partialWords, {
    strictProgression: false,
  })
  assert.equal(live.statuses[0].status, 'correct')
  assert.equal(live.statuses[0].displayWord, 'ٱلْحَمْدُ')

  state = stabilizeRecognitionEvent(state, {
    provider: 'speechmatics',
    isFinal: true,
    speechFinal: true,
    transcript: ASR_FATIHA_2,
    words: [
      { word: 'الحمد', confidence: 0.96, start: 0.1, end: 0.4 },
      { word: 'لله', confidence: 0.95, start: 0.42, end: 0.62 },
      { word: 'رب', confidence: 0.94, start: 0.65, end: 0.8 },
      { word: 'العالمين', confidence: 0.97, start: 0.84, end: 1.3 },
    ],
  })
  const finalResult = buildDeterministicRecitationResult(
    CANONICAL_FATIHA_2,
    state.committedWords,
    opts,
  )
  assert.deepEqual(finalResult.wordStatuses.map((word) => word.status), [
    'correct', 'correct', 'correct', 'correct',
  ])
  assert.equal(finalResult.wordStatuses[0].rawWord, 'الحمد')
  assert.equal(finalResult.wordStatuses[0].displayWord, 'ٱلْحَمْدُ')
  assert.equal(finalResult.wordStatuses[0].confidence, 0.96)
  assert.equal(finalResult.wordStatuses[0].start, 0.1)
  assert.equal(finalResult.wordStatuses[3].displayWord, 'ٱلْعَٰلَمِينَ')
}

console.log('recitation-tashkil-display tests passed')
