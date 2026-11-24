/** Minimum teacher-confirmed weak-spot attempts before we show the ayah. */
export const STUDENT_PROGRESS_WEAK_MIN_EVIDENCE = 2

/** Passages with at least two scored checks before aggregate trend copy is shown. */
export const STUDENT_PROGRESS_WORDING_TREND_MIN_PASSAGES = 2

export const STUDENT_PROGRESS_SECTION_IDS = Object.freeze([
  'dash-progress',
  'progress-memorisation',
  'progress-recitation',
  'progress-feedback',
  'achievements',
])

export function progressMetricDisplay(value, { treatZeroAsEmpty = false } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (treatZeroAsEmpty && n === 0) return '—'
  return String(n)
}

export function progressLifetimeMetricValue(metric) {
  if (!metric || typeof metric !== 'object') return null
  if (metric.period_days == null) return Number(metric.value ?? 0)
  return null
}

export function progressPeriodMetricValue(metric) {
  if (!metric || typeof metric !== 'object') return null
  if (metric.period_days != null) return Number(metric.value ?? 0)
  if (metric.period_value != null) return Number(metric.period_value)
  return null
}

export function mergePracticeMetrics(fallback, practice) {
  const base = fallback && typeof fallback === 'object' ? fallback : {}
  const next = practice && typeof practice === 'object' ? practice : {}
  return { ...base, ...next }
}

/**
 * Overview cards for the progress pane: lifetime memorisation vs period activity.
 */
export function buildProgressOverviewGroups(t, metrics, { periodDays = 30 } = {}) {
  const revised = metrics?.revised || {}
  const recited = metrics?.recited || {}
  const aiChecks = metrics?.ai_checks || {}
  const revisedHint = revised.capped
    ? `${t('dashboard.learning_revised_hint')} ${t('dashboard.learning_capped')}`
    : t('dashboard.learning_revised_hint')
  let recitedHint = Number(recited.repeats || 0) > 0
    ? t('dashboard.learning_repeats', { n: recited.repeats })
    : t('dashboard.learning_recited_hint')
  if (recited.capped) recitedHint = `${recitedHint} ${t('dashboard.learning_capped')}`

  const lifetime = [{
    key: 'memorised',
    label: t('dashboard.progress_memorised_lifetime'),
    value: progressMetricDisplay(progressLifetimeMetricValue(metrics?.memorised)),
    hint: t('dashboard.progress_memorised_lifetime_hint'),
    icon: 'bi-bookmark-check',
    action: 'hifz',
  }]

  const period = [
    {
      key: 'revised',
      label: t('dashboard.learning_revised'),
      value: progressMetricDisplay(progressPeriodMetricValue(revised), { treatZeroAsEmpty: true }),
      hint: revisedHint,
      icon: 'bi-arrow-repeat',
      action: 'revision',
    },
    {
      key: 'recited',
      label: t('dashboard.learning_recited'),
      value: progressMetricDisplay(progressPeriodMetricValue(recited), { treatZeroAsEmpty: true }),
      hint: recitedHint,
      icon: 'bi-mic',
      action: 'recitation',
    },
    {
      key: 'ai_checks',
      label: t('dashboard.progress_ai_checks_period'),
      value: progressMetricDisplay(
        aiChecks.period_value != null ? Number(aiChecks.period_value) : progressPeriodMetricValue(aiChecks),
        { treatZeroAsEmpty: true },
      ),
      hint: t('dashboard.progress_ai_checks_period_hint'),
      icon: 'bi-stars',
      action: 'ai',
    },
  ]

  return {
    lifetime,
    period,
    periodLabel: t('dashboard.progress_period_heading', { days: periodDays }),
  }
}

export function wordingTrendSummary(t, wording, { minPassages = STUDENT_PROGRESS_WORDING_TREND_MIN_PASSAGES } = {}) {
  if (!wording || !Number(wording.comparable_passages || 0)) {
    return t('dashboard.progress_recitation_wording_empty')
  }
  const comparable = Number(wording.comparable_passages || 0)
  const direction = String(wording.direction || '')
  if (direction === 'insufficient' || comparable < minPassages) {
    return t('dashboard.progress_recitation_wording_raw', { n: comparable })
  }
  if (['improving', 'slipping', 'mixed'].includes(direction)) {
    return t('dashboard.progress_recitation_wording_summary', {
      n: comparable,
      direction: t(`dashboard.progress_wording_${direction}`),
    })
  }
  return t('dashboard.progress_recitation_wording_raw', { n: comparable })
}

export function filterWeakPassagesForDisplay(passages, minEvidence = STUDENT_PROGRESS_WEAK_MIN_EVIDENCE) {
  return (Array.isArray(passages) ? passages : [])
    .filter((item) => Number(item?.count || 0) >= minEvidence)
}

export function recitationChecksReconciliationNote(t, metrics) {
  const recited = Number(metrics?.recited?.value ?? 0)
  const checks = Number(metrics?.ai_checks?.period_value ?? metrics?.ai_checks?.value ?? 0)
  if (!recited && !checks) return ''
  return t('dashboard.progress_recitation_totals_note', { ayahs: recited, checks })
}