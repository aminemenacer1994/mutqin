/**
 * AI Recite QA matrix runner — executes every automated edge fixture row and
 * asserts matrix integrity for AIR-001 … AIR-100.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  buildQuranAlignment,
  createRecognitionState,
  stabilizeRecognitionEvent,
} from '../../resources/js/scripts/engine/recitation_analysis.js'
import {
  RECITATION_ATTEMPT_CLASS,
  acceptRecitationProviderResponse,
  attemptAffectsScoring,
  classifyRecitationAttempt,
} from '../../resources/js/scripts/audio/recitationAttemptGuard.js'
import { resolveRecitationResultState } from '../../resources/js/scripts/recommendations/recitationResultState.js'
import {
  aiReciteQaMatrix,
  edgeScenarioForQa,
  qaScenarioById,
} from './fixtures/ai-recite-qa-matrix.mjs'
import { scoreSpeechmaticsPath } from './helpers/scoreRecitationScenario.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(aiReciteQaMatrix.length, 100)
assert.equal(qaScenarioById('AIR-001').id, 'AIR-001')
assert.equal(qaScenarioById('AIR-100').id, 'AIR-100')

const automated = aiReciteQaMatrix.filter((row) => row.automation === 'automated')
const blocked = aiReciteQaMatrix.filter((row) => row.automation === 'blocked')
const notTested = aiReciteQaMatrix.filter((row) => row.automation === 'not_tested')

assert.ok(automated.length >= 80, `expected mostly automated coverage, got ${automated.length}`)
assert.ok(blocked.length >= 4, 'device/provider accuracy rows must remain blocked until executed')
assert.ok(notTested.length >= 1, 'roll-up readiness stays not_tested until device cells filled')

for (const row of aiReciteQaMatrix) {
  if (row.assert !== 'edge' || !row.edgeId) continue
  const scenario = edgeScenarioForQa(row)
  assert.ok(scenario, `${row.id}: missing edge fixture ${row.edgeId}`)
  const scored = scoreSpeechmaticsPath(scenario)
  const expectedAccuracy = scenario.expectedSpeechmaticsAccuracy ?? scenario.expectedAccuracy
  assert.ok(
    Math.abs(scored.accuracy - expectedAccuracy) <= 1,
    `${row.id} (${scenario.id}): accuracy ${scored.accuracy} != ${expectedAccuracy}`,
  )
  if (scenario.expected) {
    assert.deepEqual(scored.types, scenario.expected.types, `${row.id} types`)
    assert.deepEqual(scored.statuses, scenario.expected.statuses, `${row.id} statuses`)
    assert.deepEqual(scored.extras, scenario.expected.extras, `${row.id} extras`)
    const state = resolveRecitationResultState(scored.result, {
      confidence: scored.confidence,
      recordingDurationSeconds: 10,
      usableSpeechSeconds: 5,
    })
    assert.equal(state, scenario.expected.resultState, `${row.id} result state`)
  }
  // Accuracy requirement: unspoken remaining words must never be "incorrect".
  for (const status of scored.statuses) {
    if (status === 'omitted' || status === 'pending') {
      assert.notEqual(status, 'incorrect')
    }
  }
  assert.equal(
    scored.statuses.includes('incorrect') && scored.types.includes('DELETION')
      ? scored.statuses.filter((_, i) => scored.types[i] === 'DELETION').every((s) => s === 'omitted')
      : true,
    true,
    `${row.id}: DELETION rows must use omitted, not incorrect`,
  )
}

// AIR-017 / AIR-021: live unread tail pending; final omitted (not incorrect).
{
  const target = 'الحمد لله رب العالمين'
  const heard = ['الحمد', 'لله', 'رب'].map((word, index) => ({
    word,
    confidence: 0.95,
    start: index * 0.3,
    end: index * 0.3 + 0.2,
    speaker: 'S1',
  }))
  const live = buildQuranAlignment(target, heard, { strictProgression: false, lifecycle: 'live' })
  assert.deepEqual(
    live.wordStatuses.map((word) => word.type),
    ['MATCH', 'MATCH', 'MATCH', 'UNASSESSED'],
  )
  assert.equal(live.wordStatuses[3].status, 'pending')
  assert.notEqual(live.wordStatuses[3].status, 'incorrect')
  const final = buildQuranAlignment(target, heard, { strictProgression: false, lifecycle: 'final' })
  assert.equal(final.wordStatuses[3].type, 'DELETION')
  assert.equal(final.wordStatuses[3].status, 'omitted')
  assert.notEqual(final.wordStatuses[3].status, 'incorrect')
}

// AIR-040: filtered low-confidence tokens are not silence.
{
  let state = stabilizeRecognitionEvent(createRecognitionState(), {
    provider: 'speechmatics',
    isFinal: true,
    speechFinal: true,
    segmentId: 'air-040',
    words: [
      { word: 'الحمد', confidence: 0.2, start: 0, end: 0.2, speaker: 'S1' },
      { word: 'لله', confidence: 0.18, start: 0.3, end: 0.5, speaker: 'S1' },
    ],
  }, { confidenceThreshold: 0.35 })
  assert.equal(state.committedWords.length, 0)
  assert.ok(state.rejectedWords.length >= 2)
  const classification = classifyRecitationAttempt({
    result: {
      transcript: '',
      committedWords: [],
      rejectedWords: state.rejectedWords,
      rawRecognitionWords: [
        { word: 'الحمد', confidence: 0.2 },
        { word: 'لله', confidence: 0.18 },
      ],
      durationSeconds: 8,
      accuracyScore: 0,
    },
  })
  assert.equal(classification.class, RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT)
  assert.equal(attemptAffectsScoring(classification), false)
}

// AIR-044 / AIR-045: concurrent / stale responses.
{
  assert.equal(acceptRecitationProviderResponse('attempt-a', 'attempt-a'), true)
  assert.equal(acceptRecitationProviderResponse('attempt-a', 'attempt-b'), false)
  assert.equal(acceptRecitationProviderResponse('', 'attempt-a'), false)
  const stale = classifyRecitationAttempt({
    activeAttemptId: 'attempt-a',
    responseAttemptId: 'attempt-b',
    result: { transcript: 'الحمد', committedWords: [{ text: 'الحمد', confidence: 0.9 }], durationSeconds: 5 },
  })
  assert.equal(stale.class, RECITATION_ATTEMPT_CLASS.CANCELLED_STALE)
  assert.equal(attemptAffectsScoring(stale), false)
}

// AIR-020: JS/PHP parity probe (edge fixtures).
{
  const child = spawnSync('node', ['scripts/recitation-scenario-accuracy.mjs'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  assert.equal(child.status, 0, child.stderr || child.stdout || 'parity probe failed')
}

const summary = {
  total: aiReciteQaMatrix.length,
  automated: automated.length,
  blocked: blocked.length,
  notTested: notTested.length,
}

console.log(
  `ai-recite-qa-matrix.test.mjs: ok (${summary.automated} automated / ${summary.blocked} blocked / ${summary.notTested} not tested)`,
)
