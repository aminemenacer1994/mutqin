import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import postcss from 'postcss'
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const entry = read('resources/sass/student-dashboard.scss')
const dashboard = read('resources/js/views/Dashboard.vue')
const tokens = read('resources/js/views/Dashboard.student-tokens.css')
const styles = ['Dashboard.student-tokens.css','Dashboard.learner-teacher.css','Dashboard.progress.css','Dashboard.student.css'].map(f=>read(`resources/js/views/${f}`))
for (const css of styles) {
  postcss.parse(css).walkDecls(d => {
    assert.ok(!/^--(?:teacher|workspace)-/.test(d.prop), `Student must inherit shared token ${d.prop}`)
  })
  assert.doesNotMatch(css, /\.dash-jump|\.user-dashboard__shell/, 'Shared navigation and shell own their styles')
}
assert.match(tokens, /--dash-ds-surface: var\(--teacher-surface\)/)
assert.match(tokens, /--dash-ds-radius-card: var\(--teacher-radius\)/)
assert.match(tokens, /--dash-ds-pending: var\(--teacher-warning\)/)
assert.match(tokens, /--dash-ds-info: var\(--sem-info-ink\)/)
assert.match(dashboard, /<TeacherKpiGrid/, 'Home metrics use shared structural layout')
assert.match(dashboard, /<TeacherPageHeader/, 'Page hierarchy uses shared headings')
assert.doesNotMatch(dashboard, /user-dashboard--progress|user-dashboard__content|nav-class="dash-jump"/, 'Legacy root and grid no longer compete with shared layout')
assert.doesNotMatch(entry, /student-premium|student-experience/)
for(const file of ['AppButton.vue','StudentPageHeading.vue']) assert.ok(!existsSync(new URL(`../../resources/js/components/dashboard/${file}`,import.meta.url)), `Unused duplicate ${file} removed`)
const achievement = read('resources/js/components/achievements/AchievementCard.vue')
assert.match(achievement, /state === 'unlocked' \? 'success' : 'brand'/, 'Progress colour describes completion, not achievement artwork')
console.log('student-dashboard-design-system.test.mjs: ok')
