import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../resources/js/components/teacher/TeacherOverviewSection.vue', import.meta.url), 'utf8')
const template = source.slice(source.indexOf('<template>'), source.indexOf('<script>'))

const kpi = template.indexOf('TeacherKpiGrid')
const queue = template.indexOf('teacher-overview-queue')
const priorities = template.indexOf('teacher.today_priorities')
const columns = template.indexOf('teacher-overview-columns')
const insights = template.indexOf('<details class="teacher-insights">')

assert.ok(kpi < queue && queue < priorities && priorities < columns && columns < insights)
for (const key of [
  'today_chip_recitations',
  'today_chip_clear_overdue',
  'today_chip_clear_plans',
  'today_chip_messages',
  'overview_completions_empty',
  'open-reviews',
  'hifz_class_title',
  'overview_outstanding_revision',
  'overview_plan_progress',
  'overview_recent_completions',
]) {
  assert.match(source, new RegExp(key))
}
assert.doesNotMatch(template, /overview_task_status/)

const css = readFileSync(new URL('../../resources/js/views/TeacherDashboard.css', import.meta.url), 'utf8')
assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/)
assert.match(css, /@media \(max-width: 1100px\)[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(css, /@media \(max-width: 720px\)[\s\S]*teacher-overview-facts__grid--quad \{ grid-template-columns: 1fr; \}/)

console.log('teacher-overview-layout.test.mjs: ok')
