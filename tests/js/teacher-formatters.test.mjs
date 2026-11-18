import assert from 'node:assert/strict'
import { assignmentAttemptHelp, assignmentCountLabel, assignmentPassageKey, assignmentProgressLabel, assignmentRequirementLabel, attentionReasonTags, ayahRangeLabel, formatTeacherWhen, issueLabel, practiceMinutes, studentStatus, teacherActionQueue, teacherAttentionAction, teacherAttentionRank, teacherDeskCounts, teacherRecitationEvidenceRow, teacherReviewLists, teacherReviewView } from '../../resources/js/scripts/teacher/formatters.js'
import { assignmentDisplayLabel } from '../../resources/js/scripts/teacher/taskTypes.js'

const t = (key, params = {}) => {
  if (key === 'teacher.ayahs_range') return `Ayahs ${params.from}–${params.to}`
  if (key === 'teacher.ayah_n') return `Ayah ${params.n}`
  if (key === 'teacher.issue_word_missed_one') return '1 missed'
  if (key === 'teacher.issue_word_missed') return `${params.n} missed`
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
assert.equal(assignmentProgressLabel({ assignment: { kind: 'ai_recite' }, progress: { target: 2, activity_count: 1, completed: 1 } }, tTeacher), 'teacher.assignment_progress_attempt_one')
assert.equal(assignmentProgressLabel({ assignment: { kind: 'practice' }, progress: { target: 2, activity_count: 1, completed: 1 } }, tTeacher), 'teacher.assignment_progress_repetitions')
assert.equal(assignmentAttemptHelp({ assignment: { kind: 'practice' } }, tTeacher), 'teacher.attempt_help_practice')
assert.equal(assignmentAttemptHelp({ assignment: { kind: 'ai_recite' } }, tTeacher), 'teacher.attempt_help_wording')
assert.equal(assignmentAttemptHelp({ assignment: {} }, tTeacher), 'teacher.attempt_help')
assert.equal(assignmentRequirementLabel({ kind: 'ai_recite' }, tTeacher), 'teacher.required_ai_wording_checks')
assert.equal(assignmentRequirementLabel({ kind: 'practice' }, tTeacher), 'teacher.repetitions')
assert.equal(assignmentCountLabel({ kind: 'ai_recite' }, 1, tTeacher), 'teacher.assignment_count_checks_one')
assert.equal(assignmentCountLabel({ kind: 'practice' }, 2, tTeacher), 'teacher.assignment_count_attempts_other')
assert.equal(assignmentDisplayLabel({ kind: 'ai_recite', activity: 'hifz', hifz_category: 'sabaq' }, tTeacher), 'teacher.activity_hifz · teacher.hifz_sabaq')
assert.equal(assignmentDisplayLabel({ kind: 'practice', activity: 'revision', hifz_category: 'sabqi' }, tTeacher), 'teacher.activity_revision')
assert.equal(assignmentDisplayLabel({ kind: 'ai_recite', activity: 'tajweed', hifz_category: 'sabqi' }, tTeacher), 'teacher.activity_tajweed')
assert.equal(assignmentDisplayLabel({ kind: 'ai_recite', hifz_category: 'manzil' }, tTeacher), 'teacher.task_type_recite')
assert.equal(assignmentDisplayLabel({ kind: 'practice', activity: 'nazra', hifz_category: 'sabqi' }, tTeacher), 'teacher.activity_nazra')

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

assert.deepEqual(teacherDeskCounts({}), {
  reviews: 0, recitations: 0, reviewedRecitations: 0, recitationHistory: 0, reviewsDueToday: 0, legacyRecitations: 0, overdue: 0, plans: 0, unread: 0,
})
assert.deepEqual(teacherDeskCounts({
  assignments: { awaiting_confirmation: 2, overdue: 4 },
  kpis: { overdue_assignments: 4, open_recommendations: 1 },
  snapshot: {
    recitations_awaiting_review: 5,
    reviewed_recitations: 3,
    recitation_history: 7,
    reviews_due_today: 1,
    legacy_ai_only_unreviewed: 7,
    overdue_tasks: 4,
    unread_messages: 2,
  },
}), {
  reviews: 2, recitations: 5, reviewedRecitations: 3, recitationHistory: 7, reviewsDueToday: 1, legacyRecitations: 7, overdue: 4, plans: 1, unread: 2,
})
assert.equal(teacherDeskCounts({
  review_queue: { actionable: [{ id: 1 }, { id: 2 }] },
  snapshot: { recitations_awaiting_review: 9 },
}).recitations, 2)
const classified = {
  review_queue: {
    actionable: [{ id: 1, review_status: 'awaiting' }],
    reviewed: [{ id: 2, review_status: 'reviewed' }],
    history: [{ id: 3, review_status: 'history' }, { id: 4, review_status: 'history' }],
  },
  snapshot: {
    recitations_awaiting_review: 9,
    reviewed_recitations: 9,
    recitation_history: 9,
    legacy_ai_only_unreviewed: 2,
  },
}
const classifiedCounts = teacherDeskCounts(classified)
assert.equal(classifiedCounts.recitations, teacherReviewLists(classified).awaiting.length)
assert.equal(classifiedCounts.reviewedRecitations, teacherReviewLists(classified).reviewed.length)
assert.equal(classifiedCounts.recitationHistory, teacherReviewLists(classified).history.length)
assert.equal(classifiedCounts.legacyRecitations, 2)
assert.deepEqual(teacherReviewView(classified, 'awaiting').map((row) => row.id), [1])
assert.deepEqual(teacherReviewView(classified, 'reviewed').map((row) => row.id), [2])
assert.deepEqual(teacherReviewView(classified, 'history').map((row) => row.id), [3, 4])
assert.deepEqual(teacherReviewView(classified, 'unknown').map((row) => row.id), [1])
assert.equal(assignmentPassageKey({
  studentId: 9,
  assignment: { surah_number: 1, ayah_start: 1, ayah_end: 7, kind: 'ai_recite' },
}), '9:1:1:7:ai_recite')
assert.notEqual(assignmentPassageKey({
  studentId: 9,
  assignment: { surah_number: 1, ayah_start: 1, ayah_end: 7, kind: 'practice' },
}), '9:1:1:7:ai_recite')

const queue = teacherActionQueue({
  review_queue: { actionable: [{ id: 8, student_id: 1, student_name: 'Amina', surah_name: 'Al-Fatihah', ayah_start: 1, ayah_end: 7 }] },
  outstanding_revision: [
    { recipient_id: 3, student_id: 2, student_name: 'Yusuf', label: 'Al-Baqarah · 1–5', overdue: false, due_at: '2026-11-20' },
    { recipient_id: 4, student_id: 2, student_name: 'Yusuf', label: 'Al-Baqarah · 6–7', overdue: true, due_at: '2026-11-10' },
  ],
  revision_decisions: [
    { id: 15, student_id: 3, student_name: 'Maryam', status: 'pending', label: 'Al-Ikhlas · 1–4' },
    { id: 16, student_id: 4, student_name: 'Hasan', status: 'accepted', label: 'An-Nas · 1–6' },
  ],
}, [
  { id: 1, name: 'Amina', needs_attention: true },
  { id: 5, name: 'Layla', needs_attention: true },
])
assert.deepEqual(queue.map((item) => item.kind), ['recitation', 'overdue', 'decision', 'decision', 'attention'])
assert.equal(queue[2].status, 'accepted')
assert.equal(queue[4].studentId, 5)
assert.equal(teacherActionQueue({
  review_queue: { actionable: [1, 2, 3, 4, 5, 6].map((id) => ({ id, student_id: id, student_name: `S${id}` })) },
}).length, 5)

console.log('teacher-formatters.test.mjs: ok')
