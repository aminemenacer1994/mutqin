const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/

export const DEFAULT_LEARNING_FILTERS = {
  activity: null,
  status: 'all',
  from: '',
  to: '',
}

export function hasLearningFiltersActive(filters = {}) {
  return Boolean(
    filters.activity
    || (filters.status && filters.status !== 'all')
    || filters.from
    || filters.to,
  )
}

export function resetLearningFilters() {
  return { ...DEFAULT_LEARNING_FILTERS }
}

function dueTimestamp(row) {
  const raw = row?.assignment?.due_at || row?.due_at
  if (!raw) return Number.POSITIVE_INFINITY
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime()
}

export function isLearningRowOverdue(row) {
  if (!row) return false
  if (row.display_status === 'overdue') return true
  return Boolean(row.overdue)
}

export function sortLearningRows(rows = []) {
  return [...rows].sort((a, b) => {
    const overdueA = isLearningRowOverdue(a) ? 0 : 1
    const overdueB = isLearningRowOverdue(b) ? 0 : 1
    if (overdueA !== overdueB) return overdueA - overdueB
    return dueTimestamp(a) - dueTimestamp(b)
  })
}

export function homeworkDisplayStatusKey(status) {
  if (status === 'pending') return 'pending'
  if (status === 'in_progress') return 'in_progress'
  if (status === 'awaiting_confirmation') return 'awaiting_confirmation'
  if (status === 'completed') return 'completed'
  if (status === 'overdue') return 'overdue'
  if (status === 'needs_correction') return 'needs_correction'
  return status || 'pending'
}

export function homeworkDisplayStatusClass(status) {
  if (status === 'overdue') return 'is-late'
  if (status === 'completed') return 'is-ok'
  if (status === 'awaiting_confirmation') return 'is-wait'
  if (status === 'needs_correction') return 'is-late'
  if (status === 'in_progress') return 'is-open'
  return 'is-open'
}

export function homeworkDisplayStatusIcon(status) {
  if (status === 'overdue') return 'bi bi-clock'
  if (status === 'completed') return 'bi bi-check-circle'
  if (status === 'awaiting_confirmation') return 'bi bi-hourglass'
  if (status === 'needs_correction') return 'bi bi-arrow-repeat'
  if (status === 'in_progress') return 'bi bi-pencil'
  return 'bi bi-circle'
}

export function passageTitleDirection(text) {
  return ARABIC_RE.test(String(text || '')) ? 'rtl' : 'ltr'
}