import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/recitation-replay.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const recitation = await loadModule('resources/js/engine/recitation_analysis.js')
const {
  buildDeterministicRecitationResult,
  createRecognitionState,
  createWordsFromTranscript,
  getRecognitionDisplayWords,
  replayRecognitionSession,
  stabilizeRecognitionEvent
} = recitation.namespace

const targetText = 'قل هو الله أحد'
const finalEvents = [
  {
    provider: 'speechmatics',
    isFinal: true,
    start: 0,
    duration: 0.8,
    words: [
      { word: 'قل', confidence: 0.95, start: 0.1, end: 0.28 },
      { word: 'هو', confidence: 0.94, start: 0.31, end: 0.48 },
      { word: 'هو', confidence: 0.93, start: 0.5, end: 0.65 }
    ]
  },
  {
    provider: 'speechmatics',
    isFinal: true,
    start: 0.8,
    duration: 0.9,
    words: [
      { word: 'الله', confidence: 0.96, start: 0.84, end: 1.12 },
      { word: 'أحد', confidence: 0.97, start: 1.16, end: 1.42 }
    ]
  }
]

const noisyEvents = [
  {
    provider: 'speechmatics',
    isFinal: false,
    start: 0,
    duration: 0.8,
    transcript: 'قل هو غلط',
    words: [
      { word: 'قل', confidence: 0.91, start: 0.1, end: 0.28 },
      { word: 'غلط', confidence: 0.44, start: 0.31, end: 0.48 }
    ]
  },
  finalEvents[1],
  {
    provider: 'speechmatics',
    isFinal: false,
    start: 0.8,
    duration: 0.9,
    transcript: 'الله',
    words: [
      { word: 'الله', confidence: 0.62, start: 0.84, end: 1.12 }
    ]
  },
  finalEvents[0]
]

function comparable(result) {
  return {
    alignmentOutput: result.wordStatuses.map(word => ({
      text: word.text,
      status: word.status,
      actual: word.actual || '',
      outOfOrder: !!word.outOfOrder
    })),
    mistakeCounts: {
      missing: result.mistakes.missing.length,
      extra: result.mistakes.extra.length,
      partial: result.mistakes.partial.length,
      incorrect: result.mistakes.incorrect.length
    },
    scores: {
      accuracyScore: result.accuracyScore,
      completionPercentage: result.completionPercentage
    },
    progressStates: result.alignmentState,
    reviewRecommendations: result.reviewRecommendations,
    retentionSignals: result.retentionSignals
  }
}

const baseline = comparable(replayRecognitionSession(noisyEvents, targetText, {
  timestamp: '2026-06-11T00:00:00.000Z',
  metadata: { sessionId: 'session-1', audioHash: 'audio-1' }
}))

for (let index = 0; index < 10; index += 1) {
  const replayed = comparable(replayRecognitionSession(noisyEvents, targetText, {
    timestamp: '2026-06-11T00:00:00.000Z',
    metadata: { sessionId: 'session-1', audioHash: 'audio-1' }
  }))
  assert.deepEqual(replayed, baseline)
}

const reorderedFinals = comparable(replayRecognitionSession([...finalEvents].reverse(), targetText, {
  timestamp: '2026-06-11T00:00:00.000Z',
  metadata: { sessionId: 'session-1', audioHash: 'audio-1' }
}))

assert.deepEqual(reorderedFinals, baseline)
assert.equal(baseline.mistakeCounts.extra, 1)
assert.equal(baseline.scores.completionPercentage, 100)
assert.ok(baseline.retentionSignals.needsReview)

const tutorRecognitionWords = createWordsFromTranscript('قل غلط الله أحد')
const reviewProgression = buildDeterministicRecitationResult(targetText, tutorRecognitionWords, {
  strictProgression: false,
  timestamp: '2026-06-11T00:00:00.000Z'
})
const tutorProgression = buildDeterministicRecitationResult(targetText, tutorRecognitionWords, {
  strictProgression: true,
  timestamp: '2026-06-11T00:00:00.000Z'
})

assert.equal(reviewProgression.accuracyScore, tutorProgression.accuracyScore)
assert.equal(tutorProgression.alignmentState.visibleStatuses[1].status, 'incorrect')
assert.equal(tutorProgression.alignmentState.visibleStatuses[2].status, 'pending')
assert.notEqual(reviewProgression.alignmentState.visibleStatuses[2].status, 'pending')

