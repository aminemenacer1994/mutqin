import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterProgressHomeworkItems,
  lifetimeMetricRows,
  parentWeakPassages,
  periodMetricRows,
  progressHomeworkDueState,
  progressSummaryCards,
  progressSummaryLine,
  showAssignmentTrends,
  showWordingTrend,
  teacherReviewedAssessments,
} from '../../resources/js/scripts/parent/progressView.js'

const t = (key, vars = {}) => {
  const strings = {
    'parent.progress_simple': '{count} ayahs practised {when}.',
    'parent.progress_quiet': 'No practice in this period yet.',
    'parent.progress_when_week': 'this week',
    'parent.progress_when_month': 'this month',
    'parent.kpi_memorised': 'Memorised ayahs',
    'parent.kpi_practice': 'Recent practice',
    'parent.progress_current_learning': 'Current learning',
    'parent.progress_revision': 'Revision',
    'parent.learning_empty': 'No learning area has been set yet.',
    'parent.progress_none_yet': 'None yet',
    'parent.kpi_validated': 'Teacher confirmed',
    'parent.progress_coverage': '{n}% of the Qur\'an',
    'parent.progress_practice_hint': 'Ayahs logged {when}',
    'parent.progress_assignments': 'Homework completion',
    'parent.progress_trends_empty': 'No homework was due in this period.',
    'parent.progress_assignments_rate': '{n}% completed',
    'parent.progress_assignments_due_completed': '{due} due · {completed} finished',
    'parent.progress_suggests': 'The teacher suggests',
    'parent.progress_period_scope': 'period {when}',
    'parent.progress_assignments_missed_count': '{n} missed',
  }
  return strings[key]?.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? '')) ?? key
}

test('progress summary line respects window and counts', () => {
  assert.equal(progressSummaryLine(t, { practice_volume: { ayah_rows: 0 } }, 'week'), 'No practice in this period yet.')
  assert.equal(
    progressSummaryLine(t, { practice_volume: { ayah_rows: 3 } }, 'month'),
    '3 ayahs practised this month.',
  )
})

test('lifetime metrics stay factual without mastery claims', () => {
  const rows = lifetimeMetricRows(t, {
    coverage: {
      memorised_ayahs: 12,
      learning_ayahs: 2,
      reviewing_ayahs: 1,
      coverage_percent: 0.2,
      new_memorisation: { items: [{ surah_name: 'Al-Baqarah', ayah_start: 1, ayah_end: 1 }] },
    },
    validated_memorisation: { validated_ayahs: 5, ranges: { items: [] } },
  })
  assert.equal(rows.find((row) => row.key === 'memorised')?.value, 12)
  assert.equal(rows.some((row) => row.key === 'mastered'), false)
})

test('trend suppression uses minimum buckets', () => {
  assert.equal(showAssignmentTrends([{ due: 1, completed: 1, overdue: 0 }]), false)
  assert.equal(
    showAssignmentTrends([
      { due: 2, completed: 1, overdue: 0 },
      { due: 1, completed: 1, overdue: 0 },
    ]),
    true,
  )
})

test('wording trend requires comparable passages', () => {
  assert.equal(showWordingTrend({ comparable_passages: 1, direction: 'improving' }), false)
  assert.equal(showWordingTrend({ comparable_passages: 2, direction: 'improving' }), true)
  assert.equal(showWordingTrend({ comparable_passages: 3, direction: 'insufficient' }), false)
})

test('overview cards exclude lifetime memorisation', () => {
  const cards = progressSummaryCards(
    t,
    {
      coverage: { memorised_ayahs: 9 },
      practice_volume: { ayah_rows: 2 },
      assignment_completion: { due: 4, completed: 3, completion_percent: 75 },
    },
    'week',
  )
  assert.equal(cards.length, 2)
  assert.equal(cards[0].key, 'practice')
  assert.equal(cards[0].value, 2)
  assert.match(cards[0].hint, /this week/)
  assert.equal(cards[1].value, '75% completed')
  assert.equal(cards.some((card) => card.key === 'memorised'), false)
})

test('period homework empty state stays out of the metric value', () => {
  const rows = periodMetricRows(
    t,
    {
      practice_volume: { ayah_rows: 4 },
      assignment_completion: { due: 0, completed: 0 },
      recommendations: [],
    },
    'week',
  )
  assert.equal(rows[0].value, 4)
  assert.equal(rows[1]?.value, '—')
  assert.equal(rows[1]?.empty, true)
  assert.match(String(rows[1]?.hint), /No homework/)
})

test('teacher reviewed assessments filter ai-only rows', () => {
  const rows = teacherReviewedAssessments([
    { source: 'ai_prediction', word_match_percent: 80 },
    { source: 'teacher_reviewed', teacher_note: 'Well done', attempt_id: 1 },
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].attempt_id, 1)
})

test('homework filter and due state respect activity and deadlines', () => {
  const items = [
    { id: 1, activity: 'nazra', status: 'pending', due_at: '2020-01-01T00:00:00Z' },
    { id: 2, activity: 'hifz', status: 'completed', due_at: '2030-01-01T00:00:00Z' },
  ]
  assert.equal(filterProgressHomeworkItems(items, 'hifz').length, 1)
  assert.equal(progressHomeworkDueState(items[0]), 'overdue')
  assert.equal(progressHomeworkDueState(items[1]), 'completed')
})

test('weak passages require teacher-confirmed evidence', () => {
  const rows = parentWeakPassages([
    { id: 1, label: 'Al-Ikhlas · 1', count: 1 },
    { id: 2, label: 'Al-Ikhlas · 2', count: 2 },
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].count, 2)
})