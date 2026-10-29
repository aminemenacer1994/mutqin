import assert from 'node:assert/strict'
import { PRACTICE_THRESHOLD, practiceAgainVariant } from '../../resources/js/scripts/teacher/learnerDashboard.js'
import {
  attemptDeltaKind,
  attemptScoreDelta,
  buildTrendDisplay,
  practiceAgainGate,
  resolveAttemptsLeft,
  resolveMaxAttempts,
  resolveTaskAttempts,
  shouldShowAttemptTrend,
  trendAccessibleScoreList,
} from '../../resources/js/scripts/teacher/learnerTaskAttemptHistory.js'
import { formatIcuPluralMessage } from '../../resources/js/utils/icuPluralFormat.js'

const attemptsFive = [
  { n: 1, score: 60 },
  { n: 2, score: 70 },
  { n: 3, score: 75 },
  { n: 4, score: 80 },
  { n: 5, score: 88 },
  { n: 6, score: 90 },
]

assert.equal(shouldShowAttemptTrend([{ n: 1, score: 88 }], 3), false)
assert.equal(shouldShowAttemptTrend([{ n: 1, score: 70 }, { n: 2, score: 80 }], 3), true)
assert.equal(shouldShowAttemptTrend([{ n: 1, score: 70 }, { n: 2, score: 80 }], 1), false)

const trend = buildTrendDisplay(attemptsFive)
assert.deepEqual(trend.scores, [70, 75, 80, 88, 90])
assert.equal(trend.hiddenCount, 1)
assert.equal(trend.finalScore, 90)

assert.equal(attemptScoreDelta([{ score: 70 }, { score: 80 }, { score: 88 }]), 8)
assert.equal(attemptDeltaKind([{ score: 70 }, { score: 80 }]), 'up')
assert.equal(attemptDeltaKind([{ score: 80 }, { score: 77 }]), 'down')
assert.equal(attemptDeltaKind([{ score: 80 }, { score: 80 }]), 'same')

assert.equal(trendAccessibleScoreList([{ score: 70 }, { score: 80 }, { score: 88 }]), '70, 80, 88')

const stubRow = {
  max_attempts: 3,
  attempts_left: 1,
  attempts: [{ n: 1, score: 72, completed_at: '2026-03-01T10:00:00Z', has_recording: false }],
  last_attempt: { attempt_number: 1, accuracy_percent: 72 },
}
assert.equal(resolveMaxAttempts(stubRow), 3)
assert.equal(resolveAttemptsLeft(stubRow), 1)
assert.equal(resolveTaskAttempts(stubRow).length, 1)

const exhausted = { max_attempts: 2, attempts_left: 0, progress: { target: 2, activity_count: 2 } }
assert.equal(practiceAgainGate(exhausted).disabled, true)
assert.equal(practiceAgainGate({ attempts_left: 2 }).disabled, false)

assert.equal(practiceAgainVariant(89, PRACTICE_THRESHOLD), 'primary')
assert.equal(practiceAgainVariant(90, PRACTICE_THRESHOLD), 'secondary')

assert.equal(
  formatIcuPluralMessage('{n, plural, one {# attempt left} other {# attempts left}}', 'en', { n: 1 }),
  '1 attempt left',
)
assert.equal(
  formatIcuPluralMessage('{n, plural, one {# attempt left} other {# attempts left}}', 'en', { n: 4 }),
  '4 attempts left',
)

console.log('learner-task-attempt-history.test.mjs: ok')
