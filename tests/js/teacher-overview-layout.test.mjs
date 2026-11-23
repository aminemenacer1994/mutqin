import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../resources/js/components/teacher/TeacherOverviewSection.vue', import.meta.url), 'utf8')
const template = source.slice(source.indexOf('<template>'), source.indexOf('<script>'))

const kpi = template.indexOf('TeacherKpiGrid')
const queue = template.indexOf('teacher-overview-queue')
const priorities = template.indexOf('teacher.today_priorities')
const columns = template.indexOf('teacher-overview-columns')
const trends = template.indexOf('teacher-overview-trends')

assert.ok(kpi < queue && queue < priorities && priorities < columns && columns < trends)
assert.equal((template.match(/<TeacherActivityChart/g) || []).length, 2, 'Overview keeps exactly the two approved trend charts below actionable content')
assert.match(template, /teacher\.assignment_completion_trend/)
assert.match(template, /teacher\.revision_consistency/)
assert.match(template, /chartDayOptions/)
assert.match(template, /:loading="trendLoading"/)
assert.match(template, /:error-message="trendError"/)
for (const key of [
  'today_chip_recitations',
  'today_chip_clear_overdue',
  'today_chip_clear_plans',
  'today_chip_messages',
  'open-reviews',
]) {
  assert.match(source, new RegExp(key))
}
assert.doesNotMatch(template, /overview_task_status/)

const css = readFileSync(new URL('../../resources/js/views/TeacherDashboard.css', import.meta.url), 'utf8')
assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/)
assert.match(css, /@media \(max-width: 1100px\)[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(css, /@media \(max-width: 720px\)[\s\S]*teacher-overview-facts__grid--quad \{ grid-template-columns: 1fr; \}/)
assert.match(css, /teacher-insights__charts \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(css, /@media \(max-width: 860px\)[\s\S]*teacher-insights__charts \{ grid-template-columns: minmax\(0, 1fr\); \}/)

const constants = readFileSync(new URL('../../resources/js/scripts/teacher/constants.js', import.meta.url), 'utf8')
assert.match(constants, /TEACHER_CHART_DAY_OPTIONS = \[7, 30, 90\]/)

console.log('teacher-overview-layout.test.mjs: ok')
