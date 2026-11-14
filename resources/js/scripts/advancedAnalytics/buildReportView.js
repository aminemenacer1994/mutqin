import { cssThemeColor } from '../teacher/formatters'
import { formatPeriodLabel, formatShortDate } from './dateRange'
import { resolveInsights } from './insightsCopy'

function asNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatDuration(seconds, t) {
  const total = Math.max(0, Math.round(asNumber(seconds)))
  if (total <= 0) return t('dashboard.advanced_analytics.value_unavailable')
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) {
    return t('dashboard.advanced_analytics.duration_hm', { hours, minutes })
  }
  if (minutes > 0) {
    return t('dashboard.advanced_analytics.duration_m', { minutes })
  }
  return t('dashboard.advanced_analytics.duration_s', { seconds: total })
}

function formatDelta(value, { points = false } = {}, t) {
  if (value === null || value === undefined) return null
  const n = asNumber(value)
  if (!Number.isFinite(n) || n === 0) return null
  const sign = n > 0 ? '+' : ''
  if (points) {
    return t('dashboard.advanced_analytics.delta_points', { value: `${sign}${n}` })
  }
  return t('dashboard.advanced_analytics.delta_percent', { value: `${sign}${n}` })
}

function themeColors() {
  return {
    accent: cssThemeColor('--accent', '#3f6f6d'),
    accentStrong: cssThemeColor('--accent-strong', '#2f5654'),
    text: cssThemeColor('--text', '#1c1917'),
    muted: cssThemeColor('--text-muted', '#6b635a'),
    border: cssThemeColor('--border', 'rgba(120, 100, 70, 0.2)'),
    surface: cssThemeColor('--surface-strong', '#fffaf3'),
    memorisation: cssThemeColor('--accent', '#3f6f6d'),
    revision: '#8a6a3d',
    recitation: '#4a6d8c',
    matched: '#2e7d64',
    mismatch: '#a5463a',
    skipped: '#6b635a',
    uncertain: '#9a681f',
    extra: '#7a6a90',
  }
}

function lineOptions(colors) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4, right: 4, bottom: 0, left: 0 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.muted,
        borderColor: colors.border,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: colors.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 10 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: colors.muted, precision: 0, font: { size: 10 } },
        grid: { color: colors.border },
      },
    },
  }
}

function stackedBarOptions(colors) {
  const base = lineOptions(colors)
  return {
    ...base,
    scales: {
      x: { ...base.scales.x, stacked: true },
      y: { ...base.scales.y, stacked: true },
    },
    plugins: {
      ...base.plugins,
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: colors.text, boxWidth: 10, font: { size: 11 } },
      },
    },
  }
}

function doughnutOptions(colors) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4, right: 8, bottom: 4, left: 8 } },
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          color: colors.text,
          boxWidth: 10,
          boxHeight: 10,
          padding: 10,
          font: { size: 11 },
        },
      },
    },
  }
}

function buildOverviewCards(overview, t) {
  const deltas = overview?.deltas || {}
  return [
    {
      key: 'practice_time',
      icon: 'bi bi-clock-history',
      title: t('dashboard.advanced_analytics.kpi_practice_time'),
      value: formatDuration(overview?.practice_time_seconds, t),
      description: t('dashboard.advanced_analytics.kpi_practice_time_hint'),
      delta: formatDelta(deltas.practice_time, {}, t),
    },
    {
      key: 'ayahs_practised',
      icon: 'bi bi-journal-text',
      title: t('dashboard.advanced_analytics.kpi_ayahs_practised'),
      value: String(asNumber(overview?.ayahs_practised)),
      description: t('dashboard.advanced_analytics.kpi_ayahs_practised_hint'),
      delta: formatDelta(deltas.ayahs_practised, {}, t),
    },
    {
      key: 'memorisation_progress',
      icon: 'bi bi-stars',
      title: t('dashboard.advanced_analytics.kpi_memorisation'),
      value: String(asNumber(overview?.memorisation_progress)),
      description: t('dashboard.advanced_analytics.kpi_memorisation_hint'),
      delta: null,
    },
    {
      key: 'revision_sessions',
      icon: 'bi bi-arrow-repeat',
      title: t('dashboard.advanced_analytics.kpi_revision'),
      value: String(asNumber(overview?.revision_sessions)),
      description: t('dashboard.advanced_analytics.kpi_revision_hint'),
      delta: formatDelta(deltas.revision_sessions, {}, t),
    },
    {
      key: 'ai_accuracy',
      icon: 'bi bi-mic',
      title: t('dashboard.advanced_analytics.kpi_ai_accuracy'),
      value: overview?.ai_accuracy == null
        ? t('dashboard.advanced_analytics.value_unavailable')
        : t('dashboard.advanced_analytics.percent_value', { n: asNumber(overview.ai_accuracy) }),
      description: t('dashboard.advanced_analytics.kpi_ai_accuracy_hint', {
        n: asNumber(overview?.ai_checks),
      }),
      delta: formatDelta(deltas.ai_accuracy, { points: true }, t),
    },
    {
      key: 'practice_days',
      icon: 'bi bi-calendar-check',
      title: t('dashboard.advanced_analytics.kpi_consistency'),
      value: String(asNumber(overview?.practice_days)),
      description: t('dashboard.advanced_analytics.kpi_consistency_hint'),
      delta: formatDelta(deltas.practice_days, {}, t),
    },
  ]
}

