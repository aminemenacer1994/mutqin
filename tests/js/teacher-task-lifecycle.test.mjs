import assert from 'node:assert/strict'
import {
  TASK_STATE,
  TASK_LIFECYCLE,
  resolveBaseTaskState,
  resolveTaskLifecycle,
  studentTaskMatchesFilter,
  summarizeStudentTaskCounts,
  taskIsOverdue,
} from '../../resources/js/scripts/teacher/taskState.js'

const yesterday = new Date(Date.now() - 2 * 86400000).toISOString()
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()

const notStarted = { status: 'pending', assignment: { due_at: nextWeek } }
const overdueOpen = { status: 'pending', assignment: { due_at: yesterday } }
const inProgress = { status: 'in_progress', started_at: yesterday, assignment: { due_at: nextWeek } }
const submitted = { status: 'awaiting_confirmation', student_submitted_at: yesterday, review_state: 'submitted', assignment: { due_at: yesterday } }
const needsReview = {
  ...submitted,
  evidence: { attempt_id: 9, audio: { available: true, url: '/audio' } },
}
const revision = { status: 'in_progress', review_state: 'needs_correction', student_submitted_at: yesterday, started_at: yesterday, assignment: { due_at: yesterday } }
const completedLate = { status: 'completed', review_state: 'approved', student_submitted_at: yesterday, assignment: { due_at: yesterday } }

assert.equal(resolveTaskLifecycle(notStarted), TASK_LIFECYCLE.NOT_STARTED)
assert.equal(resolveTaskLifecycle(overdueOpen), TASK_LIFECYCLE.NOT_STARTED)
assert.equal(taskIsOverdue(overdueOpen), true)
assert.equal(resolveTaskLifecycle(inProgress), TASK_LIFECYCLE.IN_PROGRESS)
assert.equal(resolveTaskLifecycle(submitted), TASK_LIFECYCLE.SUBMITTED)
assert.equal(resolveTaskLifecycle(needsReview), TASK_LIFECYCLE.NEEDS_REVIEW)
assert.equal(resolveTaskLifecycle(revision), TASK_LIFECYCLE.REVISION_REQUESTED)
assert.equal(resolveBaseTaskState(revision), TASK_STATE.NEEDS_CORRECTION)
assert.equal(resolveTaskLifecycle(completedLate), TASK_LIFECYCLE.COMPLETED)
assert.equal(taskIsOverdue(completedLate), false)
assert.equal(studentTaskMatchesFilter(needsReview, 'needs_review'), true)
assert.equal(studentTaskMatchesFilter(needsReview, 'submitted'), false)
assert.equal(studentTaskMatchesFilter(needsReview, 'overdue'), true)

const counts = summarizeStudentTaskCounts([notStarted, overdueOpen, inProgress, submitted, needsReview, revision, completedLate])
assert.equal(counts.all, 7)
assert.equal(counts.todo + counts.submitted + counts.needs_review + counts.completed, counts.all)
assert.equal(counts.needs_review, 1)
assert.equal(counts.submitted, 1)
assert.equal(counts.completed, 1)
assert.equal(counts.overdue, 4)


console.log('teacher-task-lifecycle.test.mjs: ok')
