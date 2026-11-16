import { isLearnerSubmitted, isLearnerTaskApproved, learnerNeedsCorrection } from './learnerDashboard.js'

function dueTime(row) {
  const value = Date.parse(row?.assignment?.due_at || '')
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

/** The Home action is a real, actionable assignment, never a submitted review. */
export function nextLearnerHomeTask(assignments, now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const urgency = row => dueTime(row) < today.getTime() ? 0 : dueTime(row) < tomorrow.getTime() ? 1 : 2
  return (Array.isArray(assignments) ? assignments : [])
    .filter(row => row?.id && !isLearnerTaskApproved(row) && (!isLearnerSubmitted(row) || learnerNeedsCorrection(row)))
    .filter(row => learnerNeedsCorrection(row) || ['pending', 'in_progress', 'overdue'].includes(row.status))
    .sort((a, b) => urgency(a) - urgency(b)
      || (urgency(a) < 2 ? dueTime(a) - dueTime(b) : 0)
      || Number(learnerNeedsCorrection(b)) - Number(learnerNeedsCorrection(a))
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

/** Exclude work already promoted on Home and keep assignment context for retries. */
export function learnerHomeRevisions(assignments, revisit, primaryId) {
  const tasks = (assignments || []).filter(row => row.id !== primaryId && !isLearnerTaskApproved(row)
    && (!isLearnerSubmitted(row) || learnerNeedsCorrection(row))
    && (learnerNeedsCorrection(row) || row.assignment?.hifz_category === 'sabqi'))
    .sort((a, b) => dueTime(a) - dueTime(b))
  const covers = (row, item) => Number(row.assignment?.surah_number) === Number(item.surah_number)
    && Number(row.assignment?.ayah_start) <= Number(item.ayah_number)
    && Number(row.assignment?.ayah_end) >= Number(item.ayah_number)
  const ai = (revisit || []).filter(item => item.surah_number && item.ayah_number
    && !(assignments || []).some(row => (row.id === primaryId || tasks.includes(row)) && covers(row, item)))
  return [...tasks.map(task => ({ key: `task:${task.id}`, task })), ...ai.map(item => ({ key: `ayah:${item.surah_number}:${item.ayah_number}`, item }))]
    .filter((row, index, all) => all.findIndex(other => other.key === row.key) === index).slice(0, 3)
}
