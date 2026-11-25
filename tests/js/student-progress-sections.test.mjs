import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const progressView = readFileSync(new URL('../../resources/js/scripts/dashboard/studentProgressView.js', import.meta.url), 'utf8')
const achievements = readFileSync(new URL('../../resources/js/components/achievements/DashboardAchievementsWidget.vue', import.meta.url), 'utf8')

for (const id of [
  'dash-progress',
  'progress-memorisation',
  'progress-recitation',
  'progress-feedback',
]) {
  assert.match(dashboard, new RegExp(`id="${id}"`), `progress page includes ${id}`)
}

assert.doesNotMatch(dashboard, /id="progress-improve"/, 'improve section merged into memorisation')

assert.match(achievements, /id="achievements"/, 'achievements stay on the existing widget')
assert.match(dashboard, /id: 'achievements'/)

assert.match(dashboard, /data-testid="student-progress-hub"/)
assert.match(dashboard, /student-progress__chrome/)
assert.match(dashboard, /student-progress__tabs/)
assert.match(dashboard, /progressWindowFromSearch/)
assert.match(dashboard, /data-testid="review-focus-workspace"/)
assert.match(dashboard, /id="ai-recite-results"/)
assert.match(progressView, /progress_memorised_lifetime/)
assert.match(dashboard, /progress_wording_not_tajweed/)
assert.match(dashboard, /canUseAdvancedAnalytics/)
assert.doesNotMatch(dashboard, /word_match_percent/)

console.log('student-progress-sections.test.mjs: ok')