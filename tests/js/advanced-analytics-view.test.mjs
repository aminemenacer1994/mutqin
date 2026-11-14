import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

async function loadModule(relPath) {
  const absolute = path.join(root, relPath)
  return import(pathToFileURL(absolute).href)
}

const { toQueryParams, formatPeriodLabel, defaultRangeParams } = await loadModule(
  'resources/js/scripts/advancedAnalytics/dateRange.js',
)
const { resolveInsights } = await loadModule(
  'resources/js/scripts/advancedAnalytics/insightsCopy.js',
)

test('default range is last 30 days', () => {
  assert.deepEqual(defaultRangeParams(), { range: '30', from: '', to: '' })
})

test('custom range query params', () => {
  assert.deepEqual(
    toQueryParams({ range: 'custom', from: '2026-01-01', to: '2026-01-15' }),
    { range: 'custom', from: '2026-01-01', to: '2026-01-15' },
  )
})

test('period label uses i18n key', () => {
  const label = formatPeriodLabel(
    { preset: '30', from: '2026-01-01', to: '2026-01-30', label_days: 30 },
    (key, params) => `${key}:${params.days}`,
  )
  assert.equal(label, 'dashboard.advanced_analytics.period_days:30')
})

test('insights resolve known keys only', () => {
  const t = (key, params = {}) => {
    if (key.includes('insight_ai_improved')) return `improved ${params.points}`
    return key
  }
  const rows = resolveInsights([
    { key: 'ai_accuracy_improved', params: { points: 8 }, tone: 'trend' },
    { key: 'unknown_thing', params: {}, tone: 'trend' },
  ], t)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].text, 'improved 8')
})
