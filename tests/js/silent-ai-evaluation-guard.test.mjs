import assert from 'node:assert/strict'
import {
  evaluateMemorisationSilently,
  runSilentAiEvaluation,
} from '../../resources/js/scripts/engine/silent_ai_evaluation.js'
import { RECITATION_ATTEMPT_CLASS } from '../../resources/js/scripts/audio/recitationAttemptGuard.js'

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

{
  memory.clear()
  const silence = evaluateMemorisationSilently({
    surah: 1,
    ayah: 1,
    noSpeech: true,
    transcript: '',
    committedWords: [],
    accuracyScore: 0,
    durationSeconds: 4,
    updateSpacedRepetition: true,
  })
  assert.equal(silence.validCheck, false)
  assert.equal(silence.attemptClass, RECITATION_ATTEMPT_CLASS.SILENCE_NO_SPEECH)
  assert.equal(silence.spacedRepetitionUpdated, false)
  assert.equal(silence.progress, null)
  assert.equal(silence.recallAccuracy, null)
}

{
  memory.clear()
  const provider = runSilentAiEvaluation({
    mode: 'memorisation',
    surah: 112,
    ayah: 1,
    updateSpacedRepetition: true,
    error: { response: { status: 503, data: { message: 'Speechmatics unavailable' } } },
    accuracyScore: 0,
  })
  assert.equal(provider.memorisation?.validCheck, false)
  assert.equal(provider.memorisation?.attemptClass, RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR)
  assert.equal(provider.memorisation?.spacedRepetitionUpdated, false)
}

{
  memory.clear()
  const validWrong = evaluateMemorisationSilently({
    surah: 112,
    ayah: 1,
    transcript: 'قل هو الله احد',
    committedWords: [
      { text: 'قل', confidence: 0.92, start: 0.2, end: 0.5 },
      { text: 'هو', confidence: 0.9, start: 0.5, end: 0.8 },
      { text: 'الله', confidence: 0.91, start: 0.8, end: 1.2 },
      { text: 'احد', confidence: 0.88, start: 1.2, end: 1.7 },
    ],
    durationSeconds: 6,
    accuracyScore: 20,
    wordStatuses: [
      { status: 'incorrect' },
      { status: 'incorrect' },
      { status: 'incorrect' },
      { status: 'incorrect' },
    ],
  })
  assert.equal(validWrong.validCheck, true)
  assert.equal(validWrong.attemptClass, RECITATION_ATTEMPT_CLASS.VALID_CHECK)
  assert.equal(validWrong.spacedRepetitionUpdated, true)
  assert.ok(validWrong.progress)
  assert.equal(validWrong.strength, 'needsPractice')
}

console.log('silent-ai-evaluation-guard.test.mjs: ok')
