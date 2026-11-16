import assert from 'node:assert/strict'
import { latestLearnerHomeFeedback, nextLearnerHomeTask, learnerHomeRevisions } from '../../resources/js/scripts/teacher/learnerHome.js'

const tasks = [
  { id: 1, status: 'pending', assignment: { due_at: '2026-11-20' } },
  { id: 2, status: 'pending', assignment: { due_at: '2026-11-18' } },
  { id: 3, status: 'awaiting_confirmation', review_state: 'submitted', assignment: { due_at: '2026-11-10' } },
  { id: 4, status: 'completed', review_state: 'approved', assignment: { due_at: '2026-11-09' } },
]
assert.equal(nextLearnerHomeTask(tasks).id, 2, 'Next practice is the earliest actionable due task')
assert.equal(nextLearnerHomeTask([...tasks, { id: 5, status: 'in_progress', review_state: 'needs_correction' }], new Date('2026-11-16T12:00:00')).id, 5, 'A teacher retry request takes priority')
assert.equal(nextLearnerHomeTask(tasks.slice(2)), null, 'Submitted and approved work is not presented as practice waiting')
assert.equal(nextLearnerHomeTask(null), null)
assert.deepEqual(tasks.map(task => task.id), [1, 2, 3, 4], 'Choosing an action leaves persisted task order unchanged')

const support = {
  assignments: tasks,
  direct_threads: [{ teacher_id: 6 }],
  learning: { feedback_inbox: [
    { id: 1, recipient_id: 1, created_at: '2026-11-13T12:00:00Z' },
    { id: 2, recipient_id: 99, teacher_id: 6, created_at: '2026-11-15T12:00:00Z' },
    { id: 3, teacher_id: 6, created_at: '2026-11-14T12:00:00Z' },
  ] },
}
assert.equal(latestLearnerHomeFeedback(support).id, 3, 'Latest feedback must resolve to a real conversation')
assert.equal(latestLearnerHomeFeedback({}), null)
console.log('Learner Home action and feedback selection passed')

const revisionTasks = [
  { id: 1, status: 'pending', assignment: { hifz_category: 'sabqi', surah_number: 1, ayah_start: 1, ayah_end: 7 } },
  { id: 2, status: 'pending', assignment: { hifz_category: 'sabqi', surah_number: 112, ayah_start: 1, ayah_end: 4 } },
  { id: 3, status: 'completed', review_state: 'approved', assignment: { hifz_category: 'sabqi' } },
]
const findings = [{ surah_number: 1, ayah_number: 1 }, { surah_number: 112, ayah_number: 2 }, { surah_number: 114, ayah_number: 1 }]
const revisions = learnerHomeRevisions(revisionTasks, findings, 1)
assert.deepEqual(revisions.map(row => row.key), ['task:2', 'ayah:114:1'], 'Home deduplicates the main task, revision tasks and overlapping AI findings')
assert.equal(revisions[0].task, revisionTasks[1], 'Starting revision retains the original recipient context')
assert.deepEqual(learnerHomeRevisions(null, null), [])

assert.equal(nextLearnerHomeTask([
  { id: 10, status: 'overdue', assignment: { due_at: '2026-11-15' } },
  { id: 11, status: 'in_progress', review_state: 'needs_correction', assignment: { due_at: '2026-11-20' } },
], new Date('2026-11-16T12:00:00')).id, 10, 'Overdue work precedes a future-dated correction request')
