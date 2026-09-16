import assert from 'node:assert/strict'
import { applyBackendAlignmentToResult } from '../../resources/js/scripts/memorisationDetection/backendAlignment.js'

const types = [
  ['MATCH', 'correct'],
  ['SUBSTITUTION', 'incorrect'],
  ['DELETION', 'incorrect'],
  ['DIVERGENCE', 'incorrect'],
  ['REALIGNMENT', 'correct'],
  ['UNASSESSED', 'pending'],
]

for (const [type, expectedStatus] of types) {
  const result = applyBackendAlignmentToResult({ wordStatuses: [{ status: 'incorrect' }] }, {
    accuracy: 75,
    confidence: 0.8,
    word_results: [{ type, displayText: 'رب', highlight: type === 'UNASSESSED' ? 'neutral' : 'green' }],
    alignment: { extra_words: [], events: [], scenario_counts: { [type]: 1 } },
  })
  assert.equal(result.wordStatuses[0].status, expectedStatus, type)
  assert.equal(result.backendFinalised, true)
}

const events = [{ type: 'HESITATION' }]
const extras = [
  { type: 'INSERTION' },
  { type: 'REPETITION' },
  { type: 'SELF_CORRECTION' },
  { type: 'RESTART' },
  { type: 'OUT_OF_RANGE' },
]
const mapped = applyBackendAlignmentToResult({}, {
  word_results: [{ type: 'MATCH', displayText: 'الحمد' }],
  alignment: { events, extra_words: extras, scenario_counts: { self_corrections: 1 } },
})
assert.deepEqual(mapped.alignmentEvents, events)
assert.deepEqual(mapped.extraWords, extras)
assert.equal(mapped.scenarioCounts.self_corrections, 1)

console.log('backend-alignment-handoff.test.mjs: ok')
