import assert from 'node:assert/strict'
import { resolveRecitationResultState } from '../../resources/js/scripts/recommendations/recitationResultState.js'
import { recitationEdgeScenarios, scenarioById } from './fixtures/recitation-edge-scenarios.mjs'
import { scoreSpeechmaticsPath } from './helpers/scoreRecitationScenario.mjs'

assert.equal(recitationEdgeScenarios.length, 16)
assert.equal(scenarioById('perfect_fatiha_fragment').id, 'perfect_fatiha_fragment')
assert.throws(() => scenarioById('does_not_exist'))

for (const scenario of recitationEdgeScenarios) {
  const scored = scoreSpeechmaticsPath(scenario)
  const expectedAccuracy = scenario.expectedSpeechmaticsAccuracy ?? scenario.expectedAccuracy
  assert.ok(
    Math.abs(scored.accuracy - expectedAccuracy) <= 1,
    `${scenario.id}: accuracy ${scored.accuracy} != ${expectedAccuracy}`,
  )
  if (scenario.expected) {
    assert.deepEqual(scored.types, scenario.expected.types, `${scenario.id} types`)
    assert.deepEqual(scored.statuses, scenario.expected.statuses, `${scenario.id} statuses`)
    assert.deepEqual(scored.extras, scenario.expected.extras, `${scenario.id} extras`)
    const state = resolveRecitationResultState(scored.result, {
      confidence: scored.confidence,
      recordingDurationSeconds: 10,
      usableSpeechSeconds: 5,
    })
    assert.equal(state, scenario.expected.resultState, `${scenario.id} result state`)
  }
}

console.log('recitation-edge-scenarios.test.mjs: ok')
