import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const achievements = readFileSync(new URL('../../resources/js/components/achievements/DashboardAchievementsWidget.vue', import.meta.url), 'utf8')

for (const id of [
  'dash-progress',
  'progress-memorisation',
  'progress-recitation',
  'progress-improve',
  'progress-feedback',
]) {
  assert.match(dashboard, new RegExp(`id="${id}"`), `progress page includes ${id}`)
}

assert.match(achievements, /id="achievements"/, 'achievements stay on the existing widget')
assert.match(dashboard, /id: 'achievements'/)

assert.match(dashboard, /data-testid="student-progress-hub"/)
assert.match(dashboard, /data-testid="review-focus-workspace"/)
assert.match(dashboard, /id="ai-recite-results"/)
assert.match(dashboard, /dash-learning__metrics/)
assert.match(dashboard, /progress_wording_not_tajweed/)
assert.match(dashboard, /canUseAdvancedAnalytics/)
assert.doesNotMatch(dashboard, /word_match_percent/)

console.log('student-progress-sections.test.mjs: ok')
