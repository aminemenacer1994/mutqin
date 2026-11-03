import assert from 'node:assert/strict'
import { buildQuranAlignment, createRecognitionState, stabilizeRecognitionEvent } from '../../resources/js/scripts/engine/recitation_analysis.js'
import { evaluateSpeechmaticsAudioGate } from '../../resources/js/scripts/audio/speechmaticsAudioGate.js'
import { reactive } from 'vue'
import { stableTranscriptionProvider } from '../../resources/js/scripts/speechmatics/providerIdentity.js'

const provider = {}
const componentState = reactive({ provider: stableTranscriptionProvider(provider) })
assert.equal(componentState.provider, provider, 'the active socket must retain identity through Vue reactivity')
assert.notEqual(componentState.provider, {}, 'a stale socket must not be accepted')

// These are transcript-level tests, not measurements of provider/audio accuracy.
for (const [expected, actual] of [['قال', 'قل'], ['والشمس', 'الشمس'], ['العالمين', 'عالمين'], ['عباد', 'عبد']]) {
  const result = buildQuranAlignment(expected, [{ word: actual, confidence: 0.98 }])
  assert.notEqual(result.wordStatuses[0].status, 'correct', `${expected} / ${actual} must not be silently equated`)
}
assert.equal(evaluateSpeechmaticsAudioGate({ rms: 0.1, peak: 0.3, speech_ratio: 0.8, snr_db: null }).reliable, true)

let state = createRecognitionState()
state = stabilizeRecognitionEvent(state, { provider: 'speechmatics', isFinal: true, segmentId: 'a', words: [{ word: 'الحمد', confidence: 0.95 }] })
const committed = state.committedWords
for (let i = 0; i < 1000; i++) {
  state = stabilizeRecognitionEvent(state, { provider: 'speechmatics', words: [{ word: 'لله', confidence: 0.4, provisional: true }] })
}
assert.equal(state.committedWords, committed, 'partials must not clone the entire committed transcript')
assert.ok(state.rawEvents.length <= 120, 'diagnostic event history must be bounded')
assert.equal(state.committedWords.length, 1)
const expected = 'قل هو الله أحد الله الصمد لم يلد'
const repeated = ['قل', 'هو', 'الله', 'أحد', 'قل', 'هو', 'الله', 'أحد', 'الله', 'الصمد', 'لم', 'يلد']
  .map((word, i) => ({ word, confidence: 0.95, start: i * 0.3, end: i * 0.3 + 0.2 }))
const repetition = buildQuranAlignment(expected, repeated)
assert.deepEqual(repetition.extraWords.map(word => word.recognisedIndex), [4, 5, 6, 7])
assert.equal(repetition.wordStatuses[4].recognisedIndex, 8)
const missing = buildQuranAlignment('قل هو الله أحد', ['قل', 'الله', 'أحد'].map(word => ({ word, confidence: 0.95 })))
assert.equal(missing.wordStatuses[1].highlight, 'black')
const wrongOpening = buildQuranAlignment('بسم الله الرحمن الرحيم', ['في', 'الله', 'الرحمن', 'الرحيم'].map(word => ({ word, confidence: 0.95 })))
assert.equal(wrongOpening.wordStatuses[0].type, 'SUBSTITUTION')
assert.equal(wrongOpening.transcript, 'في الله الرحمن الرحيم')
const uncertain = buildQuranAlignment('قل هو الله أحد', [
  { word: 'قل', confidence: 0.95 }, { word: 'هي', confidence: 0.2 },
  { word: 'الله', confidence: 0.95 }, { word: 'أحد', confidence: 0.95 },
])
assert.notEqual(uncertain.wordStatuses[1].type, 'DELETION')
assert.notEqual(uncertain.wordStatuses[1].status, 'incorrect')
console.log('recitation-audit-regressions: passed')
