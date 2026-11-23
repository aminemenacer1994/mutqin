import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')

assert.match(dashboard, /class="dash-history__link"/)
assert.match(dashboard, /history_less|collapseHistory/)
assert.match(dashboard, /recording_available === true/)
assert.match(dashboard, /resume_href/)
assert.match(dashboard, /teacher_review_status === 'pending'/)
assert.match(dashboard, /teacher_review_status === 'reviewed'/)
assert.doesNotMatch(dashboard, /<audio\b/)
assert.doesNotMatch(dashboard, /dash-history__filters/)
assert.doesNotMatch(dashboard, /dash-history__toolbar/)
assert.doesNotMatch(dashboard, /dash-history__saved/)
assert.doesNotMatch(dashboard, /activity_recording_kept[\s\S]{0,180}<audio/)

console.log('student-activity.test.mjs: ok')
