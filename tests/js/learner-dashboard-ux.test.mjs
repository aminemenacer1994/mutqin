import assert from 'node:assert/strict'
import { formatLearnerDisplayDate } from '../../resources/js/utils/learnerDisplayDate.js'
import { formatIcuPluralMessage, pluralFormForCount } from '../../resources/js/utils/icuPluralFormat.js'
import {
  PRACTICE_THRESHOLD,
  buildAllTabList,
  completionAiScoreSummary,
  completionResultLink,
  completionScoreBand,
  isDueThisWeek,
  isLearnerSubmitted,
  isLearnerTaskApproved,
  learnerCompletedPerformanceLabel,
  learnerNeedsCorrection,
  learnerPrimaryActionKey,
  learnerTaskAttemptCount,
  learnerWeeklyProgressFromAssignments,
  practiceAgainVariant,
  sortAllTabAssignments,
  weeklyProgressPercent,
} from '../../resources/js/scripts/teacher/learnerDashboard.js'
import { buildUpcomingAssignments, shouldShowUpcomingPanel } from '../../resources/js/scripts/teacher/learnerUpcoming.js'

const t = (key, params = {}) => {
  if (key === 'common.relative.today') return 'Today'
  if (key === 'common.relative.yesterday') return 'Yesterday'
  if (key === 'teacher.learner_view_feedback') return 'View feedback'
  if (key === 'teacher.learner_view_results') return 'View results'
  if (key === 'teacher.learner_ai_score_band_good') return 'Good'
  if (key === 'teacher.learner_ai_score_band_excellent') return 'Excellent'
  if (key === 'teacher.learner_ai_score_band_needs_work') return 'Keep practising'
  if (key === 'teacher.learner_ai_score_perfect') return 'Perfect match'
  return `${key}:${JSON.stringify(params)}`
}

const fixedNow = new Date('2026-03-15T12:00:00.000Z')

assert.equal(formatLearnerDisplayDate('2026-03-15T08:00:00Z', t, 'en', fixedNow), 'Today')
assert.equal(formatLearnerDisplayDate('2026-03-14T08:00:00Z', t, 'en', fixedNow), 'Yesterday')
const older = formatLearnerDisplayDate('2026-03-10T08:00:00Z', t, 'en', fixedNow)
assert.match(older, /10/)
assert.doesNotMatch(older, /2026/)

const priorYear = formatLearnerDisplayDate('2025-03-10T08:00:00Z', t, 'en', fixedNow)
assert.match(priorYear, /2025/)

assert.equal(pluralFormForCount('ar', 1), 'one')
assert.equal(pluralFormForCount('ar', 2), 'two')

assert.equal(
  formatIcuPluralMessage('{n, plural, one {# active day} other {# active days}}', 'en', { n: 1 }),
  '1 active day',
)
assert.equal(
  formatIcuPluralMessage('{n, plural, one {# active day} other {# active days}}', 'en', { n: 3 }),
  '3 active days',
)
assert.equal(
  formatIcuPluralMessage(
    'Next: {surah} {ayahs} · due in {n, plural, one {# day} other {# days}}',
    'en',
    { surah: 'Al-Fatiha', ayahs: '1–7', n: 2 },
  ),
  'Next: Al-Fatiha 1–7 · due in 2 days',
)

assert.equal(pluralFormForCount('en', 1), 'one')

assert.equal(weeklyProgressPercent(2, 4), 50)
assert.equal(weeklyProgressPercent(4, 4), 100)
assert.equal(weeklyProgressPercent(0, 0), 0)

assert.equal(practiceAgainVariant(89, PRACTICE_THRESHOLD), 'primary')
assert.equal(practiceAgainVariant(90, PRACTICE_THRESHOLD), 'secondary')
assert.equal(practiceAgainVariant(null, PRACTICE_THRESHOLD), 'secondary')

const rows = [
  { id: 1, status: 'pending', assignment: { due_at: '2026-03-20T00:00:00Z' } },
  { id: 2, status: 'pending', assignment: { due_at: '2026-03-12T00:00:00Z' } },
  { id: 3, status: 'completed', teacher_approved_at: '2026-03-14T00:00:00Z' },
  { id: 4, status: 'completed', teacher_approved_at: '2026-03-01T00:00:00Z' },
  { id: 5, status: 'completed', teacher_approved_at: '2026-02-20T00:00:00Z' },
  { id: 6, status: 'completed', teacher_approved_at: '2026-02-10T00:00:00Z' },
]

const helpers = {
  isTeacherApproved: (row) => row.status === 'completed',
  isPending: (row) => row.status === 'pending',
}