let liveDisplayState = createRecognitionState()
liveDisplayState = stabilizeRecognitionEvent(liveDisplayState, {
  provider: 'speechmatics',
  isFinal: true,
  start: 0,
  duration: 0.42,
  words: [
    { word: 'قل', confidence: 0.96, start: 0.02, end: 0.14 },
    { word: 'هو', confidence: 0.95, start: 0.16, end: 0.28 }
  ]
})
liveDisplayState = stabilizeRecognitionEvent(liveDisplayState, {
  provider: 'speechmatics',
  isFinal: false,
  start: 0.43,
  duration: 0.46,
  words: [
    { word: 'الله', confidence: 0.88, start: 0.46, end: 0.62 },
    { word: 'غلط', confidence: 0.87, start: 0.64, end: 0.79 }
  ]
})
assert.equal(
  Array.from(getRecognitionDisplayWords(liveDisplayState), word => word.word).join('|'),
  'قل|هو|الله|غلط'
)
liveDisplayState = stabilizeRecognitionEvent(liveDisplayState, {
  provider: 'speechmatics',
  isFinal: false,
  start: 0.43,
  duration: 0.46,
  words: [
    { word: 'الله', confidence: 0.92, start: 0.46, end: 0.62 },
    { word: 'أحد', confidence: 0.91, start: 0.64, end: 0.79 }
  ]
})
assert.equal(
  Array.from(getRecognitionDisplayWords(liveDisplayState), word => word.word).join('|'),
  'قل|هو|الله|احد'
)

const rangeAyahs = [
  { key: '112:1', number: 1, text: 'قل هو الله أحد' },
  { key: '112:2', number: 2, text: 'الله الصمد' },
  { key: '112:3', number: 3, text: 'لم يلد ولم يولد' }
]
const rangeText = rangeAyahs.map(ayah => ayah.text).join(' ')

const omissionResult = buildDeterministicRecitationResult(
  rangeText,
  createWordsFromTranscript('قل الله أحد الله الصمد لم يلد ولم يولد'),
  { targetAyahs: rangeAyahs, timestamp: '2026-06-11T00:00:00.000Z' }
)
assert.ok(omissionResult.missingWords.some(item => item.word === 'هو'))
assert.ok(omissionResult.skippedWords.some(group => group.words.includes('هو')))
assert.ok(omissionResult.mistakes.wordSkips.some(group => group.words.includes('هو')))
assert.equal(omissionResult.verseJumpDetected, false)

const extraResult = buildDeterministicRecitationResult(
  rangeText,
  createWordsFromTranscript('قل هو الله أحد الرحمن الله الصمد لم يلد ولم يولد'),
  { targetAyahs: rangeAyahs, timestamp: '2026-06-11T00:00:00.000Z' }
)
assert.ok(extraResult.extraWords.some(item => item.word === 'الرحمن'))

const substitutionResult = buildDeterministicRecitationResult(
  rangeText,
  createWordsFromTranscript('قل هو الله واحد الله الصمد لم يلد ولم يولد'),
  { targetAyahs: rangeAyahs, timestamp: '2026-06-11T00:00:00.000Z' }
)
assert.ok(substitutionResult.incorrectWords.some(item => item.expected === 'أحد' && item.actual === 'واحد'))

const repeatedResult = buildDeterministicRecitationResult(
  rangeAyahs[0].text,
  createWordsFromTranscript('قل هو هو الله أحد قل هو قل هو'),
  { targetAyahs: [rangeAyahs[0]], timestamp: '2026-06-11T00:00:00.000Z' }
)
assert.ok(repeatedResult.repeatedWords.some(item => item.normalizedWord === 'هو'))
assert.ok(repeatedResult.repeatedPhrases.some(item => item.phrase === 'قل هو'))

const skippedAyahResult = buildDeterministicRecitationResult(
  rangeText,
  createWordsFromTranscript('قل هو الله أحد لم يلد ولم يولد'),
  { targetAyahs: rangeAyahs, timestamp: '2026-06-11T00:00:00.000Z' }
)
assert.ok(skippedAyahResult.skippedAyahs.some(item => item.ayahKey === '112:2'))
assert.ok(skippedAyahResult.mistakes.skippedAyahs.some(item => item.ayahKey === '112:2'))
assert.equal(skippedAyahResult.verseJumpDetected, true)
assert.ok(skippedAyahResult.verseJumps.length > 0)
assert.ok(skippedAyahResult.mistakes.verseJumps.length > 0)
assert.ok(skippedAyahResult.score < 80)

const sequenceResult = buildDeterministicRecitationResult(
  rangeText,
  createWordsFromTranscript('الله الصمد قل هو الله أحد لم يلد ولم يولد'),
  { targetAyahs: rangeAyahs, timestamp: '2026-06-11T00:00:00.000Z' }
)
assert.ok(sequenceResult.sequenceErrors.length > 0)
assert.ok(sequenceResult.feedback.some(item => /sequence/i.test(item) || /order/i.test(item)))

assert.equal(typeof sequenceResult.score, 'number')
assert.equal(typeof sequenceResult.confidence, 'number')
assert.equal(typeof sequenceResult.memoryStrength, 'string')

console.log('Recitation replay determinism tests passed')
