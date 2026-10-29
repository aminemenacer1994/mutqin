/**
 * Pending assignments with due dates, earliest first.
 * @param {Array<object>} assignments
 * @param {(row: object) => boolean} isComplete
 * @param {number} max
 * @param {{ excludeTodoIds?: Array<number|string> }} [options]
 */
export function buildUpcomingAssignments(assignments, isComplete, max = 3, options = {}) {
  const exclude = new Set((options.excludeTodoIds || []).map((id) => Number(id)))
  const now = options.now instanceof Date ? options.now : new Date()
  const rows = (Array.isArray(assignments) ? assignments : [])
    .filter((row) => {
      if (!row?.assignment?.due_at || isComplete(row)) return false
      const days = dueDaysFromNow(row.assignment.due_at, now)
      if (days === null || days <= 0) return false
      if (exclude.has(Number(row.id))) return false
      return true
    })
    .sort((a, b) => String(a.assignment.due_at).localeCompare(String(b.assignment.due_at)))
  return rows.slice(0, max)
}

/**
 * @param {Array<object>} assignments
 * @param {(row: object) => boolean} isComplete
 * @param {Array<number|string>} todoIds
 * @param {Date} [now]
 */
export function shouldShowUpcomingPanel(assignments, isComplete, todoIds = [], now = new Date()) {
  if (!Array.isArray(assignments) || assignments.length <= 1) return false
  return buildUpcomingAssignments(assignments, isComplete, 1, { excludeTodoIds: todoIds, now }).length > 0
}

export function dueDaysFromNow(dueAt, now = new Date()) {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((end - start) / 86400000)
}
