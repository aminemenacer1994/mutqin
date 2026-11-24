const TREND_MIN_BUCKETS = 2

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
    },
  ]
  if (assignments.due !== undefined) {
    const due = Number(assignments.due || 0)
    const completed = Number(assignments.completed || 0)
    rows.push({
      key: 'assignments',
      label: t('parent.progress_assignments'),
      value: due === 0
        ? t('parent.progress_trends_empty')
        : assignments.completion_percent != null
          ? t('parent.progress_assignments_rate', { n: assignments.completion_percent })
          : t('parent.progress_assignments_due_completed', { due, completed }),
      hint: due > 0 && assignments.missed
        ? t('parent.progress_assignments_missed_count', { n: assignments.missed })
        : '',
    })
  }
  const pendingRevision = (payload?.recommendations || []).length
  if (pendingRevision) {
    rows.push({
      key: 'revision_suggested',
      label: t('parent.progress_revision'),
      value: pendingRevision,
      hint: t('parent.progress_suggests'),
    })
  }
  return rows
}

export function coreMetricCards(t, payload, window) {
  const coverage = payload?.coverage || {}
  const practice = payload?.practice_volume || {}
  const when = t(window === 'week' ? 'parent.progress_when_week' : 'parent.progress_when_month')
  return [
    {
      key: 'memorised',
      label: t('parent.kpi_memorised'),
      value: coverage.memorised_ayahs ?? 0,
      detail: bucketLine(coverage.ranges) || t('parent.progress_none_yet'),
      icon: 'bi bi-journal-bookmark',
    },
    {
      key: 'learning',
      label: t('parent.progress_current_learning'),
      value: coverage.learning_ayahs ?? 0,
      detail: bucketLine(coverage.new_memorisation) || t('parent.learning_empty'),
      icon: 'bi bi-pencil',
    },
    {
      key: 'revision',
      label: t('parent.progress_revision'),
      value: coverage.reviewing_ayahs ?? 0,
      detail: (payload?.recommendations || []).length
        ? t('parent.progress_revision_suggested', { n: (payload.recommendations || []).length })
        : bucketLine(coverage.recent_revision) || t('parent.progress_none_yet'),
      icon: 'bi bi-arrow-repeat',
    },
    {
      key: 'practice',
      label: t('parent.kpi_practice'),
      value: practice.ayah_rows ?? 0,
      detail: t('parent.progress_practice_hint', { when }),
      icon: 'bi bi-activity',
    },
  ]
}