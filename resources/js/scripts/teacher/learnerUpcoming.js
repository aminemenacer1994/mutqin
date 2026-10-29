/**
 * Pending assignments with due dates, earliest first.
 * @param {Array<object>} assignments
 * @param {(row: object) => boolean} isComplete
 * @param {number} max
 */
export function buildUpcomingAssignments(assignments, isComplete, max = 3) {
  const rows = (Array.isArray(assignments) ? assignments : [])
    .filter((row) => row?.assignment?.due_at && !isComplete(row))
    .sort((a, b) => String(a.assignment.due_at).localeCompare(String(b.assignment.due_at)))
  return rows.slice(0, max)
}

export function dueDaysFromNow(dueAt, now = new Date()) {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((end - start) / 86400000)
}
