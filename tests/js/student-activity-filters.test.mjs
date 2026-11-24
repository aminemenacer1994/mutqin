import assert from 'node:assert/strict'
import {
  ACTIVITY_FILTER_DEFAULTS,
  activityFiltersFromSearch,
  activityItemDedupeKey,
  dedupeActivityItems,
  syncActivityFiltersUrl,
} from '../../resources/js/scripts/dashboard/studentActivity.js'

const base = { id: '1', occurred_at: '2026-01-01T10:00:00Z', type: 'session', source_id: 9 }

assert.equal(activityItemDedupeKey({ type: 'ai_check', source_id: 4 }), 'ai_check:4')

const merged = dedupeActivityItems([
  { ...base, id: 'session-9', source_id: 9, surah_number: null },
  { ...base, id: 'session-9', source_id: 9, surah_number: 112, surah_name: 'Al-Ikhlas' },
])
assert.equal(merged.length, 1)
assert.equal(merged[0].surah_number, 112)

const parsed = activityFiltersFromSearch('?tab=activity&activity_type=session&activity_area=hifz&activity_status=saved&activity_from=2026-01-01&activity_page=2')
assert.deepEqual(parsed, {
  type: 'session',
  area: 'hifz',
  status: 'saved',
  from: '2026-01-01',
  to: '',
  kind: '',
  page: 2,
})

const url = syncActivityFiltersUrl(
  { href: 'https://mutqin.test/progress?source=teacher&tab=home' },
  { ...ACTIVITY_FILTER_DEFAULTS, type: 'ai_check', area: 'revision', page: 3 },
)
assert.equal(url, '/progress?source=teacher&tab=activity&activity_type=ai_check&activity_area=revision&activity_page=3')

console.log('student-activity-filters.test.mjs: ok')