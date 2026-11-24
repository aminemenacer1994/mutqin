const FOLD_MIN_CHARS = 160

export function proseNeedsFold(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.trim()
  if (trimmed.length <= FOLD_MIN_CHARS) return false
  return true
}

export function prosePreview(text, max = FOLD_MIN_CHARS) {
  if (!text) return ''
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  const slice = trimmed.slice(0, max)
  const sentenceBreak = slice.lastIndexOf('. ')
  const wordBreak = slice.lastIndexOf(' ')
  const cut = sentenceBreak > 48 ? sentenceBreak + 1 : wordBreak > 24 ? wordBreak : max
  return `${trimmed.slice(0, cut).trim()}…`
}

export function periodMetricRowsFromReport(t, active) {
  if (!active) return []
  const rows = []
  const activity = active.activity
  const assignments = active.assignments
  if (assignments) {
    rows.push({
      key: 'assigned',
      label: t('parent.reports_period_assigned'),
      value: String(assignments.assigned ?? 0),
    })
    rows.push({
      key: 'completed',
      label: t('parent.reports_period_completed'),
      value: String(assignments.completed ?? 0),
    })
  }
  if (activity) {
    rows.push({
      key: 'practice',
      label: t('parent.reports_period_practice'),
      value: String(activity.practice_rows ?? 0),
    })
    rows.push({
      key: 'revision',
      label: t('parent.reports_period_revision'),
      value: String(activity.revision_sessions ?? 0),
    })
    rows.push({
      key: 'memorised',
      label: t('parent.reports_period_memorised'),
      value: String(activity.memorised_in_period ?? 0),
    })
  }
  return rows
}