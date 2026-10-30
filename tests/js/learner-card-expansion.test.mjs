import assert from 'node:assert/strict'
import {
  cardHasExpandableContent,
  isLearnerSubmitted,
  learnerHasInstruction,
  learnerNeedsCorrection,
  learnerRetryContextVisible,
  learnerShowCardProgress,
  resolveCardExpanded,
} from '../../resources/js/scripts/teacher/learnerCardExpansion.js'

const approved = {
  id: 1,
  status: 'completed',
  review_state: 'approved',
  completion_result: { accuracy_percent: 90 },
}

assert.equal(isLearnerSubmitted({ status: 'awaiting_confirmation' }), true)
assert.equal(learnerNeedsCorrection({ review_state: 'needs_correction' }), true)
assert.equal(learnerRetryContextVisible({ last_attempt: { attempt_number: 2 } }), true)
assert.equal(learnerRetryContextVisible(approved), false)

assert.equal(
  learnerShowCardProgress({ status: 'pending', progress: { completed: 1, target: 3 } }),
  true,
)
assert.equal(learnerShowCardProgress({ status: 'pending', progress: { completed: 0, target: 3 } }), false)

assert.equal(
  learnerHasInstruction({ status: 'pending', assignment: { feedback: ' Focus ghunnah ' } }),
  true,
)
assert.equal(learnerHasInstruction(approved), false)

assert.equal(cardHasExpandableContent(approved), true)
assert.equal(cardHasExpandableContent({ status: 'awaiting_confirmation' }), true)
assert.equal(
  cardHasExpandableContent({ status: 'completed', review_state: 'approved' }),
  false,
)

assert.equal(resolveCardExpanded(approved, {}), false)
assert.equal(resolveCardExpanded(approved, { expandedOverrides: { 1: true } }), true)
assert.equal(resolveCardExpanded({ review_state: 'needs_correction', id: 5 }), false)
assert.equal(
  resolveCardExpanded({ review_state: 'needs_correction', id: 5 }, { expandedOverrides: { 5: true } }),
  true,
)

console.log('learner-card-expansion.test.mjs: ok')
