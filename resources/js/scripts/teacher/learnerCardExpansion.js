import { isLearnerTaskApproved, isLearnerSubmitted, learnerNeedsCorrection } from './learnerDashboard.js'

export { isLearnerSubmitted, learnerNeedsCorrection }

export function learnerRetryContextVisible(row) {
  if (isLearnerTaskApproved(row)) return false
  return Boolean(row?.last_attempt?.attempt_number)
}

export function learnerShowCardProgress(row) {
  if (isLearnerTaskApproved(row) || isLearnerSubmitted(row)) return false
  const completed = Number(row?.progress?.completed || 0)
  const target = Number(row?.progress?.target || 0)
  if (!target) return false
  if (completed === 0 && row?.status === 'pending') return false
  return Boolean(row?.progress)
}

export function learnerHasInstruction(row) {
  if (isLearnerTaskApproved(row) || isLearnerSubmitted(row)) return false
  return Boolean(String(row?.assignment?.feedback || '').trim())
}

export function cardHasExpandableContent(row, options = {}) {
  const hasCompletionResult = options.hasCompletionResult
    || ((r) => Boolean(r?.completion_result))
  if (learnerNeedsCorrection(row)) return true
  if (learnerHasInstruction(row)) return true
  if (learnerShowCardProgress(row)) return true
  if (learnerRetryContextVisible(row)) return true
  if (isLearnerTaskApproved(row) && hasCompletionResult(row)) return true
  if (isLearnerSubmitted(row)) return true
  if (!isLearnerTaskApproved(row) && !isLearnerSubmitted(row)) return true
  return false
}

export function resolveCardExpanded(row, options = {}) {
  const expandedOverrides = options.expandedOverrides || {}
  const id = Number(row?.id)
  if (Object.prototype.hasOwnProperty.call(expandedOverrides, id)) {
    return Boolean(expandedOverrides[id])
  }
  return false
}
