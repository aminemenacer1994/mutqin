import assert from 'node:assert/strict'
import {
  buildUpcomingAssignments,
  dueDaysFromNow,
  shouldShowUpcomingPanel,
  upcomingTaskActionKey,
} from '../../resources/js/scripts/teacher/learnerUpcoming.js'

const fixedNow = new Date('2026-03-15T12:00:00.000Z')

assert.equal(dueDaysFromNow('2026-03-15T08:00:00Z', fixedNow), 0)
assert.equal(dueDaysFromNow('2026-03-18T00:00:00Z', fixedNow), 3)
assert.equal(dueDaysFromNow(null, fixedNow), null)

assert.equal(upcomingTaskActionKey({ status: 'pending' }), 'start')
assert.equal(upcomingTaskActionKey({ status: 'in_progress' }), 'review')
assert.equal(upcomingTaskActionKey({ progress: { resume_available: true } }), 'review')
assert.equal(upcomingTaskActionKey({ started_at: '2026-03-01T00:00:00Z' }), 'review')

const rows = [
  { id: 1, status: 'pending', assignment: { due_at: '2026-03-20T00:00:00Z' } },
  { id: 2, status: 'pending', assignment: { due_at: '2026-03-22T00:00:00Z' } },
  { id: 3, status: 'completed', assignment: { due_at: '2026-03-12T00:00:00Z' } },
]

assert.equal(
  shouldShowUpcomingPanel(rows, (row) => row.status === 'completed', [1], fixedNow),
  true,
)
const upcoming = buildUpcomingAssignments(rows, () => false, 3, {
  excludeTodoIds: [1],
  now: fixedNow,
})
assert.deepEqual(upcoming.map((row) => row.id), [2])

console.log('learner-upcoming.test.mjs: ok')