const groups = sortAllTabAssignments(rows, helpers)
assert.deepEqual(groups.pending.map((row) => row.id), [2, 1])
assert.deepEqual(groups.completed.map((row) => row.id), [3, 4, 5, 6])

const allTab = buildAllTabList(groups, 3)
assert.deepEqual(allTab.items.map((row) => row.id), [2, 1, 3, 4, 5])
assert.equal(allTab.hiddenCompletedCount, 1)

assert.equal(completionResultLink(null, t), null)
assert.equal(completionResultLink({ feedback_snippet: 'Nice', has_recitation_review: true }, t).label, 'View feedback')
assert.equal(completionResultLink({ has_recitation_review: true }, t).label, 'View results')
assert.equal(completionResultLink({ has_recitation_review: true }, t).opensMistakeDetails, true)
assert.equal(completionResultLink({ feedback_snippet: ' ' }, t), null)

assert.equal(isDueThisWeek('2026-03-12T00:00:00Z', fixedNow), true)
assert.equal(isDueThisWeek('2026-03-01T00:00:00Z', fixedNow), false)

const weeklyRows = [
  { status: 'completed', review_state: 'approved', assignment: { due_at: '2026-03-12T00:00:00Z' } },
  { status: 'completed', review_state: 'approved', assignment: { due_at: '2026-03-13T00:00:00Z' } },
  { status: 'pending', assignment: { due_at: '2026-03-14T00:00:00Z' } },
  { status: 'pending', assignment: { due_at: '2026-04-01T00:00:00Z' } },
]

const weekly = learnerWeeklyProgressFromAssignments(weeklyRows, undefined, fixedNow)
assert.equal(weekly.done, 2)
assert.equal(weekly.total, 3)
assert.equal(weekly.percent, 67)

assert.equal(learnerPrimaryActionKey({ review_state: 'needs_correction' }), 'redo')

assert.equal(isLearnerTaskApproved({ status: 'completed', review_state: 'approved' }), true)
assert.equal(isLearnerTaskApproved({ status: 'awaiting_confirmation', review_state: 'submitted' }), false)
assert.equal(isLearnerSubmitted({ status: 'awaiting_confirmation', review_state: 'submitted' }), true)
assert.equal(
  isLearnerSubmitted({ status: 'in_progress', review_state: 'needs_correction' }),
  false,
)
assert.equal(learnerNeedsCorrection({ review_state: 'needs_correction' }), true)

assert.equal(completionScoreBand(100), 'high')
assert.equal(completionScoreBand(90), 'high')
assert.equal(completionScoreBand(88), 'mid')
assert.equal(completionScoreBand(65), 'low')

const upcomingRows = [
  { id: 1, status: 'pending', assignment: { due_at: '2026-03-20T00:00:00Z' } },
  { id: 2, status: 'pending', assignment: { due_at: '2026-03-22T00:00:00Z' } },
]
assert.equal(
  shouldShowUpcomingPanel([upcomingRows[0]], () => false, [], fixedNow),
  true,
)
assert.equal(shouldShowUpcomingPanel([upcomingRows[0]], () => false, [1]), false)
assert.equal(
  shouldShowUpcomingPanel(upcomingRows, (row) => row.status === 'completed', [1], fixedNow),
  true,
)
const upcomingOnlyFuture = buildUpcomingAssignments(upcomingRows, () => false, 3, {
  excludeTodoIds: [1],
  now: fixedNow,
})
assert.equal(upcomingOnlyFuture.length, 1)
assert.equal(upcomingOnlyFuture[0].id, 2)

const aiSummary = completionAiScoreSummary(
  { accuracy_percent: 88, attempt: { mistakes: [{}, {}] } },
  t,
  (key, count, params) => `${key}:${count}:${JSON.stringify(params)}`,
)
assert.equal(aiSummary.band, 'mid')
assert.match(aiSummary.label, /Good/)

assert.equal(learnerTaskAttemptCount({ progress: { activity_count: 2 } }), 2)
assert.equal(learnerTaskAttemptCount({ last_attempt: { attempt_number: 3 } }), 3)
assert.equal(learnerTaskAttemptCount({}), 0)

assert.equal(
  learnerCompletedPerformanceLabel(
    { completion_result: { accuracy_percent: 90 }, progress: { activity_count: 1 } },
    t,
  ),
  'teacher.learner_assignments_done_score:{"n":90}',
)

assert.equal(
  learnerCompletedPerformanceLabel({ progress: { activity_count: 1 } }, t),
  'teacher.learner_assignments_done_passed_first:{}',
)

console.log('learner-dashboard-ux.test.mjs: ok')