function buildPracticeChart(points, t, colors) {
  const rows = Array.isArray(points) ? points : []
  if (!rows.length) return null
  return {
    data: {
      labels: rows.map((row) => row.label || row.key),
      datasets: [
        {
          label: t('dashboard.advanced_analytics.chart_sessions'),
          data: rows.map((row) => asNumber(row.sessions)),
          borderColor: colors.accent,
          backgroundColor: `${colors.accent}33`,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
          yAxisID: 'y',
        },
        {
          label: t('dashboard.advanced_analytics.chart_duration_min'),
          data: rows.map((row) => Math.round(asNumber(row.duration_seconds) / 60)),
          borderColor: colors.revision,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          borderDash: [4, 3],
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      ...lineOptions(colors),
      scales: {
        ...lineOptions(colors).scales,
        y1: {
          beginAtZero: true,
          position: 'right',
          ticks: { color: colors.muted, precision: 0, font: { size: 11 } },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        ...lineOptions(colors).plugins,
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: colors.text, boxWidth: 10, boxHeight: 10, padding: 10, font: { size: 10 } },
        },
      },
    },
  }
}

function buildSessionMixChart(points, t, colors) {
  const rows = Array.isArray(points) ? points : []
  if (!rows.length) return null
  const hasData = rows.some((row) => (
    asNumber(row.memorisation) + asNumber(row.revision) + asNumber(row.recitation) > 0
  ))
  if (!hasData) return null
  return {
    data: {
      labels: rows.map((row) => row.label || row.key),
      datasets: [
        {
          label: t('dashboard.advanced_analytics.mix_memorisation'),
          data: rows.map((row) => asNumber(row.memorisation)),
          backgroundColor: colors.memorisation,
          borderRadius: 3,
          maxBarThickness: 28,
          categoryPercentage: 0.72,
          barPercentage: 0.9,
        },
        {
          label: t('dashboard.advanced_analytics.mix_revision'),
          data: rows.map((row) => asNumber(row.revision)),
          backgroundColor: colors.revision,
          borderRadius: 3,
          maxBarThickness: 28,
          categoryPercentage: 0.72,
          barPercentage: 0.9,
        },
        {
          label: t('dashboard.advanced_analytics.mix_recitation'),
          data: rows.map((row) => asNumber(row.recitation)),
          backgroundColor: colors.recitation,
          borderRadius: 3,
          maxBarThickness: 28,
          categoryPercentage: 0.72,
          barPercentage: 0.9,
        },
      ],
    },
    options: stackedBarOptions(colors),
  }
}

function buildAiPerformanceChart(points, t, colors) {
  const rows = Array.isArray(points) ? points : []
  if (!rows.length) return null
  return {
    data: {
      labels: rows.map((row) => formatShortDate(row.date) || row.date),
      datasets: [
        {
          label: t('dashboard.advanced_analytics.chart_accuracy'),
          data: rows.map((row) => asNullableNumber(row.accuracy)),
          borderColor: colors.accentStrong,
          backgroundColor: `${colors.accentStrong}22`,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      ...lineOptions(colors),
      scales: {
        ...lineOptions(colors).scales,
        y: {
          ...lineOptions(colors).scales.y,
          max: 100,
        },
      },
    },
  }
}

function buildBreakdownChart(breakdown, t, colors) {
  const source = breakdown && typeof breakdown === 'object' ? breakdown : {}
  const slices = [
    { key: 'matched', label: t('dashboard.advanced_analytics.breakdown_matched'), color: colors.matched },
    { key: 'mismatch', label: t('dashboard.advanced_analytics.breakdown_mismatch'), color: colors.mismatch },
    { key: 'skipped', label: t('dashboard.advanced_analytics.breakdown_skipped'), color: colors.skipped },
    { key: 'uncertain', label: t('dashboard.advanced_analytics.breakdown_uncertain'), color: colors.uncertain },
    { key: 'extra', label: t('dashboard.advanced_analytics.breakdown_extra'), color: colors.extra },
  ]
    .map((slice) => ({ ...slice, value: asNumber(source[slice.key]) }))
    .filter((slice) => slice.value > 0)

  if (!slices.length) return null

  return {
    data: {
      labels: slices.map((slice) => slice.label),
      datasets: [{
        data: slices.map((slice) => slice.value),
        backgroundColor: slices.map((slice) => slice.color),
        borderWidth: 0,
      }],
    },
    options: doughnutOptions(colors),
    slices,
    total: asNumber(source.evaluated || source.total),
  }
}

function classificationSummary(classifications, t) {
  const source = classifications && typeof classifications === 'object' ? classifications : {}
  const parts = []
  if (asNumber(source.mismatch) > 0) {
    parts.push(t('dashboard.advanced_analytics.class_mismatch', { n: source.mismatch }))
  }
  if (asNumber(source.skipped) > 0) {
    parts.push(t('dashboard.advanced_analytics.class_skipped', { n: source.skipped }))
  }
  if (asNumber(source.uncertain) > 0) {
    parts.push(t('dashboard.advanced_analytics.class_uncertain', { n: source.uncertain }))
  }
  return parts.join(' · ')
}

function buildAttentionRows(items, t) {
  if (!Array.isArray(items)) return []
  return items.map((item, index) => {
    const accuracy = asNullableNumber(item.accuracy)
    return {
      key: item.key || `${item.surah_number}:${item.ayah_number}:${index}`,
      surah_number: asNumber(item.surah_number),
      surah_name: String(item.surah_name || ''),
      surah_name_ar: String(item.surah_name_ar || ''),
      ayah_number: asNumber(item.ayah_number),
      label: t('dashboard.advanced_analytics.ayah_ref', {
        surah: item.surah_name || item.surah_number,
        ayah: item.ayah_number,
      }),
      accuracy,
      accuracy_label: accuracy == null
        ? t('dashboard.advanced_analytics.value_unavailable')
        : t('dashboard.advanced_analytics.percent_value', { n: accuracy }),
      tone: accuracy == null ? 'neutral' : (accuracy >= 90 ? 'strong' : (accuracy >= 75 ? 'mixed' : 'weak')),
      attempts: asNumber(item.attempts),
      attempts_label: t('dashboard.advanced_analytics.attempts_n', { n: asNumber(item.attempts) }),
      classifications_label: classificationSummary(item.classifications, t),
      last_at: item.last_attempted_at || item.detected_at || null,
      last_label: item.last_attempted_at || item.detected_at
        ? formatShortDate(String(item.last_attempted_at || item.detected_at).slice(0, 10))
        : '',
      practise_href: String(item.practise_href || ''),
    }
  })
}

function buildSurahRows(items, sort = 'recent') {
  const rows = Array.isArray(items) ? [...items] : []
  if (sort === 'progress') {
    rows.sort((a, b) => asNumber(b.memorised_percent) - asNumber(a.memorised_percent)
      || asNumber(b.practised_percent) - asNumber(a.practised_percent))
  } else {
    rows.sort((a, b) => String(b.last_practised_at || '').localeCompare(String(a.last_practised_at || '')))
  }
  return rows.map((item) => ({
    ...item,
    practised_percent: Math.max(0, Math.min(100, asNumber(item.practised_percent))),
    memorised_percent: Math.max(0, Math.min(100, asNumber(item.memorised_percent))),
    last_label: item.last_practised_at
      ? formatShortDate(String(item.last_practised_at).slice(0, 10))
      : '',
  }))
}

export function buildAdvancedAnalyticsView(report, t, { surahSort = 'recent' } = {}) {
  const payload = report && typeof report === 'object' ? report : {}
  const overview = payload.overview || {}
  const series = payload.series || {}
  const colors = themeColors()
  const practiceChart = buildPracticeChart(series.practice_activity, t, colors)
  const sessionMixChart = buildSessionMixChart(series.session_mix, t, colors)
  const aiChart = buildAiPerformanceChart(series.ai_performance, t, colors)
  const breakdownChart = buildBreakdownChart(series.assessment_breakdown, t, colors)
  const attention = buildAttentionRows(payload.attention_ayahs, t)
  const insights = resolveInsights(payload.insights, t)
  const surahProgress = buildSurahRows(series.surah_progress, surahSort)

  const hasPractice = asNumber(overview.practice_time_seconds) > 0
    || asNumber(overview.ayahs_practised) > 0
    || asNumber(overview.revision_sessions) > 0
    || asNumber(overview.practice_days) > 0
    || (Array.isArray(series.practice_activity) && series.practice_activity.some((row) => asNumber(row.sessions) > 0))

  const hasAi = asNumber(overview.ai_checks) > 0
    || (Array.isArray(series.ai_performance) && series.ai_performance.length > 0)

  return {
    period: payload.period || null,
    periodLabel: formatPeriodLabel(payload.period, t),
    userName: String(payload.user?.display_name || '').trim(),
    overview,
    cards: buildOverviewCards(overview, t),
    practiceChart,
    sessionMixChart,
    aiChart,
    breakdownChart,
    surahProgress,
    attention,
    insights,
    hasPractice,
    hasAi,
    isEmpty: !hasPractice && !hasAi && !surahProgress.length,
    colors,
  }
}

export { themeColors, formatDuration }
