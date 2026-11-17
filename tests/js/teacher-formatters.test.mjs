import assert from 'node:assert/strict'
import { assignmentAttemptHelp, assignmentPassageKey, assignmentProgressLabel, attentionReasonTags, ayahRangeLabel, formatTeacherWhen, issueLabel, practiceMinutes, studentStatus, teacherAttentionAction, teacherAttentionRank, teacherDeskCounts, teacherRecitationEvidenceRow } from '../../resources/js/scripts/teacher/formatters.js'

const t = (key, params = {}) => {
  if (key === 'teacher.ayahs_range') return `Ayahs ${params.from}–${params.to}`
  if (key === 'teacher.ayah_n') return `Ayah ${params.n}`
  if (key.startsWith('teacher.issue_')) return key.slice('teacher.issue_'.length)
  return key
}

assert.equal(practiceMinutes(null), null)
assert.equal(practiceMinutes(0), 0)
assert.equal(practiceMinutes(1), 1)
assert.equal(practiceMinutes(59), 1)
assert.equal(practiceMinutes(60), 1)
assert.equal(practiceMinutes(61), 2)
assert.equal(practiceMinutes(120), 2)
assert.equal(formatTeacherWhen('2026-10-28T12:00:00Z'), '28 Oct 2026')
assert.equal(ayahRangeLabel('Al-Fatihah', 1, 7, t), 'Al-Fatihah · Ayahs 1–7')
assert.equal(issueLabel({ wrong: 1, skipped: 0, extra: 0, repeated: 0 }, t), '1 missed')
assert.equal(issueLabel({ wrong: 0, skipped: 2, extra: 0, repeated: 1 }, t), '2 skipped · 1 repeated')
assert.equal(studentStatus({ sessions: 2, ai_success_rate: 99, recommendation: { type: 'insufficient_data' } }, t).key, 'practising')
assert.equal(studentStatus({ sessions: 2, recommendation: { type: 'ready_next', reason: 'Teacher assessed.' } }, t).key, 'strong')
assert.equal(studentStatus({ sessions: 2, recommendation: { type: 'focus', reason: 'Recurring finding.' } }, t).key, 'attention')

const tTeacher = (key, params = {}) => {
  if (key === 'teacher.needs_help_overdue_task_one') return '1 overdue task'
  if (key === 'teacher.needs_help_overdue_task_other') return `${params.n} overdue tasks`
  if (key === 'teacher.needs_help_review_due_other') return `${params.n} reviews due`
  if (key === 'teacher.needs_help_low_recitation') return `Low recitation score (${params.n}%)`
  return key
}
const tags = attentionReasonTags({
  assignments: { overdue: 2 },
  revision_overdue: 3,
  ai_success_rate: 50,
  recurring_weak: 1,
}, tTeacher)
assert.equal(tags[0].label, '2 overdue tasks')
assert.equal(tags[1].label, '3 reviews due')
assert.equal(tags[2].label, 'Low recitation score (50%)')

const waiting = {
  assignments: { awaiting_confirmation: 1, overdue: 2 },
  attention_awaiting_attempt_id: 44,
  attention_awaiting_recipient_id: 9,
}
const late = { assignments: { overdue: 1 }, attention_overdue_recipient_id: 12 }
assert.equal(teacherAttentionRank(waiting) < teacherAttentionRank(late), true)
assert.deepEqual(teacherAttentionAction(waiting, tTeacher), {
  id: 'review_recitation',
  label: 'teacher.overview_action_review',
  section: 'ai',
  focus: { attemptId: 44 },
})
assert.equal(teacherAttentionAction(late, tTeacher).focus.taskId, 12)
assert.equal(teacherAttentionAction({ repeated_absence: true }, tTeacher).section, 'messages')
assert.equal(assignmentProgressLabel({ assignment: { kind: 'ai_recite' }, progress: { target: 3, activity_count: 5, completed: 3 } }, tTeacher), 'teacher.assignment_progress_attempt_other')
assert.equal(assignmentAttemptHelp({ assignment: { kind: 'practice' } }, tTeacher), 'teacher.attempt_help_practice')

const drawerRow = teacherRecitationEvidenceRow({ title: 'Check' }, {
  transcript: 'hello',
  range: { surah: 1, from: 1, to: 7 },
  words: [{ ayah: 1, word_index: 0, status: 'incorrect' }],
  state: 'ready',
  transcript_state: 'available',
}, null)
assert.equal(drawerRow.range.surah, 1)
assert.equal(drawerRow.words.length, 1)
assert.equal(drawerRow.evidenceState, 'ready')

assert.deepEqual(teacherDeskCounts({}), { reviews: 0, overdue: 0, plans: 0 })
assert.deepEqual(teacherDeskCounts({
  assignments: { awaiting_confirmation: 2, overdue: 4 },
  kpis: { overdue_assignments: 4, open_recommendations: 1 },
}), { reviews: 2, overdue: 4, plans: 1 })
assert.equal(assignmentPassageKey({
  studentId: 9,
  assignment: { surah_number: 1, ayah_start: 1, ayah_end: 7, kind: 'ai_recite' },
}), '9:1:1:7:ai_recite')
assert.notEqual(assignmentPassageKey({
  studentId: 9,
  assignment: { surah_number: 1, ayah_start: 1, ayah_end: 7, kind: 'practice' },
}), '9:1:1:7:ai_recite')

console.log('teacher-formatters.test.mjs: ok')
