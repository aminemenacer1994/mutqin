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

const ATTENTION_FEEDBACK_RANK = 2

/**
 * Overdue, due today, due tomorrow, due within two days, or sent back for correction.
 * Later work stays in the upcoming list.
 */
export function homeAttentionAssignments(assignments, now = new Date(), limit = 3) {
  return (Array.isArray(assignments) ? assignments : [])
    .filter((row) => attentionRank(row, now) !== null)
    .sort((a, b) => attentionRank(a, now) - attentionRank(b, now)
      || String(a?.assignment?.due_at || '').localeCompare(String(b?.assignment?.due_at || ''))
      || Number(a.id) - Number(b.id))
    .slice(0, limit)
}

/**
 * Priority: correction / overdue → unread feedback → due soon.
 * Used to render Needs your attention without duplicate assignment rows elsewhere.
 */
export function buildHomeAttentionRows(assignments, unreadFeedback = null, now = new Date(), limit = 4) {
  const items = homeAttentionAssignments(assignments, now, limit)
    .map((row) => ({
      kind: 'assignment',
      rank: attentionRank(row, now),
      row,
      key: `attention-assignment-${row.id}`,
    }))
  if (unreadFeedback && (unreadFeedback.id || unreadFeedback.created_at)) {
    items.push({
      kind: 'feedback',
      rank: ATTENTION_FEEDBACK_RANK,
      row: unreadFeedback,
      key: `attention-feedback-${unreadFeedback.id || unreadFeedback.created_at}`,
    })
  }
  return items
    .sort((a, b) => a.rank - b.rank
      || (a.kind === 'feedback' ? 1 : 0) - (b.kind === 'feedback' ? 1 : 0)
      || Number(a.row?.id || 0) - Number(b.row?.id || 0))
    .slice(0, limit)
}

export function homeAttentionAssignmentIds(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((item) => item?.kind === 'assignment' && item?.row?.id)
    .map((item) => Number(item.row.id))
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
  if (days !== null && days >= 0 && days <= 2) return 3
  return null
}
