export const RANGE_PRESETS = [
  { key: '7', days: 7 },
  { key: '30', days: 30 },
  { key: '90', days: 90 },
  { key: 'all', days: null },
  { key: 'custom', days: null },
]

export function defaultRangeParams() {
  return { range: '30', from: '', to: '' }
}

export function toQueryParams({ range = '30', from = '', to = '' } = {}) {
  const preset = String(range || '30')
  if (preset === 'custom') {
    return {
      range: 'custom',
      from: String(from || '').slice(0, 10),
      to: String(to || '').slice(0, 10),
    }
  }
  return { range: preset }
}

export function formatPeriodLabel(period, t) {
  if (!period?.from || !period?.to) return ''
  const from = formatShortDate(period.from)
  const to = formatShortDate(period.to)
  if (period.preset === 'all') {
    return t('dashboard.advanced_analytics.period_all', { from, to })
  }
  if (period.preset === 'custom') {
    return t('dashboard.advanced_analytics.period_custom', { from, to })
  }
  const days = Number(period.label_days || period.preset || 0)
  if (days > 0) {
    return t('dashboard.advanced_analytics.period_days', { days, from, to })
  }
  return `${from} – ${to}`
}

export function formatShortDate(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
