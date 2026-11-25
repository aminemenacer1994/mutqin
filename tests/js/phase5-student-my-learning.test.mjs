import assert from 'node:assert/strict'
import fs from 'node:fs'

const section = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherSection.vue', import.meta.url), 'utf8')
const workspace = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherWorkspace.css', import.meta.url), 'utf8')
const dashboard = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')

assert.match(section, /learner-teacher__assignments-toolbar/)
assert.match(section, /LearnerHifzOverview/)
assert.match(section, /LearnerRevisionTargets/)
assert.match(section, /learner-teacher__task-row__status.*pillClass/)
assert.match(section, /activeFilter === 'completed'[\s\S]*ALL_TAB_COMPLETED_PREVIEW/)
assert.doesNotMatch(dashboard, /learner-learning-connections-body[\s\S]*LearnerRevisionTargets/)
assert.match(dashboard, /connections_settings_manage/)
assert.match(workspace, /learner-teacher__assignments-toolbar__row/)
assert.match(workspace, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/)

console.log('phase5-student-my-learning.test.mjs: ok')