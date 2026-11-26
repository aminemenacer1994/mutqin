import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const studentExperience = readFileSync(new URL('../../resources/js/views/Dashboard.student.css', import.meta.url), 'utf8')
const filters = readFileSync(new URL('../../resources/js/components/dashboard/StudentActivityFilters.vue', import.meta.url), 'utf8')

assert.match(dashboard, /student-activity__toolbar/, 'Activity uses the shared toolbar layout')
assert.match(dashboard, /student-activity__tabs dash-range-toggle/, 'Category filters use range-toggle tabs')
assert.match(dashboard, /activity_filter_notes/, 'Notes category uses the canonical label')
assert.match(dashboard, /dash-history__toggle-row/, 'Long histories expose show more controls')
assert.match(dashboard, /history_more|collapseHistory/, 'Show more and collapse history are wired')
assert.match(dashboard, /activityOutcome\(item\)/, 'Rows surface stored outcomes')
assert.match(dashboard, /studentPane !== 'activity'/, 'Dedicated Activity pane drops the duplicate collapsible heading')
assert.match(filters, /dash-filter-field/, 'Advanced filters use shared field primitives')
assert.match(studentExperience, /student-activity__toolbar/, 'Student experience CSS targets the toolbar primitive')
assert.doesNotMatch(studentExperience, /student-activity__filters/, 'Obsolete activity filter class hooks were removed')

console.log('phase7-student-activity.test.mjs: ok')