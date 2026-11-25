import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  readLearnerMyLearningFilters,
  writeLearnerMyLearningFilters,
} from '../../resources/js/scripts/dashboard/learnerLearningView.js'
import { learnerWeeklyProgressFromAssignments, isLearnerTaskApproved } from '../../resources/js/scripts/teacher/learnerDashboard.js'

const section = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherSection.vue', import.meta.url), 'utf8')
const workspace = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherWorkspace.css', import.meta.url), 'utf8')

assert.match(section, /teacherMeta\(/)
assert.match(section, /detailAttempts\(/)
assert.match(section, /common\.continue/)
assert.match(section, /persistLearningFilters/)
assert.match(workspace, /min-height:\s*72px/)

const memory = {
  getItem: (key) => memory.store[key] ?? null,
  setItem: (key, value) => { memory.store[key] = value },
  store: {},
}
writeLearnerMyLearningFilters({ status: 'progress', due: 'overdue', category: 'all' }, memory)
assert.deepEqual(readLearnerMyLearningFilters(memory)?.status, 'progress')

const weekStart = new Date('2026-03-16T12:00:00')
const weekly = [
  { id: 1, status: 'completed', review_state: 'approved', teacher_approved_at: '2026-03-17T00:00:00', assignment: { due_at: '2026-03-18T00:00:00' } },
  { id: 2, status: 'awaiting_confirmation', review_state: 'submitted', student_submitted_at: '2026-03-17T00:00:00', assignment: { due_at: '2026-03-19T00:00:00' } },
  { id: 3, status: 'pending', assignment: { due_at: '2026-03-20T00:00:00' } },
]
const snapshot = learnerWeeklyProgressFromAssignments(weekly, isLearnerTaskApproved, weekStart)
assert.equal(snapshot.total, 3)
assert.equal(snapshot.done, 1, 'unapproved submissions stay out of weekly done totals')

console.log('phase2-student-my-learning.test.mjs: ok')