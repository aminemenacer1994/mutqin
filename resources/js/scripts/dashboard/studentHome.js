import { isLearnerSubmitted, isLearnerTaskApproved, learnerNeedsCorrection } from '../teacher/learnerDashboard.js'
import { buildUpcomingAssignments, dueDaysFromNow } from '../teacher/learnerUpcoming.js'

/** A teacher assignment the learner can still act on. */
export function isActionableHomeAssignment(row) {
  if (!row?.id) return false
  if (row.teacher_access === false) return false
  if (isLearnerTaskApproved(row)) return false
  if (isLearnerSubmitted(row)) return false
  return learnerNeedsCorrection(row) || ['pending', 'in_progress', 'overdue'].includes(String(row.status || ''))
}

/**
 * Overdue, due today, due tomorrow, or sent back for correction.
 * Later work stays in the upcoming list.
 */
export function homeAttentionAssignments(assignments, now = new Date()) {
  return (Array.isArray(assignments) ? assignments : [])
    .filter((row) => attentionRank(row, now) !== null)
    .sort((a, b) => attentionRank(a, now) - attentionRank(b, now)
      || String(a?.assignment?.due_at || '').localeCompare(String(b?.assignment?.due_at || ''))
      || Number(a.id) - Number(b.id))
    .slice(0, 3)
}

/** Dated work after tomorrow, then undated work, excluding anything already in attention. */
export function homeUpcomingAssignments(assignments, attentionIds = [], now = new Date()) {
  const exclude = (Array.isArray(attentionIds) ? attentionIds : []).map((id) => Number(id))
  const dated = buildUpcomingAssignments(
    assignments,
    (row) => !isActionableHomeAssignment(row),
    3,
    { excludeTodoIds: exclude, now },
  )
  if (dated.length >= 3) return dated
  const used = new Set([...exclude, ...dated.map((row) => Number(row.id))])
  const undated = (Array.isArray(assignments) ? assignments : [])
    .filter((row) => isActionableHomeAssignment(row) && !row?.assignment?.due_at && !used.has(Number(row.id)))
    .sort((a, b) => Number(a.id) - Number(b.id))
  return [...dated, ...undated].slice(0, 3)
}

function attentionRank(row, now) {
  if (!isActionableHomeAssignment(row)) return null
  if (learnerNeedsCorrection(row)) return 0
  const days = dueDaysFromNow(row?.assignment?.due_at, now)
  if (String(row.status || '') === 'overdue' || (days !== null && days < 0)) return 1
  if (days === 0 || days === 1) return 2
  return null
}
