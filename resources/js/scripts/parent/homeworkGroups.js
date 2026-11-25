import { isLearningRowOverdue, sortLearningRows } from './familyLearning.js'

const GROUP_ORDER = ['overdue', 'active', 'waiting', 'done']

export function homeworkGroupKey(row) {
  if (!row) return 'waiting'
  if (isLearningRowOverdue(row) || row.display_status === 'overdue') return 'overdue'
  if (row.display_status === 'completed') return 'done'
  if (row.display_status === 'in_progress' || row.display_status === 'needs_correction') return 'active'
  return 'waiting'
}

export function groupHomeworkRows(rows = []) {
  const sorted = sortLearningRows(rows)
  const buckets = Object.fromEntries(GROUP_ORDER.map((key) => [key, []]))
  for (const row of sorted) {
    const key = homeworkGroupKey(row)
    if (buckets[key]) buckets[key].push(row)
    else buckets.waiting.push(row)
  }
  return GROUP_ORDER
    .map((key) => ({ key, rows: buckets[key] }))
    .filter((group) => group.rows.length > 0)
}

export function historyLabelKey(label) {
  const id = String(label || '').trim().toLowerCase()
  const known = new Set(['assigned', 'started', 'submitted', 'completed', 'cancelled', 'reassigned'])
  return known.has(id) ? `parent.homework_history_${id}` : null
}