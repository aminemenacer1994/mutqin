export function reportHomeworkChart(t, assignments) {
  if (!assignments) return []
  const assigned = Number(assignments.assigned || 0)
  const completed = Number(assignments.completed || 0)
  const overdue = Number(assignments.overdue || 0)
  const open = Math.max(0, assigned - completed)
  if (!assigned && !completed && !overdue) return []
  return [
    {
      key: 'completed',
      label: t('parent.reports_chart_done'),
      value: completed,
      display: String(completed),
      tone: 'ok',
    },
    {
      key: 'open',
      label: t('parent.reports_chart_open'),
      value: open,
      display: String(open),
      tone: 'neutral',
    },
    {
      key: 'overdue',
      label: t('parent.reports_chart_overdue'),
      value: overdue,
      display: String(overdue),
      tone: 'warn',
    },
  ].filter((row) => row.value > 0)
}

export function reportPracticeChart(t, activity) {
  if (!activity) return []
  const practice = Number(activity.practice_rows || 0)
  const revision = Number(activity.revision_sessions || 0)
  const memorised = Number(activity.memorised_in_period || 0)
  if (!practice && !revision && !memorised) return []
  return [
    {
      key: 'practice',
      label: t('parent.reports_chart_practice'),
      value: practice,
      display: String(practice),
      tone: 'neutral',
    },
    {
      key: 'revision',
      label: t('parent.reports_chart_revision'),
      value: revision,
      display: String(revision),
      tone: 'ok',
    },
    {
      key: 'memorised',
      label: t('parent.reports_chart_memorised'),
      value: memorised,
      display: String(memorised),
      tone: 'ok',
    },
  ].filter((row) => row.value > 0)
}

export function reportAttendanceChart(t, attendance) {
  const counts = attendance?.counts
  if (!counts) return []
  const defs = [
    { key: 'present', label: t('teacher.attendance_present'), field: 'present', tone: 'ok' },
    { key: 'late', label: t('teacher.attendance_late'), field: 'late', tone: 'warn' },
    { key: 'absent', label: t('teacher.attendance_absent'), field: 'absent', tone: 'warn' },
    { key: 'excused', label: t('teacher.attendance_excused'), field: 'excused', tone: 'neutral' },
  ]
  return defs
    .map((row) => ({
      key: row.key,
      label: row.label,
      value: Number(counts[row.field] || 0),
      display: String(Number(counts[row.field] || 0)),
      tone: row.tone,
    }))
    .filter((row) => row.value > 0)
}

export function reportParentHighlights(t, active) {
  if (!active) return []
  const lines = []
  const assignments = active.assignments
  const activity = active.activity
  if (assignments) {
    const assigned = Number(assignments.assigned || 0)
    const completed = Number(assignments.completed || 0)
    if (assigned > 0) {
      lines.push(t('parent.reports_highlight_homework', { done: completed, total: assigned }))
    }
    const overdue = Number(assignments.overdue || 0)
    if (overdue > 0) lines.push(t('parent.reports_highlight_overdue', { count: overdue }))
  }
  if (activity) {
    const practice = Number(activity.practice_rows || 0)
    if (practice > 0) lines.push(t('parent.reports_highlight_practice', { count: practice }))
  }
  if (Array.isArray(active.attention) && active.attention.length) {
    lines.push(t('parent.reports_highlight_attention', { count: active.attention.length }))
  }
  return lines.slice(0, 4)
}