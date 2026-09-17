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
const extras = result => Array.from(result.extraWords, word => String(word.type))

assert.deepEqual(types(align(words(['الحمد', 'لله', 'رب', 'العالمين']))), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
assert.deepEqual(types(align(words(['الحمد', 'لله', 'رب', 'الرحمن']))), ['MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION'])
assert.deepEqual(types(align(words(['الحمد', 'لله', 'العالمين']))), ['MATCH', 'MATCH', 'DELETION', 'MATCH'])
assert.deepEqual(extras(align(words(['الحمد', 'لله', 'العظيم', 'رب', 'العالمين']))), ['INSERTION'])
assert.deepEqual(extras(align(['الحمد', 'لله', 'لله', 'رب', 'العالمين'].map(word => ({ word, confidence: 0.95 })))), ['REPETITION'])

const correction = align([
  { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2 },
  { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5 },
  { word: 'الرحمن', confidence: 0.95, start: 0.6, end: 0.8 },
  { word: 'رب', confidence: 0.95, start: 1.5, end: 1.7 },
  { word: 'العالمين', confidence: 0.95, start: 1.8, end: 2.1 },
])
assert.ok(extras(correction).includes('SELF_CORRECTION'))
assert.deepEqual(types(correction), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])

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

assert.deepEqual(types(align(words(['رب', 'العالمين']))), ['DELETION', 'DELETION', 'MATCH', 'MATCH'])
assert.deepEqual(types(align(words(['الحمد', 'لله', 'رب']))), ['MATCH', 'MATCH', 'MATCH', 'DELETION'])
assert.deepEqual(extras(align(words(['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم']))), ['OUT_OF_RANGE', 'OUT_OF_RANGE'])

const drift = buildQuranAlignment('ا ب ت ث ج ح خ', words(['ا', 'ب', 'س', 'ش', 'ص', 'ح', 'خ']))
assert.deepEqual(types(drift), ['MATCH', 'MATCH', 'DIVERGENCE', 'DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'])

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
    { word: 'الحمد', confidence: 0.9, speaker: 'S1' },
    { word: 'مساء', confidence: 0.9, speaker: 'S2' },
  ],
})
assert.deepEqual(Array.from(diarizedState.committedWords, word => word.speaker), ['S1', 'S2'])

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

console.log('speechmatics-edge-scenarios.test.mjs: ok')
