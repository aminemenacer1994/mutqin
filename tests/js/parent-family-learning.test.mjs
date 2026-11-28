import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_LEARNING_FILTERS,
  hasLearningFiltersActive,
  homeworkDetailHasContent,
  homeworkDisplayStatusClass,
  homeworkDisplayStatusKey,
  isLearningRowOverdue,
  passageTitleDirection,
  resetLearningFilters,
  sharedReviewedAssessment,
  publishedHomeworkFeedback,
  sortLearningRows,
  visibleAssignmentFeedback,
} from '../../resources/js/scripts/parent/familyLearning.js'

test('hasLearningFiltersActive respects defaults', () => {
  assert.equal(hasLearningFiltersActive(DEFAULT_LEARNING_FILTERS), false)
  assert.equal(hasLearningFiltersActive({ ...DEFAULT_LEARNING_FILTERS, status: 'overdue' }), true)
  assert.equal(hasLearningFiltersActive({ ...DEFAULT_LEARNING_FILTERS, activity: 'hifz' }), true)
  assert.equal(hasLearningFiltersActive({ ...DEFAULT_LEARNING_FILTERS, from: '2026-01-01' }), true)
})

test('resetLearningFilters returns a fresh copy', () => {
  const next = resetLearningFilters()
  next.status = 'completed'
  assert.equal(DEFAULT_LEARNING_FILTERS.status, 'all')
})

test('sortLearningRows prioritises overdue then nearest deadlines', () => {
  const sorted = sortLearningRows([
    { id: 1, display_status: 'in_progress', assignment: { due_at: '2026-12-01T12:00:00Z' } },
    { id: 2, display_status: 'overdue', assignment: { due_at: '2026-10-01T12:00:00Z' } },
    { id: 3, display_status: 'in_progress', assignment: { due_at: '2026-11-01T12:00:00Z' } },
  ])
  assert.deepEqual(sorted.map((row) => row.id), [2, 3, 1])
})

test('isLearningRowOverdue follows display_status', () => {
  assert.equal(isLearningRowOverdue({ display_status: 'overdue' }), true)
  assert.equal(isLearningRowOverdue({ display_status: 'completed' }), false)
})

test('homework status mapping helpers stay stable', () => {
  assert.equal(homeworkDisplayStatusKey('pending'), 'pending')
  assert.equal(homeworkDisplayStatusKey('awaiting_confirmation'), 'awaiting_confirmation')
  assert.equal(homeworkDisplayStatusClass('awaiting_confirmation'), 'is-wait')
  assert.equal(homeworkDisplayStatusClass('completed'), 'is-ok')
})

test('passageTitleDirection detects Arabic surah names', () => {
  assert.equal(passageTitleDirection('Al-Baqarah'), 'ltr')
  assert.equal(passageTitleDirection('البقرة'), 'rtl')
})

test('visibleAssignmentFeedback hides duplicates shared with reviewed assessment', () => {
  const row = {
    teacher_feedback: 'Steady pace.',
    latest_assessment: { source: 'teacher_reviewed', teacher_note: 'Steady pace.' },
  }
  assert.equal(visibleAssignmentFeedback(row), '')
  assert.ok(sharedReviewedAssessment(row))
})

test('sharedReviewedAssessment ignores automatic checks', () => {
  const row = {
    latest_assessment: { source: 'ai_prediction', word_match_percent: 88, teacher_note: '' },
  }
  assert.equal(sharedReviewedAssessment(row), null)
  assert.equal(homeworkDetailHasContent({ instructions: 'Read aloud.' }), true)
})

test('publishedHomeworkFeedback surfaces voice-only published notes', () => {
  const row = {
    published_feedback: { body: '', audio: { available: true, url: '/api/task-messages/9/audio' } },
  }
  assert.deepEqual(publishedHomeworkFeedback(row), row.published_feedback)
  assert.equal(homeworkDetailHasContent(row), true)
})