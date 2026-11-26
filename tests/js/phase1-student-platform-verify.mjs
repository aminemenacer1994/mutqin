import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const circle = readFileSync(new URL('../../resources/js/components/teacher/LearnerCirclePanel.vue', import.meta.url), 'utf8')
const revision = readFileSync(new URL('../../resources/js/components/teacher/LearnerRevisionTargets.vue', import.meta.url), 'utf8')
const learner = readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherSection.vue', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../../resources/js/components/teacher/LearnerSettingsSection.vue', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../../resources/views/layouts/app.blade.php', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../resources/js/views/Dashboard.student.css', import.meta.url), 'utf8')

assert.match(dashboard, /learner-learning-connections__body/, 'My Learning connections use a dedicated body wrapper')
assert.match(learner, /LearnerRevisionTargets[\s\S]*embedded/, 'Revision targets render in embedded mode under My Teachers & Classes')
assert.doesNotMatch(
  dashboard,
  /learner-learning-connections__body[\s\S]*LearnerRevisionTargets/,
  'Revision targets are not duplicated on the Home connections hub',
)
assert.match(settings, /LearnerCirclePanel[\s\S]*hub/, 'Settings owns the teachers/classes circle hub')
assert.doesNotMatch(dashboard, /LearnerRevisionTargets,\s*\n\s*LearnerRevisionTargets,/, 'LearnerRevisionTargets is registered once in Dashboard')

assert.match(circle, /embedded[\s\S]*showLearning/, 'Circle panel supports embedded layout')
assert.match(circle, /dash-btn dash-btn--primary/, 'Circle panel uses shared dash buttons')
assert.match(revision, /learner-revision-targets--embedded/, 'Revision targets support embedded layout')
assert.match(learner, /showSecondaryDetailsAction/, 'Duplicate Details actions are suppressed')
assert.match(learner, /primary\.emit !== 'details'/, 'Details primary action hides the secondary Details button')

assert.match(layout, /globalNavUsesWorkspaceHomeLabel/, 'Global nav separates workspace Home from the public site link')
assert.match(css, /\.learner-learning-connections__body/, 'Connections body has layout rules')

console.log('phase1-student-platform-verify.mjs: ok')