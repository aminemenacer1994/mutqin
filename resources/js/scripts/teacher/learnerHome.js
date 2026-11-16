import { isLearnerSubmitted, isLearnerTaskApproved, learnerNeedsCorrection } from './learnerDashboard.js'

function dueTime(row) {
  const value = Date.parse(row?.assignment?.due_at || '')
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

/** The Home action is a real, actionable assignment, never a submitted review. */
export function nextLearnerHomeTask(assignments) {
  return (Array.isArray(assignments) ? assignments : [])
    .filter(row => row?.id && !isLearnerTaskApproved(row) && (!isLearnerSubmitted(row) || learnerNeedsCorrection(row)))
    .filter(row => learnerNeedsCorrection(row) || ['pending', 'in_progress', 'overdue'].includes(row.status))
    .sort((a, b) => Number(learnerNeedsCorrection(b)) - Number(learnerNeedsCorrection(a))
      || dueTime(a) - dueTime(b) || Number(a.id) - Number(b.id))[0] || null
}

/** Only show feedback whose persisted task or teacher conversation can open. */
export function latestLearnerHomeFeedback(support) {
  const taskIds = new Set((Array.isArray(support?.assignments) ? support.assignments : []).map(row => Number(row.id)))
  const teacherIds = new Set((Array.isArray(support?.direct_threads) ? support.direct_threads : []).map(row => Number(row.teacher_id)))
  return (Array.isArray(support?.learning?.feedback_inbox) ? support.learning.feedback_inbox : [])
    .filter(item => item.recipient_id ? taskIds.has(Number(item.recipient_id)) : teacherIds.has(Number(item.teacher_id)))
    .slice()
    .sort((a, b) => (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0))[0] || null
}
