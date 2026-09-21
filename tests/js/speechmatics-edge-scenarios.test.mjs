import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON })
const cache = new Map()
async function loadModule(specifier, referrer = path.join(root, 'tests/js/speechmatics-edge-scenarios.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') ? '' : '.js'}`)
    : path.resolve(root, specifier)
  if (cache.has(resolved)) return cache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  cache.set(resolved, mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const engine = await loadModule('resources/js/scripts/engine/recitation_analysis.js')
const {
  buildQuranAlignment,
  buildRealtimePreviewAlignment,
  createRecognitionState,
  selectPrimaryReciterWords,
  stabilizeRecognitionEvent,
} = engine.namespace
const target = 'الحمد لله رب العالمين'
const words = (tokens, confidence = 0.95) => tokens.map((word, index) => ({
  word, confidence, start: index * 0.3, end: index * 0.3 + 0.2, speaker: 'S1',
}))
const align = (heard, options = {}) => buildQuranAlignment(target, heard, { strictProgression: false, ...options })
const types = result => Array.from(result.wordStatuses, word => String(word.type))
const fields = (result, key) => Array.from(result.wordStatuses, word => word[key])
const extras = result => Array.from(result.extraWords, word => String(word.type))

assert.deepEqual(types(align(words(['الحمد', 'لله', 'رب', 'العالمين']))), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.deepEqual(types(align(words(['الحمد', 'لله', 'رب', 'الرحمن']))), ['MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION'])
assert.deepEqual(types(align(words(['الحمد', 'لله', 'العالمين']))), ['MATCH', 'MATCH', 'DELETION', 'MATCH'])
const oneSkippedWord = align([
  { word: 'الحمد', confidence: 0.95, start: 0.0, end: 0.2, token: 'sm-0' },
  { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5, token: 'sm-1' },
  { word: 'العالمين', confidence: 0.91, start: 0.9, end: 1.2, token: 'sm-3' },
])
assert.equal(oneSkippedWord.wordStatuses[2].type, 'DELETION')
assert.equal(oneSkippedWord.wordStatuses[2].visualStatus, 'red')
assert.equal(oneSkippedWord.wordStatuses[2].highlight, 'red')
assert.equal(oneSkippedWord.wordStatuses[3].type, 'MATCH')
assert.equal(oneSkippedWord.wordStatuses[3].recognisedIndex, 2)
assert.equal(oneSkippedWord.wordStatuses[3].confidence, 0.91)
assert.equal(oneSkippedWord.wordStatuses[3].start, 0.9)
assert.equal(oneSkippedWord.wordStatuses[3].end, 1.2)
assert.equal(oneSkippedWord.scenarioCounts.skipped_words, 1)
assert.equal(oneSkippedWord.scenarioCounts.unresolved_mistakes, 1)

const twoSkippedWords = align(words(['الحمد', 'العالمين']))
assert.deepEqual(types(twoSkippedWords), ['MATCH', 'DELETION', 'DELETION', 'MATCH'])
assert.deepEqual(Array.from(twoSkippedWords.wordStatuses.slice(1, 3), word => word.visualStatus), ['red', 'red'])
assert.equal(twoSkippedWords.wordStatuses[3].recognisedIndex, 1)

const liveSkipped = align(words(['الحمد', 'لله', 'العالمين']), { lifecycle: 'live' })
assert.deepEqual(types(liveSkipped), ['MATCH', 'MATCH', 'UNASSESSED', 'MATCH'])
assert.equal(liveSkipped.wordStatuses[2].status, 'pending')
assert.equal(liveSkipped.wordStatuses[2].visualStatus, 'neutral')
assert.equal(liveSkipped.wordStatuses[2].highlight, 'neutral')
assert.equal(liveSkipped.wordStatuses[3].recognisedIndex, 2)
assert.equal(align(words(['الحمد', 'لله', 'العالمين'])).wordStatuses[2].type, 'DELETION')

const returnedAfterNextAyah = buildRealtimePreviewAlignment(
  'الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين',
  [
    ...['الحمد', 'لله', 'رب', 'العالمين'].map((word, index) => ({ word, confidence: 0.95, start: index * 0.3, end: index * 0.3 + 0.2 })),
    ...['مالك', 'يوم', 'الدين'].map((word, index) => ({ word, confidence: 0.95, start: 2 + index * 0.3, end: 2.2 + index * 0.3 })),
    ...['الرحمن', 'الرحيم', 'مالك', 'يوم', 'الدين'].map((word, index) => ({ word, confidence: 0.95, start: 4 + index * 0.3, end: 4.2 + index * 0.3 })),
  ],
  {
    lifecycle: 'live',
    strictProgression: true,
    lookahead: 0,
    exactSkipLookahead: 3,
    partialAdvances: true,
    advanceOnIncorrect: false,
    allowArticleMatch: true,
  },
)
assert.deepEqual(
  Array.from(returnedAfterNextAyah.wordStatuses, word => word.status),
  ['correct', 'correct', 'correct', 'correct', 'correct', 'correct', 'correct', 'correct', 'correct'],
  'going back to correct an ayah must not lock onto the following ayah',
)
const genuineSkip = buildRealtimePreviewAlignment(
  'الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين',
  ['الحمد', 'لله', 'رب', 'العالمين', 'مالك', 'يوم', 'الدين'].map((word, index) => ({
    word, confidence: 0.95, start: index * 0.3, end: index * 0.3 + 0.2,
  })),
  {
    lifecycle: 'live',
    strictProgression: true,
    lookahead: 0,
    exactSkipLookahead: 3,
    advanceOnIncorrect: false,
  },
)
assert.equal(genuineSkip.wordStatuses[4].status, 'pending')
assert.equal(genuineSkip.wordStatuses[6].status, 'correct')

const startsAtSecond = align(words(['لله', 'رب', 'العالمين']))
assert.deepEqual(types(startsAtSecond), ['DELETION', 'MATCH', 'MATCH', 'MATCH'])
assert.deepEqual(Array.from(startsAtSecond.wordStatuses, word => word.recognisedIndex), [null, 0, 1, 2])

const startsNearMiddle = buildQuranAlignment(
  'واحد اثنان ثلاثة اربعة خمسة ستة',
  words(['ثلاثة', 'اربعة', 'خمسة', 'ستة']),
  { strictProgression: false },
)
assert.deepEqual(types(startsNearMiddle), ['DELETION', 'DELETION', 'MATCH', 'MATCH', 'MATCH', 'MATCH'])

const ambiguousSingleAnchor = buildQuranAlignment(
  'الحمد رب لله رب العالمين',
  [{ word: 'رب', confidence: 0.4 }],
  { strictProgression: false },
)
assert.equal(ambiguousSingleAnchor.wordStatuses[0].type, 'UNASSESSED')
assert.equal(ambiguousSingleAnchor.wordStatuses.some(word => word.type === 'MATCH'), false)
assert.equal(ambiguousSingleAnchor.startingAnchor, null)

const strongStartingAnchor = align(words(['رب', 'العالمين']))
assert.deepEqual(types(strongStartingAnchor), ['DELETION', 'DELETION', 'MATCH', 'MATCH'])
assert.equal(strongStartingAnchor.startingAnchor.expectedIndex, 2)
assert.equal(strongStartingAnchor.startingAnchor.recognisedIndex, 0)
assert.equal(strongStartingAnchor.startingAnchor.length, 2)

const liveStartingAnchor = buildRealtimePreviewAlignment(
  target,
  words(['رب', 'العالمين']),
  { lifecycle: 'live', strictProgression: false },
)
assert.deepEqual(Array.from(liveStartingAnchor.statuses, word => word.status), ['pending', 'pending', 'correct', 'correct'])
const finalStartingAnchor = align(words(['رب', 'العالمين']))
assert.deepEqual(Array.from(finalStartingAnchor.wordStatuses, word => word.status), ['omitted', 'omitted', 'correct', 'correct'])

const midStartThenRestart = align(words(['رب', 'العالمين', 'الحمد', 'لله', 'رب', 'العالمين']))
assert.deepEqual(types(midStartThenRestart), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.deepEqual(extras(midStartThenRestart), ['RESTART', 'RESTART'])

const oneInsertion = align(words(['الحمد', 'لله', 'العظيم', 'رب', 'العالمين']))
assert.deepEqual(extras(oneInsertion), ['INSERTION'])
assert.deepEqual(types(oneInsertion), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.equal(oneInsertion.extraWords[0].word, 'العظيم')
assert.equal(oneInsertion.extraWords[0].token, undefined)
assert.deepEqual(Array.from(oneInsertion.wordStatuses, word => word.recognisedIndex), [0, 1, 3, 4])
assert.equal(oneInsertion.wordStatuses[1].attachedErrorMarkers[0].word, 'العظيم')

const multipleInsertions = align(words(['الحمد', 'لله', 'العظيم', 'الرحمن', 'رب', 'العالمين']))
assert.deepEqual(extras(multipleInsertions), ['INSERTION', 'INSERTION'])
assert.deepEqual(types(multipleInsertions), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

const insertionWithMetadata = align([
  { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2, token: 'sm-0', provider: 'speechmatics' },
  { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5, token: 'sm-1', provider: 'speechmatics' },
  { word: 'العظيم', confidence: 0.95, start: 0.6, end: 0.8, token: 'sm-2', provider: 'speechmatics' },
  { word: 'رب', confidence: 0.95, start: 0.9, end: 1.1, token: 'sm-3', provider: 'speechmatics' },
  { word: 'العالمين', confidence: 0.95, start: 1.2, end: 1.4, token: 'sm-4', provider: 'speechmatics' },
])
assert.equal(insertionWithMetadata.extraWords[0].type, 'INSERTION')
assert.equal(insertionWithMetadata.extraWords[0].token, 'sm-2')
assert.equal(insertionWithMetadata.extraWords[0].start, 0.6)
assert.equal(insertionWithMetadata.extraWords[0].confidence, 0.95)

const lowConfidenceNoise = align([
  ...words(['الحمد', 'لله']),
  { word: 'العظيم', confidence: 0.4, token: 'low-2', start: 0.6, end: 0.8 },
  ...words(['رب', 'العالمين']).map((word, index) => ({ ...word, start: 0.9 + (index * 0.3), end: 1.1 + (index * 0.3) })),
])
assert.ok(lowConfidenceNoise.extraWords.every(word => word.type !== 'INSERTION'))
assert.equal(lowConfidenceNoise.extraWords[0].token, 'low-2')
assert.deepEqual(types(lowConfidenceNoise), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
const lowConfidenceResult = engine.namespace.buildDeterministicRecitationResult(
  target,
  lowConfidenceNoise.committedWords,
  { strictProgression: false },
)
assert.equal(lowConfidenceResult.accuracyScore, 100)
assert.equal(lowConfidenceResult.mistakes.extra.length, 0)
assert.deepEqual(extras(align(['الحمد', 'لله', 'لله', 'رب', 'العالمين'].map(word => ({ word, confidence: 0.95 })))), ['REPETITION'])

const repeatedSingleWord = align([
  { word: 'الحمد', confidence: 0.93, start: 0.0, end: 0.2, token: 'sm-0' },
  { word: 'لله', confidence: 0.91, start: 0.3, end: 0.5, token: 'sm-1' },
  { word: 'لله', confidence: 0.88, start: 1.4, end: 1.6, token: 'sm-2' },
  { word: 'رب', confidence: 0.94, start: 1.7, end: 1.9, token: 'sm-3' },
  { word: 'العالمين', confidence: 0.96, start: 2.0, end: 2.3, token: 'sm-4' },
])
assert.deepEqual(types(repeatedSingleWord), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.equal(repeatedSingleWord.extraWords[0].type, 'REPETITION')
assert.equal(repeatedSingleWord.extraWords[0].highlight, 'amber')
assert.equal(repeatedSingleWord.extraWords[0].start, 1.4)
assert.equal(repeatedSingleWord.extraWords[0].end, 1.6)
assert.equal(repeatedSingleWord.extraWords[0].confidence, 0.88)
assert.equal(repeatedSingleWord.extraWords[0].token, 'sm-2')
assert.equal(repeatedSingleWord.scenarioCounts.unresolved_mistakes, 0)

const repeatedShortPhrase = buildQuranAlignment(
  'الحمد لله رب العالمين الرحمن الرحيم',
  ['الحمد', 'لله', 'لله', 'رب', 'رب', 'العالمين', 'الرحمن', 'الرحيم'].map((word, index) => ({
    word,
    confidence: 0.95,
    start: index,
    end: index + 0.2,
  })),
  { strictProgression: false },
)
assert.deepEqual(extras(repeatedShortPhrase), ['REPETITION', 'REPETITION'])
assert.deepEqual(types(repeatedShortPhrase), ['MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.equal(repeatedShortPhrase.scenarioCounts.unresolved_mistakes, 0)

const repetitionContinuation = align([
  { word: 'الحمد', confidence: 0.95, start: 0.0, end: 0.2 },
  { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5 },
  { word: 'لله', confidence: 0.95, start: 1.4, end: 1.6 },
  { word: 'رب', confidence: 0.95, start: 1.7, end: 1.9 },
  { word: 'العالمين', confidence: 0.95, start: 2.0, end: 2.3 },
])
assert.deepEqual(Array.from(repetitionContinuation.wordStatuses, word => word.recognisedIndex), [0, 1, 3, 4])
assert.deepEqual(types(repetitionContinuation), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

let unstableDuplicate = stabilizeRecognitionEvent(createRecognitionState(), {
  provider: 'speechmatics',
  isFinal: false,
  segmentId: 'unstable-repeat',
  words: [
    { word: 'الحمد', confidence: 0.95, token: 'sm-hamd', start: 0, end: 0.2 },
    { word: 'لله', confidence: 0.95, token: 'sm-lillah', start: 0.3, end: 0.5 },
    { word: 'لله', confidence: 0.9, token: 'sm-lillah', start: 1.3, end: 1.5 },
  ],
})
unstableDuplicate = stabilizeRecognitionEvent(unstableDuplicate, {
  provider: 'speechmatics',
  isFinal: true,
  segmentId: 'unstable-repeat',
  words: [
    { word: 'الحمد', confidence: 0.95, token: 'sm-hamd', start: 0, end: 0.2 },
    { word: 'لله', confidence: 0.95, token: 'sm-lillah', start: 0.3, end: 0.5 },
    { word: 'لله', confidence: 0.9, token: 'sm-lillah', start: 1.3, end: 1.5 },
  ],
})
assert.deepEqual(Array.from(unstableDuplicate.committedWords, word => word.word), ['الحمد', 'لله'])
assert.equal(align(unstableDuplicate.committedWords).extraWords.some(word => word.type === 'REPETITION'), false)

const repetitionThenRealignment = buildQuranAlignment(
  'ا ب ت ث ج ح خ',
  ['ا', 'ب', 'ب', 'س', 'ش', 'ص', 'ح', 'خ'].map((word, index) => ({
    word,
    confidence: 0.95,
    start: index,
    end: index + 0.2,
  })),
  { strictProgression: false },
)
assert.equal(repetitionThenRealignment.extraWords[0].type, 'REPETITION')
assert.ok(types(repetitionThenRealignment).includes('DIVERGENCE'))
assert.ok(types(repetitionThenRealignment).includes('REALIGNMENT'))
assert.equal(repetitionThenRealignment.wordStatuses.at(-1).type, 'MATCH')

const correction = align([
  { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2 },
  { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5 },
  { word: 'الرحمن', confidence: 0.95, start: 0.6, end: 0.8 },
  { word: 'رب', confidence: 0.95, start: 1.5, end: 1.7 },
  { word: 'العالمين', confidence: 0.95, start: 1.8, end: 2.1 },
])
assert.ok(extras(correction).includes('SELF_CORRECTION'))
assert.deepEqual(types(correction), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.equal(correction.extraWords[0].rawWord, 'الرحمن')
assert.equal(correction.extraWords[0].correctedTargetWord, 'رب')
assert.equal(correction.extraWords[0].highlight, 'amber')
assert.equal(correction.scenarioCounts.unresolved_mistakes, 0)
assert.equal(correction.scenarioCounts.self_corrected_mistakes, 1)
assert.ok(correction.events.some(event => event.type === 'SELF_CORRECTION'))

const correctionPhrase = buildQuranAlignment(
  'الحمد لله رب العالمين الرحمن الرحيم',
  [
    { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2 },
    { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5 },
    { word: 'العظيم', confidence: 0.95, start: 0.6, end: 0.8 },
    { word: 'اللطيف', confidence: 0.95, start: 0.9, end: 1.1 },
    { word: 'رب', confidence: 0.95, start: 1.8, end: 2.0 },
    { word: 'العالمين', confidence: 0.95, start: 2.1, end: 2.4 },
    { word: 'الرحمن', confidence: 0.95, start: 2.5, end: 2.8 },
    { word: 'الرحيم', confidence: 0.95, start: 2.9, end: 3.2 },
  ],
  { strictProgression: false },
)
assert.deepEqual(Array.from(correctionPhrase.extraWords, word => word.type), ['SELF_CORRECTION', 'SELF_CORRECTION'])
assert.deepEqual(Array.from(correctionPhrase.events.find(event => event.type === 'SELF_CORRECTION').wrongTokens), ['العظيم', 'اللطيف'])
assert.deepEqual(Array.from(correctionPhrase.events.find(event => event.type === 'SELF_CORRECTION').correctedTargetWords), ['رب', 'العالمين', 'الرحمن', 'الرحيم'])
assert.equal(correctionPhrase.scenarioCounts.unresolved_mistakes, 0)
assert.equal(correctionPhrase.scenarioCounts.self_corrected_mistakes, 1)

const unresolvedCorrection = align(words(['الحمد', 'لله', 'الرحمن', 'العالمين']))
assert.equal(unresolvedCorrection.wordStatuses[2].type, 'SUBSTITUTION')
assert.equal(unresolvedCorrection.scenarioCounts.unresolved_mistakes, 1)
assert.equal(unresolvedCorrection.scenarioCounts.self_corrected_mistakes, 0)

const repeatedCorrectionCandidate = align([
  { word: 'الحمد', start: 0, end: 0.2 },
  { word: 'لله', start: 0.3, end: 0.5 },
  { word: 'لله', start: 1.4, end: 1.6 },
  { word: 'رب', start: 1.7, end: 1.9 },
  { word: 'العالمين', start: 2.0, end: 2.3 },
])
assert.equal(repeatedCorrectionCandidate.extraWords[0].type, 'REPETITION')
assert.equal(repeatedCorrectionCandidate.scenarioCounts.self_corrected_mistakes, 0)

const hesitation = align([
  { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2 },
  { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5 },
  { word: 'رب', confidence: 0.95, start: 2.1, end: 2.3 },
  { word: 'العالمين', confidence: 0.95, start: 2.4, end: 2.7 },
])
assert.ok(hesitation.events.some(event => event.type === 'HESITATION'))
assert.deepEqual(types(hesitation), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

const restart = align(words(['الحمد', 'لله', 'الحمد', 'لله', 'رب', 'العالمين']))
assert.ok(extras(restart).includes('RESTART'))
assert.deepEqual(types(restart), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.deepEqual(Array.from(restart.extraWords, word => word.heardIndex), [2, 3], 'restart keeps the original prefix green')
assert.deepEqual(Array.from(restart.extraWords, word => [word.restartStartIndex, word.restartEndIndex]), [[0, 1], [0, 1]])
assert.ok(restart.extraWords.every(word => word.highlight === 'amber'))
assert.equal(restart.events.filter(event => event.type === 'RESTART').length, 1)
assert.equal(restart.events[0].startTime, 0.6)
assert.ok(Math.abs(restart.events[0].endTime - 1.1) < 0.001)
assert.equal(restart.extraWords[0].startTime, 0.6)
assert.ok(Math.abs(restart.extraWords[1].endTime - 1.1) < 0.001)

const middleRestart = buildQuranAlignment('الحمد لله رب العالمين الرحمن الرحيم', words([
  'الحمد', 'لله', 'رب', 'العالمين',
  'رب', 'العالمين', 'الرحمن', 'الرحيم',
]), { strictProgression: false })
assert.deepEqual(types(middleRestart), ['MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.ok(middleRestart.extraWords.every(word => word.type === 'RESTART'))
assert.deepEqual(Array.from(middleRestart.extraWords, word => [word.restartStartIndex, word.restartEndIndex]), [[2, 3], [2, 3]])

const restartAfterHesitation = align([
  { word: 'الحمد', start: 0, end: 0.2 },
  { word: 'لله', start: 0.3, end: 0.5 },
  { word: 'الحمد', start: 2.0, end: 2.2 },
  { word: 'لله', start: 2.3, end: 2.5 },
  { word: 'رب', start: 2.6, end: 2.8 },
  { word: 'العالمين', start: 2.9, end: 3.2 },
])
assert.ok(restartAfterHesitation.events.some(event => event.type === 'RESTART'))
assert.ok(restartAfterHesitation.events.some(event => event.type === 'HESITATION'))

const deliberateRepetition = align([
  { word: 'الحمد', start: 0, end: 0.2 },
  { word: 'لله', start: 0.3, end: 0.5 },
  { word: 'لله', start: 1.6, end: 1.8 },
  { word: 'رب', start: 1.9, end: 2.1 },
  { word: 'العالمين', start: 2.2, end: 2.5 },
])
assert.deepEqual(extras(deliberateRepetition), ['REPETITION'])
assert.equal(extras(deliberateRepetition).includes('RESTART'), false)

const restartLive = align(words(['الحمد', 'لله', 'الحمد', 'لله']), { lifecycle: 'live' })
assert.ok(restartLive.events.some(event => event.type === 'RESTART'))
assert.deepEqual(types(restartLive), ['MATCH', 'MATCH', 'UNASSESSED', 'UNASSESSED'])
assert.equal(restartLive.wordStatuses.slice(2).every(word => word.status === 'pending'), true)
assert.equal(restartLive.wordStatuses.some(word => word.type === 'DELETION'), false)
assert.equal(restartLive.scenarioCounts.wrong_words, 0)
assert.equal(restartLive.scenarioCounts.skipped_words, 0)

const naturallyRepeatedTarget = buildQuranAlignment(
  'الحمد لله الحمد لله',
  words(['الحمد', 'لله', 'الحمد', 'لله']),
  { lifecycle: 'live', strictProgression: false },
)
assert.equal(naturallyRepeatedTarget.events.some(event => event.type === 'RESTART'), false)
assert.deepEqual(types(naturallyRepeatedTarget), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

assert.deepEqual(types(align(words(['رب', 'العالمين']))), ['DELETION', 'DELETION', 'MATCH', 'MATCH'])
assert.deepEqual(types(align(words(['الحمد', 'لله', 'رب']))), ['MATCH', 'MATCH', 'MATCH', 'DELETION'])
assert.deepEqual(extras(align(words(['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم']))), ['OUT_OF_RANGE', 'OUT_OF_RANGE'])

const drift = buildQuranAlignment('ا ب ت ث ج ح خ', words(['ا', 'ب', 'س', 'ش', 'ص', 'ح', 'خ']))
assert.deepEqual(types(drift), ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'])

const shortDrift = buildQuranAlignment('ا ب ت ث ج ح خ', words(['ا', 'ب', 'س', 'ش', 'ج', 'ح', 'خ']))
assert.deepEqual(types(shortDrift), ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH', 'MATCH'])
assert.equal(JSON.stringify(shortDrift.wordStatuses.slice(2, 4).map(word => [word.expectedIndex, word.recognisedIndex, word.actual])), JSON.stringify([
  [2, 2, 'س'],
  [3, 3, 'ش'],
]))
assert.equal(shortDrift.wordStatuses[4].visualStatus, 'green')

const unresolvedDrift = buildQuranAlignment('ا ب ت ث ج ح خ', words(['ا', 'ب', 'س', 'ش', 'ص']))
assert.ok(types(unresolvedDrift).includes('DIVERGENCE'))
assert.equal(types(unresolvedDrift).includes('REALIGNMENT'), false)
assert.deepEqual(types(unresolvedDrift).slice(2, 5), ['DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE'])
assert.equal(JSON.stringify(unresolvedDrift.wordStatuses.slice(2, 5).map(word => word.recognisedIndex)), JSON.stringify([2, 3, 4]))
assert.equal(unresolvedDrift.wordStatuses[6].type, 'DELETION')

const falseAnchor = buildQuranAlignment('ا ب ت ث ج ح خ د', words(['ا', 'ب', 'س', 'ج', 'ص', 'ح', 'خ', 'د']))
assert.equal(types(falseAnchor).includes('REALIGNMENT'), false)
assert.deepEqual(types(falseAnchor), ['MATCH', 'MATCH', 'DELETION', 'SUBSTITUTION', 'MATCH', 'MATCH', 'MATCH', 'MATCH'])

const driftWithHesitation = buildQuranAlignment('ا ب ت ث ج ح خ', [
  { word: 'ا', confidence: 0.95, start: 0, end: 0.2 },
  { word: 'ب', confidence: 0.95, start: 0.3, end: 0.5 },
  { word: 'س', confidence: 0.95, start: 0.6, end: 0.8 },
  { word: 'ش', confidence: 0.95, start: 0.9, end: 1.1 },
  { word: 'ص', confidence: 0.95, start: 1.2, end: 1.4 },
  { word: 'ح', confidence: 0.95, start: 3.0, end: 3.2 },
  { word: 'خ', confidence: 0.95, start: 3.3, end: 3.5 },
])
assert.ok(driftWithHesitation.events.some(event => event.type === 'HESITATION'))
assert.equal(driftWithHesitation.wordStatuses[5].type, 'REALIGNMENT')
assert.equal(driftWithHesitation.wordStatuses[5].visualStatus, 'green')

const driftSelfCorrection = buildQuranAlignment('ا ب ت ث ج ح خ', [
  { word: 'ا', confidence: 0.95, start: 0, end: 0.2 },
  { word: 'ب', confidence: 0.95, start: 0.3, end: 0.5 },
  { word: 'س', confidence: 0.95, start: 0.6, end: 0.8 },
  { word: 'ش', confidence: 0.95, start: 0.9, end: 1.1 },
  { word: 'ت', confidence: 0.95, start: 2.0, end: 2.2 },
  { word: 'ث', confidence: 0.95, start: 2.3, end: 2.5 },
  { word: 'ج', confidence: 0.95, start: 2.6, end: 2.8 },
  { word: 'ح', confidence: 0.95, start: 2.9, end: 3.1 },
  { word: 'خ', confidence: 0.95, start: 3.2, end: 3.4 },
])
assert.ok(driftSelfCorrection.events.some(event => event.type === 'SELF_CORRECTION'))
assert.equal(driftSelfCorrection.wordStatuses.some(word => word.type === 'DELETION'), false)
assert.deepEqual(types(driftSelfCorrection), ['MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH', 'MATCH'])

const lowConfidenceDrift = buildQuranAlignment('ا ب ت ث ج ح خ', [
  ...words(['ا', 'ب']),
  ...words(['س', 'ش', 'ص'], 0.2),
  ...words(['ح', 'خ']),
])
assert.equal(types(lowConfidenceDrift).includes('DIVERGENCE'), false)
assert.ok(types(lowConfidenceDrift).slice(2, 5).every(type => type === 'UNASSESSED' || type === 'DELETION'))

const fast = align(words(['الحمد', 'لله', 'رب', 'العالمين']).map((word, index) => ({ ...word, start: index * 0.08, end: index * 0.08 + 0.06 })))
assert.deepEqual(types(fast), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

const lowConfidenceCorrect = align(words(['الحمد', 'لله', 'رب', 'العالمين'], 0.12))
assert.deepEqual(types(lowConfidenceCorrect), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

const voiceVariation = align(words(['الحمد', 'لله', 'رب', 'العالمين']).map(word => ({
  ...word,
  voice_profile: 'must_be_ignored',
  accent_hint: 'must_be_ignored',
})))
assert.deepEqual(types(voiceVariation), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

const liveEarly = align(words(['الحمد', 'لله', 'رب']), { lifecycle: 'live' })
assert.deepEqual(types(liveEarly), ['MATCH', 'MATCH', 'MATCH', 'UNASSESSED'])
assert.equal(liveEarly.wordStatuses[3].status, 'pending')

const compound = align([
  { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2 },
  { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5 },
  { word: 'الرحمن', confidence: 0.95, start: 0.6, end: 0.8 },
  { word: 'رب', confidence: 0.95, start: 2.3, end: 2.5 },
  { word: 'العالمين', confidence: 0.95, start: 2.6, end: 2.9 },
])
assert.ok(extras(compound).includes('SELF_CORRECTION'))
assert.ok(compound.events.some(event => event.type === 'HESITATION'))

const background = selectPrimaryReciterWords([
  ...words(['الحمد', 'لله', 'رب', 'العالمين']).map(word => ({ ...word, speaker: 'S1' })),
  { word: 'مساء', confidence: 0.9, speaker: 'S2' },
  { word: 'الخير', confidence: 0.9, speaker: 'S2' },
], target)
assert.equal(background.reliable, true)
assert.equal(background.primarySpeaker, 'S1')
assert.equal(background.words.every(word => word.speaker === 'S1'), true)

const competing = selectPrimaryReciterWords([
  ...words(['الحمد', 'لله', 'رب', 'العالمين']).map(word => ({ ...word, speaker: 'S1' })),
  ...words(['هذا', 'صوت', 'تلفاز', 'واضح']).map(word => ({ ...word, speaker: 'S2' })),
], target)
assert.equal(competing.reliable, false)
assert.equal(competing.status, 'multiple_competing_speakers')

const diarizedState = stabilizeRecognitionEvent(createRecognitionState(), {
  provider: 'speechmatics',
  isFinal: true,
  segmentId: 'diarized-final',
  words: [
    { word: 'الحمد', confidence: 0.9, speaker: 'S1', token: 'sm-hamd', start: 0.1, end: 0.4 },
    { word: 'مساء', confidence: 0.9, speaker: 'S2' },
  ],
})
assert.deepEqual(Array.from(diarizedState.committedWords, word => word.speaker), ['S1', 'S2'])
assert.equal(diarizedState.committedWords[0].token, 'sm-hamd')
assert.equal(diarizedState.committedWords[0].start, 0.1)
assert.equal(diarizedState.committedWords[0].confidence, 0.9)

// Transcript-only envelopes and alternate final markers are valid inputs at
// the provider boundary; they must enter the same stabilizer as word results.
let transcriptOnlyState = stabilizeRecognitionEvent(createRecognitionState(), {
  provider: 'speechmatics',
  type: 'partial',
  transcript: 'الحمد لله',
  confidence: 0.9,
})
assert.deepEqual(Array.from(transcriptOnlyState.interimWords, word => word.word), ['الحمد', 'لله'])
transcriptOnlyState = stabilizeRecognitionEvent(transcriptOnlyState, {
  provider: 'speechmatics',
  speechFinal: true,
  transcript: 'الحمد لله',
  confidence: 0.9,
})
assert.deepEqual(Array.from(transcriptOnlyState.committedWords, word => word.word), ['الحمد', 'لله'])

const pendingBeforeEmptyFinal = stabilizeRecognitionEvent(createRecognitionState(), {
  provider: 'speechmatics',
  isFinal: false,
  segmentId: 'pending-empty-final',
  words: [{ word: 'رب', confidence: 0.9 }],
})
const pendingAfterEmptyFinal = stabilizeRecognitionEvent(pendingBeforeEmptyFinal, {
  provider: 'speechmatics',
  isFinal: true,
  segmentId: 'pending-empty-final',
  words: [],
})
assert.deepEqual(Array.from(pendingAfterEmptyFinal.interimWords, word => word.word), ['رب'])

const phraseAlignment = align(['الحمد لله', 'رب العالمين'])
const wordAlignment = align(['الحمد', 'لله', 'رب', 'العالمين'])
assert.deepEqual(types(phraseAlignment), types(wordAlignment), 'phrase-level entries are tokenized consistently')
assert.equal(phraseAlignment.transcript, wordAlignment.transcript)

const repetitionRestart = align(['الحمد', 'لله', 'لله', 'الحمد', 'لله', 'رب', 'العالمين'].map(word => ({ word, confidence: 0.95 })))
assert.ok(extras(repetitionRestart).includes('REPETITION'))
assert.ok(extras(repetitionRestart).includes('RESTART'))

const substitutionRecovery = buildQuranAlignment(
  'الحمد لله رب العالمين الرحمن',
  words(['الحمد', 'لله', 'رب', 'العظيم', 'الرحمن'])
)
assert.deepEqual(types(substitutionRecovery), ['MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION', 'MATCH'])

const fastSkip = align([
  { word: 'الحمد', confidence: 0.95, start: 0, end: 0.06 },
  { word: 'لله', confidence: 0.95, start: 0.07, end: 0.13 },
  { word: 'العالمين', confidence: 0.95, start: 0.14, end: 0.22 },
])
assert.deepEqual(types(fastSkip), ['MATCH', 'MATCH', 'DELETION', 'MATCH'])

const delays = await loadModule('resources/js/scripts/memorisationDetection/speechmaticsDelays.js')
const timing = await loadModule('resources/js/scripts/memorisationDetection/recitationTimingBuffer.js')
const audioGate = await loadModule('resources/js/scripts/audio/speechmaticsAudioGate.js')
const vocabulary = await loadModule('resources/js/scripts/speechmatics/quranVocabulary.js')
const {
  buildSpeechmaticsRecognitionUpdate,
  resolveAdaptiveSpeechmaticsDelays,
} = delays.namespace
const { estimateSessionRecitationPaceFactor } = timing.namespace
const { evaluateSpeechmaticsAudioGate, SPEECHMATICS_AUDIO_GATE } = audioGate.namespace
const { buildSpeechmaticsRecitationConfig } = vocabulary.namespace

function speechmaticsWords(tokens, confidence = 0.95, step = 0.3) {
  return tokens.map((word, index) => ({
    word,
    confidence,
    start: index * step,
    end: index * step + Math.min(0.2, step * 0.7),
    token: `sm-${index}`,
    speaker: 'S1',
  }))
}

async function alignSpeechmaticsPath(target, tokens, options = {}) {
  const { stabilizeThreshold = 0.35, ...alignmentOptions } = options
  let state = stabilizeRecognitionEvent(createRecognitionState(), {
    provider: 'speechmatics',
    isFinal: true,
    speechFinal: true,
    segmentId: `ayah-drift-${tokens.length}`,
    words: tokens,
  }, { confidenceThreshold: stabilizeThreshold })
  const selected = selectPrimaryReciterWords(state.committedWords, target)
  assert.equal(selected.reliable, true, 'single reciter stays assessable')
  return buildQuranAlignment(target, selected.words, { strictProgression: false, ...alignmentOptions })
}

// 1:1 heard drift into 1:3, then a two-word return to رب العالمين.
{
  const drifted = await alignSpeechmaticsPath(
    'الحمد لله رب العالمين',
    speechmaticsWords(['الرحمن', 'الرحيم', 'رب', 'العالمين']),
  )
  assert.deepEqual(types(drifted), ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'])
  assert.deepEqual(fields(drifted, 'visualStatus'), ['red', 'red', 'green', 'green'])
  assert.deepEqual(fields(drifted, 'highlight'), ['red', 'red', 'green', 'green'])
  assert.deepEqual(fields(drifted, 'recognisedIndex'), [0, 1, 2, 3])
  assert.equal(drifted.wordStatuses[2].status, 'correct')
  assert.equal(drifted.wordStatuses[3].status, 'correct')
  assert.equal(drifted.scenarioCounts.divergence_events, 2)
  assert.equal(types(drifted).includes('SUBSTITUTION'), false)
  assert.equal(types(drifted).includes('DELETION'), false)
}

// Left 1:1 into a similar phrase, then returned. Drift is not a substitution cascade.
{
  const leftAndReturned = await alignSpeechmaticsPath(
    'الحمد لله رب العالمين الرحمن الرحيم',
    speechmaticsWords(['الحمد', 'لله', 'مالك', 'الدين', 'الرحمن', 'الرحيم']),
  )
  assert.deepEqual(types(leftAndReturned), ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'])
  assert.equal(leftAndReturned.wordStatuses[4].visualStatus, 'green')
  assert.equal(leftAndReturned.wordStatuses[4].highlight, 'green')
  assert.equal(leftAndReturned.wordStatuses[5].type, 'MATCH')
  assert.equal(leftAndReturned.wordStatuses[5].visualStatus, 'green')
  assert.equal(leftAndReturned.scenarioCounts.divergence_events, 2)
}

// Drift that never returns stays DIVERGENCE. The unread tail is pending live, DELETION only after final.
{
  const target = 'الحمد لله رب العالمين الرحمن الرحيم'
  const heard = speechmaticsWords(['الحمد', 'لله', 'مالك', 'يوم', 'الدين'])
  const live = await alignSpeechmaticsPath(target, heard, { lifecycle: 'live' })
  const finalised = await alignSpeechmaticsPath(target, heard)
  assert.deepEqual(types(live).slice(0, 5), ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE'])
  assert.equal(live.wordStatuses[5].type, 'UNASSESSED')
  assert.equal(live.wordStatuses[5].status, 'pending')
  assert.equal(live.wordStatuses[5].visualStatus, 'neutral')
  assert.equal(types(live).includes('DELETION'), false)
  assert.equal(types(live).includes('REALIGNMENT'), false)
  assert.deepEqual(types(finalised).slice(0, 5), ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE'])
  assert.equal(finalised.wordStatuses[5].type, 'DELETION')
  assert.equal(finalised.wordStatuses[5].visualStatus, 'red')
  assert.equal(types(finalised).includes('REALIGNMENT'), false)
}

// 1:2 heard the opening of 1:1, then realigned on الرحمن الرحيم.
{
  const realigned = await alignSpeechmaticsPath(
    'رب العالمين الرحمن الرحيم',
    speechmaticsWords(['الحمد', 'لله', 'الرحمن', 'الرحيم']),
  )
  assert.deepEqual(types(realigned), ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'])
  assert.equal(realigned.wordStatuses[2].visualStatus, 'green')
  assert.equal(realigned.wordStatuses[2].highlight, 'green')
  assert.equal(realigned.wordStatuses[2].recognisedIndex, 2)
  assert.equal(realigned.wordStatuses[3].type, 'MATCH')
  assert.equal(realigned.wordStatuses[3].visualStatus, 'green')
  assert.equal(realigned.scenarioCounts.divergence_events, 2)
}

// 112:1 heard 112:2, then returned on الله أحد.
{
  const ikhlas = await alignSpeechmaticsPath(
    'قل هو الله أحد',
    speechmaticsWords(['الله', 'الصمد', 'الله', 'أحد']),
  )
  assert.deepEqual(types(ikhlas), ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'])
  assert.deepEqual(fields(ikhlas, 'recognisedIndex'), [0, 1, 2, 3])
  assert.equal(ikhlas.wordStatuses[2].visualStatus, 'green')
  assert.equal(ikhlas.wordStatuses[3].status, 'correct')
  assert.equal(ikhlas.scenarioCounts.divergence_events, 2)
}

// One shared الله is not a two-word return anchor.
{
  const falseAllah = await alignSpeechmaticsPath(
    'قل هو الله أحد',
    speechmaticsWords(['قل', 'هو', 'الصمد', 'الله']),
  )
  assert.equal(types(falseAllah).includes('REALIGNMENT'), false)
  assert.ok(types(falseAllah).filter(type => type === 'MATCH').length < 4)
}

{
  const lowConfidenceDrift = await alignSpeechmaticsPath(
    'الحمد لله رب العالمين',
    [
      ...speechmaticsWords(['الحمد', 'لله']),
      ...speechmaticsWords(['الرحمن', 'الرحيم'], 0.2).map((word, index) => ({
        ...word,
        start: 0.8 + index * 0.3,
        end: 1.0 + index * 0.3,
        token: `low-${index}`,
      })),
    ],
    { stabilizeThreshold: 0.1 },
  )
  assert.equal(types(lowConfidenceDrift).includes('DIVERGENCE'), false)
  assert.ok(types(lowConfidenceDrift).slice(2).every(type => type === 'UNASSESSED' || type === 'DELETION'))
}

{
  const corrected = await alignSpeechmaticsPath('الحمد لله رب العالمين', [
    { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2, token: 'a', speaker: 'S1' },
    { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5, token: 'b', speaker: 'S1' },
    { word: 'الرحمن', confidence: 0.95, start: 0.6, end: 0.8, token: 'c', speaker: 'S1' },
    { word: 'الرحيم', confidence: 0.95, start: 0.9, end: 1.1, token: 'd', speaker: 'S1' },
    { word: 'رب', confidence: 0.95, start: 2.0, end: 2.2, token: 'e', speaker: 'S1' },
    { word: 'العالمين', confidence: 0.95, start: 2.3, end: 2.5, token: 'f', speaker: 'S1' },
  ])
  assert.ok(corrected.events.some(event => event.type === 'SELF_CORRECTION'))
  assert.equal(corrected.wordStatuses.some(word => word.type === 'DELETION'), false)
  assert.equal(corrected.scenarioCounts.unresolved_mistakes, 0)
  assert.deepEqual(types(corrected), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
}

{
  const fastWords = speechmaticsWords(['الحمد', 'لله', 'رب', 'العالمين'], 0.95, 0.07)
  assert.deepEqual(types(await alignSpeechmaticsPath('الحمد لله رب العالمين', fastWords)), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
  const pace = estimateSessionRecitationPaceFactor({ recognitionWords: fastWords })
  assert.ok(pace <= 0.82, `measured fast pace ${pace}`)
  const fastDelays = resolveAdaptiveSpeechmaticsDelays({ live: true, paceFactor: pace })
  const balancedDelays = resolveAdaptiveSpeechmaticsDelays({ live: true, paceFactor: 1 })
  const slowDelays = resolveAdaptiveSpeechmaticsDelays({ live: true, paceFactor: 1.4, tajweedHeavy: true })
  const fastUpdate = buildSpeechmaticsRecognitionUpdate(fastDelays)
  assert.equal(fastDelays.tier, 'fast')
  assert.equal(fastUpdate.message, 'SetRecognitionConfig')
  assert.equal(fastUpdate.transcription_config.max_delay, 0.7)
  assert.equal(fastUpdate.transcription_config.max_delay_mode, 'flexible')
  assert.ok(fastUpdate.transcription_config.conversation_config.end_of_utterance_silence_trigger >= 0.45)
  assert.ok(fastUpdate.transcription_config.conversation_config.end_of_utterance_silence_trigger <= 0.6)
  assert.ok(
    fastUpdate.transcription_config.conversation_config.end_of_utterance_silence_trigger
      < balancedDelays.endOfUtteranceSeconds,
  )
  assert.ok(slowDelays.endOfUtteranceSeconds > balancedDelays.endOfUtteranceSeconds)
  assert.ok(slowDelays.maxDelaySeconds <= 0.9)
  const fastSkipLive = await alignSpeechmaticsPath('الحمد لله رب العالمين', [
    { word: 'الحمد', confidence: 0.95, start: 0, end: 0.06, token: 'f0', speaker: 'S1' },
    { word: 'لله', confidence: 0.95, start: 0.07, end: 0.13, token: 'f1', speaker: 'S1' },
    { word: 'العالمين', confidence: 0.95, start: 0.14, end: 0.22, token: 'f2', speaker: 'S1' },
  ])
  assert.deepEqual(types(fastSkipLive), ['MATCH', 'MATCH', 'DELETION', 'MATCH'])
  const shortGap = await alignSpeechmaticsPath('الحمد لله رب العالمين', speechmaticsWords(
    ['الحمد', 'لله', 'رب', 'العالمين'],
    0.95,
    0.08,
  ))
  assert.equal(shortGap.events.some(event => event.type === 'HESITATION'), false)
  const held = await alignSpeechmaticsPath('الحمد لله رب العالمين', [
    { word: 'الحمد', confidence: 0.95, start: 0, end: 0.06, token: 'h0', speaker: 'S1' },
    { word: 'لله', confidence: 0.95, start: 0.14, end: 0.2, token: 'h1', speaker: 'S1' },
    { word: 'رب', confidence: 0.95, start: 1.7, end: 1.76, token: 'h2', speaker: 'S1' },
    { word: 'العالمين', confidence: 0.95, start: 1.84, end: 1.92, token: 'h3', speaker: 'S1' },
  ])
  assert.ok(held.events.some(event => event.type === 'HESITATION'))
  assert.deepEqual(types(held), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
}

{
  const session = await fs.readFile(path.join(root, 'resources/js/scripts/dashboardAiRecite/recordingSession.js'), 'utf8')
  const memorisation = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  const ask = await fs.readFile(path.join(root, 'resources/js/scripts/askMutqin/voiceSession.js'), 'utf8')
  const runtime = await fs.readFile(path.join(root, 'resources/js/scripts/memorisationRuntime.js'), 'utf8')
  const dashboard = await fs.readFile(path.join(root, 'resources/js/components/DashboardAiReciteModal.vue'), 'utf8')
  assert.match(session, /live:\s*true/)
  assert.match(session, /updateRecognitionDelays/)
  assert.doesNotMatch(session, /amdLive:\s*false/)
  assert.match(memorisation, /syncSpeechmaticsPaceDelays/)
  assert.match(memorisation, /updateRecognitionDelays/)
  assert.match(runtime, /SetRecognitionConfig/)
  assert.doesNotMatch(ask, /updateRecognitionDelays/)
  assert.match(ask, /Math\.max\(delays\.endOfUtteranceSeconds, 1\.8\)/)
  assert.match(dashboard, /evaluateSpeechmaticsAudioGate/)
  assert.match(dashboard, /createMemorisationAssessment/)
  assert.match(dashboard, /analysisRequestId/)
  assert.match(dashboard, /isCurrentAnalysis/)
  const gateBeforeSave = dashboard.indexOf('evaluateSpeechmaticsAudioGate')
  const saveCall = dashboard.indexOf('createMemorisationAssessment')
  assert.ok(gateBeforeSave >= 0 && gateBeforeSave < saveCall)
}

{
  const config = buildSpeechmaticsRecitationConfig({ language: 'ar', selectedText: 'الحمد لله رب العالمين' })
  assert.equal(config.language, 'ar')
  assert.equal(config.model, 'enhanced')
  assert.equal(config.diarization, 'speaker')
  assert.equal('output_locale' in config, false)
  assert.equal('additional_vocab' in config, false)
  const accented = await alignSpeechmaticsPath(
    'الحمد لله رب العالمين الصراط ملك',
    speechmaticsWords(['الحمد', 'لله', 'رب', 'العلمين', 'السراط', 'مالك']).map(word => ({
      ...word,
      voice_profile: 'egyptian',
      accent_hint: 'maghrebi',
      loudness: 0.9,
    })),
  )
  assert.deepEqual(types(accented), ['MATCH', 'MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION', 'MATCH'])
  assert.equal(accented.wordStatuses[4].visualStatus === 'green', false)
  const plain = buildQuranAlignment(
    'الحمد لله رب العالمين الصراط ملك',
    speechmaticsWords(['الحمد', 'لله', 'رب', 'العلمين', 'السراط', 'مالك']),
    { strictProgression: false },
  )
  assert.deepEqual(types(accented), types(plain))
  assert.deepEqual(fields(accented, 'visualStatus'), fields(plain, 'visualStatus'))
}

{
  assert.equal(SPEECHMATICS_AUDIO_GATE.minSnrDb, 4)
  assert.equal(SPEECHMATICS_AUDIO_GATE.maxClippingRatio, 0.08)
  assert.equal(evaluateSpeechmaticsAudioGate({ snr_db: 2.5 }).reason, 'heavy_noise')
  assert.equal(evaluateSpeechmaticsAudioGate({ rms: 0.003, peak: 0.01 }).reason, 'very_low_volume')
  assert.equal(evaluateSpeechmaticsAudioGate({ clipping_ratio: 0.12 }).reason, 'severe_clipping')
  assert.equal(evaluateSpeechmaticsAudioGate({ complete: false }).reason, 'broken_recording')
  assert.equal(evaluateSpeechmaticsAudioGate({ speech_ratio: 0.03 }).reason, 'insufficient_usable_speech')
  assert.equal(evaluateSpeechmaticsAudioGate({
    snr_db: 9,
    rms: 0.04,
    clipping_ratio: 0.002,
    speech_ratio: 0.5,
  }).reliable, true)
  const blocked = selectPrimaryReciterWords(
    speechmaticsWords(['الحمد']),
    'الحمد لله رب العالمين',
    { audioQualityMetrics: { snr_db: 2.5 } },
  )
  assert.equal(blocked.reliable, false)
  assert.equal(blocked.status, 'heavy_noise')
  assert.equal(blocked.words.length, 0)
  const kept = selectPrimaryReciterWords(
    speechmaticsWords(['الحمد', 'لله', 'رب', 'العالمين']),
    'الحمد لله رب العالمين',
    { audioQualityMetrics: { snr_db: 2.5, rms: 0.004, peak: 0.02, speech_ratio: 0.04 } },
  )
  assert.equal(kept.reliable, true)
  assert.equal(kept.words.length, 4)
  const quiet = selectPrimaryReciterWords(
    speechmaticsWords(['الحمد', 'لله', 'رب', 'العالمين']),
    'الحمد لله رب العالمين',
    { audioQualityMetrics: { snr_db: 9, rms: 0.04, peak: 0.2, clipping_ratio: 0.002, speech_ratio: 0.5 } },
  )
  assert.equal(quiet.reliable, true)
  assert.equal(quiet.words.length, 4)
}

console.log('speechmatics-edge-scenarios.test.mjs: ok')
