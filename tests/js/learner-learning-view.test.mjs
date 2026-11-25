import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  countDueWindows,
  countLearningBuckets,
  dueWindowForRow,
  filterLearningAssignments,
  learningCategory,
  learningCategoryCounts,
  learningStatusBucket,
  matchesDueWindow,
  readLearnerMyLearningFilters,
  writeLearnerMyLearningFilters,
} from '../../resources/js/scripts/dashboard/learnerLearningView.js'

const now = new Date('2026-03-15T12:00:00')

const rows = [
  { id: 1, status: 'pending', assignment: { activity: 'nazra', due_at: '2026-03-20T00:00:00' } },
  { id: 2, status: 'pending', assignment: { activity: 'hifz', hifz_category: 'sabaq', due_at: '2026-03-10T00:00:00' } },
  { id: 3, status: 'in_progress', started_at: '2026-03-14T00:00:00', assignment: { activity: 'tajweed', due_at: '2026-03-16T00:00:00' } },
  { id: 4, status: 'awaiting_confirmation', review_state: 'submitted', student_submitted_at: '2026-03-14T00:00:00', assignment: { activity: 'revision' } },
  { id: 5, status: 'completed', review_state: 'approved', teacher_approved_at: '2026-03-12T00:00:00', student_submitted_at: '2026-03-11T00:00:00', assignment: { activity: 'nazra' } },
  { id: 6, status: 'in_progress', review_state: 'needs_correction', assignment: { activity: 'hifz', hifz_category: 'sabqi', due_at: '2026-03-18T00:00:00' } },
]

assert.equal(learningStatusBucket(rows[0]), 'todo')
assert.equal(learningStatusBucket(rows[2]), 'progress')
assert.equal(learningStatusBucket(rows[3]), 'review')
assert.equal(learningStatusBucket(rows[4]), 'completed')
assert.equal(learningStatusBucket(rows[5]), 'todo', 'a correction stays actionable and is not awaiting review')
assert.equal(learningCategory(rows[0].assignment), 'nazra')
assert.equal(learningCategory(rows[1].assignment), 'hifz')
assert.equal(learningCategory(rows[2].assignment), 'tajweed')
assert.equal(learningCategory(rows[3].assignment), 'revision')

const counts = countLearningBuckets(rows)
assert.equal(counts.overview, 6)
assert.equal(counts.todo, 3)
assert.equal(counts.progress, 1)
assert.equal(counts.review, 1)
assert.equal(counts.completed, 1)
assert.equal(counts.history, 2)

assert.deepEqual(
  filterLearningAssignments([{ id: 1, status: 'pending', assignment: { activity: 'nazra', due_at: '2026-03-20T00:00:00' } }], { status: 'overview', now }).map((row) => row.id),
  [1],
  'overview keeps the next assignment when nothing is due immediately',
)

const todo = filterLearningAssignments(rows, { status: 'todo', now })
assert.deepEqual(todo.map((row) => row.id), [2, 6, 1], 'overdue work stays ahead of later to-do items')
assert.equal(filterLearningAssignments(rows, { status: 'review' }).some((row) => row.id === 4), true)
assert.equal(filterLearningAssignments(rows, { status: 'review' }).some((row) => row.id === 6), false)
assert.deepEqual(filterLearningAssignments(rows, { status: 'todo', category: 'hifz', now }).map((row) => row.id), [2, 6])
assert.equal(filterLearningAssignments(rows, { status: 'completed' })[0].id, 5)
assert.deepEqual(filterLearningAssignments(rows, { status: 'history' }).map((row) => row.id), [4, 5])
const authorised = [{ id: 8, status: 'pending', assignment: { activity: 'nazra' } }]
assert.equal(filterLearningAssignments(authorised, { status: 'todo', now }).some((row) => row.id === 4), false)
assert.equal(filterLearningAssignments([{ id: 8, status: 'pending' }, { id: 4, status: 'awaiting_confirmation', review_state: 'submitted' }], { status: 'todo' }).some((row) => row.status === 'awaiting_confirmation'), false)
assert.equal(filterLearningAssignments([{ id: 9, status: 'pending', teacher_access: false, assignment: { activity: 'hifz', due_at: '2026-03-10T00:00:00' } }], { status: 'todo', now }).length, 0)
assert.equal(filterLearningAssignments([{ id: 4, status: 'awaiting_confirmation', review_state: 'submitted', teacher_access: false, student_submitted_at: '2026-03-14T00:00:00' }], { status: 'review' }).length, 1)

const categories = learningCategoryCounts(rows, 'todo')
assert.equal(categories.nazra, 1)
assert.equal(categories.hifz, 2)
assert.equal(categories.all, 3)

assert.equal(dueWindowForRow(rows[1], now), 'overdue')
assert.equal(dueWindowForRow(rows[0], now), 'upcoming')
assert.equal(matchesDueWindow(rows[1], 'overdue', now), true)
assert.equal(countDueWindows(rows, { status: 'todo', now }).overdue, 1)

const section = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherSection.vue', import.meta.url), 'utf8')
assert.match(section, /secondaryDueFilters/)
assert.match(section, /learner-teacher__task-row/)
assert.match(section, /id === 'done'/)
assert.match(section, /activeFilter = 'completed'/)
assert.match(section, /\$emit\('start'/)
assert.match(section, /\$emit\('complete'/)
assert.match(section, /teacher\.view_submission/)
assert.match(section, /readLearnerMyLearningFilters/)
assert.match(section, /learner-assignment-modal__technical/)
assert.match(section, /assignmentStatusRationale/)
assert.doesNotMatch(section, /createAssignment|submitAssignment\(/)

const memory = {
  getItem: (key) => memory.store[key] ?? null,
  setItem: (key, value) => { memory.store[key] = value },
  store: {},
}
writeLearnerMyLearningFilters({ status: 'review', due: 'today', category: 'hifz' }, memory)
assert.deepEqual(readLearnerMyLearningFilters(memory), { status: 'review', due: 'today', category: 'hifz' })
writeLearnerMyLearningFilters({ status: 'invalid', due: 'nope' }, memory)
assert.deepEqual(readLearnerMyLearningFilters(memory), { status: 'todo', due: 'all', category: 'all' })

const dashboard = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
assert.match(dashboard, /setFilter\('done'\)/)

console.log('learner-learning-view.test.mjs: ok')
