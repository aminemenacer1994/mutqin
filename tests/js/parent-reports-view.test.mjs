import assert from 'node:assert/strict'
import test from 'node:test'
import { proseNeedsFold, prosePreview, periodMetricRowsFromReport } from '../../resources/js/scripts/parent/reportsView.js'

test('prose fold thresholds', () => {
  assert.equal(proseNeedsFold('Short note.'), false)
  assert.equal(proseNeedsFold('x'.repeat(161)), true)
  assert.equal(prosePreview('Hello world today'), 'Hello world today')
  assert.match(prosePreview(`${'word '.repeat(40)}end`), /…$/)
})

test('period metrics skip when KPIs rendered elsewhere', () => {
  const t = (key) => key
  const rows = periodMetricRowsFromReport(t, {
    assignments: { assigned: 2, completed: 1 },
    activity: { practice_rows: 3, revision_sessions: 1, memorised_in_period: 0 },
  })
  assert.equal(rows.length, 5)
})