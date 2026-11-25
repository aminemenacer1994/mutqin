import assert from 'node:assert/strict'
import test from 'node:test'
import {
  STUDENT_PROGRESS_SECTION_IDS,
  buildProgressOverviewGroups,
  filterWeakPassagesForDisplay,
  flattenProgressOverviewStats,
  mapWordingPassageRows,
  progressMetricDisplay,
  progressOverviewLeadLine,
  wordingTrendSummary,
} from '../../resources/js/scripts/dashboard/studentProgressView.js'
import { progressWindowFromSearch, studentDashboardUrlForPane } from '../../resources/js/scripts/dashboard/studentDashboardNavigation.js'

const t = (key, params = {}) => {
  if (key === 'dashboard.progress_recitation_wording_summary') {
    return `${params.n} passages ${params.direction}`
  }
  if (key === 'dashboard.progress_recitation_wording_raw') return `${params.n} raw`
  if (key === 'dashboard.progress_recitation_wording_empty') return 'empty'
  if (key === 'dashboard.progress_wording_improving') return 'improving'
  if (key === 'dashboard.progress_period_heading') return `last ${params.days} days`
  if (key === 'dashboard.progress_wording_sample') return `${params.n} checks`
  if (key === 'dashboard.progress_overview_lead_quiet') return 'quiet'
  return key
}

test('progress metric display uses em dash for empty period values', () => {
  assert.equal(progressMetricDisplay(0, { treatZeroAsEmpty: true }), '—')
  assert.equal(progressMetricDisplay(3), '3')
})

test('overview groups separate lifetime memorised from period checks', () => {
  const groups = buildProgressOverviewGroups(t, {
    memorised: { value: 12, period_days: null },
    revised: { value: 4, period_days: 7 },
    recited: { value: 2, period_days: 7 },
    ai_checks: { value: 40, period_value: 5, period_days: null },
  }, { periodDays: 7 })
  assert.equal(groups.lifetime[0].value, '12')
  assert.equal(groups.period.find((row) => row.key === 'ai_checks').value, '5')
  assert.equal(groups.period.find((row) => row.key === 'revised').value, '4')
})

test('wording summary skips steady judgement for a single passage', () => {
  const raw = wordingTrendSummary(t, { comparable_passages: 1, direction: 'steady' })
  assert.match(raw, /1 raw/)
  const trend = wordingTrendSummary(t, { comparable_passages: 2, direction: 'improving' })
  assert.match(trend, /improving/)
})

test('overview stat cards use compact values and lifetime scope', () => {
  const groups = buildProgressOverviewGroups(t, {
    memorised: { value: 5, period_days: null },
    revised: { value: 0, period_days: 7 },
    recited: { value: 2, period_days: 7 },
    ai_checks: { value: 0, period_value: 0 },
  }, { periodDays: 7 })
  const cards = flattenProgressOverviewStats(groups)
  assert.equal(cards.find((row) => row.metricKey === 'memorised').scope, 'lifetime')
  assert.equal(cards.find((row) => row.metricKey === 'revised').value, '—')
})

test('wording rows expose sample size instead of raw strings only', () => {
  const rows = mapWordingPassageRows(t, [{
    label: 'Al-Fatiha · 1',
    first: 82,
    latest: 90,
    checks: 3,
    direction: 'up',
    latest_at: '2026-01-01T00:00:00Z',
  }])
  assert.match(rows[0].sampleLabel, /3/)
  assert.equal(rows[0].directionClass, 'is-improving')
})

test('overview lead stays quiet without activity', () => {
  const line = progressOverviewLeadLine(t, {
    revised: { value: 0, period_days: 7 },
    recited: { value: 0, period_days: 7 },
    ai_checks: { period_value: 0 },
  }, { periodDays: 7 })
  assert.match(line, /quiet|dashboard.progress_overview_lead_quiet/)
})

test('weak passages respect minimum evidence', () => {
  const rows = filterWeakPassagesForDisplay([
    { id: 1, count: 1 },
    { id: 2, count: 2 },
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 2)
})

test('progress window persists in dashboard url', () => {
  assert.equal(progressWindowFromSearch('?tab=progress&window=week'), 'week')
  const url = studentDashboardUrlForPane({ href: 'http://localhost/progress' }, 'progress', { progressWindow: 'month' })
  assert.match(url, /tab=progress/)
  assert.match(url, /window=month/)
  assert.doesNotMatch(studentDashboardUrlForPane({ href: 'http://localhost/progress?window=week' }, 'home'), /window=/)
})

assert.deepEqual(STUDENT_PROGRESS_SECTION_IDS, [
  'dash-progress',
  'progress-memorisation',
  'progress-recitation',
  'progress-feedback',
  'achievements',
])

console.log('student-progress-view.test.mjs: ok')