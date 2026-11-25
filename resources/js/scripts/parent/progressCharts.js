export function progressPracticeBar(t, practiceVolume, window) {
  const count = Number(practiceVolume?.ayah_rows || 0)
  if (!count) return []
  const when = t(window === 'week' ? 'parent.progress_when_week' : 'parent.progress_when_month')
  return [{
    key: 'practice',
    label: t('parent.kpi_practice'),
    value: count,
    display: t('parent.home_weekly_practice', { count }),
    tone: 'ok',
    hint: when,
  }]
}

export function progressPeriodHomeworkBars(t, completion) {
  if (!completion) return []
  const due = Number(completion.due || 0)
  const completed = Number(completion.completed || 0)
  const missed = Number(completion.missed || 0)
  if (!due) return []
  const open = Math.max(0, due - completed - missed)
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
      key: 'missed',
      label: t('parent.reports_chart_overdue'),
      value: missed,
      display: String(missed),
      tone: 'warn',
    },
  ].filter((row) => row.value > 0)
}

export function assignmentTrendBars(t, trends, formatWeek) {
  const rows = Array.isArray(trends)
    ? trends.filter((row) => Number(row?.due || 0) > 0).slice(-4)
    : []
  if (rows.length < 2) return []
  return rows.map((row, index) => ({
    key: `week-${index}`,
    label: formatWeek ? formatWeek(row.week_start) : String(row.week_start || ''),
    value: Number(row.completed || 0),
    display: t('parent.progress_chart_week_done', {
      done: Number(row.completed || 0),
      due: Number(row.due || 0),
    }),
    tone: Number(row.overdue || 0) > 0 ? 'warn' : 'ok',
  }))
}