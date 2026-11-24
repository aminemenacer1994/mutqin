export const ACTIVITY_FILTER_DEFAULTS = Object.freeze({
  type: 'all',
  area: 'all',
  status: 'all',
  from: '',
  to: '',
  kind: '',
  page: 1,
})

const TYPE_KEYS = new Set(['all', 'session', 'assignment', 'ai_check', 'teacher_review'])
const AREA_KEYS = new Set(['all', 'nazra', 'hifz', 'tajweed', 'revision'])
const STATUS_KEYS = new Set(['all', 'completed', 'saved', 'interrupted', 'awaiting_review', 'reviewed', 'no_result'])

function normaliseChoice(value, allowed, fallback) {
  const raw = String(value || '').trim().toLowerCase()
  return allowed.has(raw) ? raw : fallback
}

export function activityItemDedupeKey(item) {
  const type = String(item?.type || 'unknown').trim().toLowerCase()
  const source = item?.source_id
  if (source !== undefined && source !== null && source !== '') return `${type}:${source}`
  const id = String(item?.id || '').trim()
  if (id) return `${type}:${id}`
  const occurred = String(item?.occurred_at || '')
  return `${type}:${occurred}`
}

function mergeActivityDuplicate(left, right) {
  const score = (row) => {
    let value = 0
    if (row?.surah_number) value += 4
    if (row?.href || row?.resume_href) value += 2
    if (row?.outcome_params && Object.keys(row.outcome_params).length) value += 1
    return value
  }
  return score(right) > score(left) ? right : left
}

export function dedupeActivityItems(items) {
  const list = Array.isArray(items) ? items : []
  const seen = new Map()
  list.forEach((item) => {
    const key = activityItemDedupeKey(item)
    const existing = seen.get(key)
    seen.set(key, existing ? mergeActivityDuplicate(existing, item) : item)
  })
  return [...seen.values()]
}

export function activityFiltersFromSearch(search) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const page = Math.max(1, Number.parseInt(params.get('activity_page') || '1', 10) || 1)
  return {
    type: normaliseChoice(params.get('activity_type'), TYPE_KEYS, ACTIVITY_FILTER_DEFAULTS.type),
    area: normaliseChoice(params.get('activity_area'), AREA_KEYS, ACTIVITY_FILTER_DEFAULTS.area),
    status: normaliseChoice(params.get('activity_status'), STATUS_KEYS, ACTIVITY_FILTER_DEFAULTS.status),
    from: String(params.get('activity_from') || '').trim(),
    to: String(params.get('activity_to') || '').trim(),
    kind: String(params.get('activity_kind') || '').trim(),
    page,
  }
}

export function activityActiveFilterCount(filters) {
  const f = filters || ACTIVITY_FILTER_DEFAULTS
  let count = 0
  if (f.area && f.area !== 'all') count += 1
  if (f.status && f.status !== 'all') count += 1
  if (f.from) count += 1
  if (f.to) count += 1
  if (f.kind) count += 1
  return count
}

export function activityFiltersActive(filters) {
  const f = filters || ACTIVITY_FILTER_DEFAULTS
  return f.type !== 'all'
    || f.area !== 'all'
    || f.status !== 'all'
    || Boolean(f.from || f.to || f.kind)
}

export function syncActivityFiltersUrl(locationLike, filters, { pane = 'activity' } = {}) {
  if (typeof window === 'undefined' || !window.URL) return ''
  const base = locationLike?.href || window.location.href
  const url = new URL(base, 'http://localhost')
  url.searchParams.set('tab', pane)

  const setOrDelete = (key, value, omitWhen) => {
    if (value === omitWhen || value === '' || value === undefined || value === null) url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
  }

  setOrDelete('activity_type', filters?.type, 'all')
  setOrDelete('activity_area', filters?.area, 'all')
  setOrDelete('activity_status', filters?.status, 'all')
  setOrDelete('activity_from', filters?.from, '')
  setOrDelete('activity_to', filters?.to, '')
  setOrDelete('activity_kind', filters?.kind, '')
  setOrDelete('activity_page', filters?.page, 1)

  return `${url.pathname}${url.search}${url.hash}`
}

export function activityHistoryGroupLabel(occurredAt, now = new Date()) {
  if (!occurredAt) return ''
  const date = new Date(occurredAt)
  if (Number.isNaN(date.getTime())) return ''
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  return 'date'
}