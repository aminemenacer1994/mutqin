const TREND_MIN_BUCKETS = 2
const EMPTY_METRIC = '—'

function rangeLabel(range) {
  if (!range?.surah_name) return ''
  const end = range.ayah_end !== range.ayah_start ? `–${range.ayah_end}` : ''
  return `${range.surah_name} · ${range.ayah_start}${end}`
}

export function bucketLine(bucket) {
  const items = bucket?.items || []
  if (!items.length) return ''
  return items.map((range) => rangeLabel(range)).filter(Boolean).join(', ')
}

export function showAssignmentTrends(trends) {
  const rows = Array.isArray(trends) ? trends.filter((row) => Number(row?.due || 0) > 0) : []
  return rows.length >= TREND_MIN_BUCKETS
}

export function showWordingTrend(wording) {
  if (!wording) return false
  const passages = Number(wording.comparable_passages || 0)
  const direction = String(wording.direction || 'insufficient')
  return passages >= 2 && direction !== 'insufficient'
}

export function wordingDirectionKey(direction) {
  const key = `parent.wording_${direction}`
  const known = new Set(['insufficient', 'improving', 'slipping', 'mixed', 'steady'])
  return known.has(direction) ? key : 'parent.wording_insufficient'
}

export function progressSummaryLine(t, payload, window) {
  const count = Number(payload?.practice_volume?.ayah_rows || 0)
  const when = t(window === 'week' ? 'parent.progress_when_week' : 'parent.progress_when_month')
  if (!count) return t('parent.progress_quiet')
  if (count === 1) return t('parent.progress_simple_one', { when })
  return t('parent.progress_simple', { count, when })
}

export function lifetimeMetricRows(t, payload) {
  const coverage = payload?.coverage || {}
  const validated = payload?.validated_memorisation || {}
  const rows = [
    {
      key: 'memorised',
      label: t('parent.kpi_memorised'),
      value: coverage.memorised_ayahs ?? 0,
      hint: coverage.coverage_percent
        ? t('parent.progress_coverage', { n: coverage.coverage_percent })
        : '',
    },
    {
      key: 'learning',
      label: t('parent.progress_current_learning'),
      value: coverage.learning_ayahs ?? 0,
      hint: bucketLine(coverage.new_memorisation) || t('parent.learning_empty'),
    },
    {
      key: 'revision',
      label: t('parent.progress_revision'),
      value: coverage.reviewing_ayahs ?? 0,
      hint: bucketLine(coverage.recent_revision) || bucketLine(coverage.older_revision) || t('parent.progress_none_yet'),
    },
  ]
  if (validated.validated_ayahs) {
    rows.push({
      key: 'validated',
      label: t('parent.kpi_validated'),
      value: validated.validated_ayahs,
      hint: bucketLine(validated.ranges) || '',
    })
  }
  return rows
}

function homeworkPeriodMetric(t, assignments) {
  const due = Number(assignments.due || 0)
  const completed = Number(assignments.completed || 0)
  if (due === 0) {
    return {
      value: EMPTY_METRIC,
      hint: t('parent.progress_trends_empty'),
      empty: true,
    }
  }
  const value = assignments.completion_percent != null
    ? t('parent.progress_assignments_rate', { n: assignments.completion_percent })
    : t('parent.progress_assignments_due_completed', { due, completed })
  const hint = assignments.missed
    ? t('parent.progress_assignments_missed_count', { n: assignments.missed })
    : ''
  return { value, hint, empty: false }
}

export function periodMetricRows(t, payload, window) {
  const practice = payload?.practice_volume || {}
  const assignments = payload?.assignment_completion || {}
  const when = t(window === 'week' ? 'parent.progress_when_week' : 'parent.progress_when_month')
  const rows = [
    {
      key: 'practice',
      label: t('parent.kpi_practice'),
      value: practice.ayah_rows ?? 0,
      hint: t('parent.progress_practice_hint', { when }),
      empty: false,
    },
  ]
  if (assignments.due !== undefined) {
    const homework = homeworkPeriodMetric(t, assignments)
    rows.push({
      key: 'assignments',
      label: t('parent.progress_assignments'),
      ...homework,
    })
  }
  return rows
}

/** Period-only overview cards (no lifetime memorisation totals). */
export function progressSummaryCards(t, payload, window) {
  const practice = payload?.practice_volume || {}
  const assignments = payload?.assignment_completion || {}
  const when = t(window === 'week' ? 'parent.progress_when_week' : 'parent.progress_when_month')
  const homework = homeworkPeriodMetric(t, assignments)
  return [
    {
      key: 'practice',
      label: t('parent.kpi_practice'),
      value: practice.ayah_rows ?? 0,
      hint: t('parent.progress_practice_hint', { when }),
      icon: 'bi bi-activity',
      empty: false,
    },
    {
      key: 'assignments',
      label: t('parent.progress_assignments'),
      value: homework.value,
      hint: homework.hint || t('parent.progress_period_scope', { when }),
      icon: 'bi bi-journal-check',
      empty: homework.empty,
    },
  ]
}

export function teacherReviewedAssessments(assessments, limit = 3) {
  return (Array.isArray(assessments) ? assessments : [])
    .filter((row) => row && typeof row === 'object' && Object.keys(row).length > 0)
    .filter(
      (row) =>
        row.source === 'teacher_reviewed'
        && (row.teacher_note || row.word_match_percent != null || row.teacher_score != null),
    )
    .slice(0, limit)
}