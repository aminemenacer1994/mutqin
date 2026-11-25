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

function metricIconClass(icon) {
  if (!icon) return 'bi bi-activity'
  const raw = String(icon)
  return raw.startsWith('bi ') ? raw : `bi ${raw}`
}

/** Flat overview stats for the parent-style compact card grid. */
export function flattenProgressOverviewStats(groups) {
  const mapRow = (metric, scope) => ({
    key: `${scope}-${metric.key}`,
    metricKey: metric.key,
    label: metric.label,
    value: metric.value,
    hint: metric.hint,
    icon: metricIconClass(metric.icon),
    action: metric.action,
    scope,
    empty: metric.value === '—',
  })
  const lifetime = Array.isArray(groups?.lifetime) ? groups.lifetime : []
  const period = Array.isArray(groups?.period) ? groups.period : []
  return [...lifetime.map((row) => mapRow(row, 'lifetime')), ...period.map((row) => mapRow(row, 'period'))]
}

export function progressOverviewLeadLine(t, metrics, { periodDays = 30 } = {}) {
  const revised = progressPeriodMetricValue(metrics?.revised)
  const recited = progressPeriodMetricValue(metrics?.recited)
  const checks = metrics?.ai_checks?.period_value != null
    ? Number(metrics.ai_checks.period_value)
    : progressPeriodMetricValue(metrics?.ai_checks)
  const bits = []
  if (Number.isFinite(revised) && revised > 0) {
    bits.push(t('dashboard.progress_overview_lead_revised', { n: revised }))
  }
  if (Number.isFinite(recited) && recited > 0) {
    bits.push(t('dashboard.progress_overview_lead_recited', { n: recited }))
  }
  if (Number.isFinite(checks) && checks > 0) {
    bits.push(t('dashboard.progress_overview_lead_checks', { n: checks }))
  }
  if (!bits.length) return t('dashboard.progress_overview_lead_quiet', { days: periodDays })
  return t('dashboard.progress_overview_lead', { detail: bits.join(' · '), days: periodDays })
}

const WORDING_DIRECTION_CLASS = Object.freeze({
  up: 'is-improving',
  down: 'is-slipping',
  steady: 'is-steady',
})

/** Readable wording history rows (not raw "82% then 80%" strings). */
export function mapWordingPassageRows(t, passages) {
  return (Array.isArray(passages) ? passages : []).map((passage) => {
    const direction = String(passage?.direction || 'steady')
    const checks = Number(passage?.checks || 0)
    const first = passage?.first
    const latest = passage?.latest
    return {
      key: `${passage?.label || 'passage'}-${first}-${latest}`,
      label: passage?.label || '',
      checks,
      first: first != null ? Number(first) : null,
      latest: latest != null ? Number(latest) : null,
      delta: passage?.delta != null ? Number(passage.delta) : null,
      direction,
      directionLabel: t(`dashboard.progress_wording_${direction === 'up' ? 'improving' : direction === 'down' ? 'slipping' : 'steady'}`),
      directionClass: WORDING_DIRECTION_CLASS[direction] || 'is-steady',
      sampleLabel: checks > 0 ? t('dashboard.progress_wording_sample', { n: checks }) : '',
      firstAt: passage?.first_at || null,
      latestAt: passage?.latest_at || null,
    }
  })
}

export function progressSectionDeepLinks(t, sections) {
  return (Array.isArray(sections) ? sections : [])
    .filter((row) => row?.id && row?.label)
    .map((row) => ({
      id: row.id,
      label: row.label,
      href: `#${row.id}`,
    }))
}