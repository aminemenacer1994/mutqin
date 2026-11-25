import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const studentCss = readFileSync(new URL('../../resources/js/views/Dashboard.student-experience.css', import.meta.url), 'utf8')
const view = readFileSync(new URL('../../resources/js/scripts/dashboard/studentProgressView.js', import.meta.url), 'utf8')

assert.match(dashboard, /student-progress__stats/, 'overview uses compact stat grid')
assert.match(dashboard, /student-progress__wording-trends/, 'wording uses trend rows')
assert.match(dashboard, /progress_teacher_tajweed_note/, 'teacher scores are labelled separately from AI wording')
assert.match(dashboard, /teacher\.hifz_sabaq/, 'memorisation stages expose Sabaq')
assert.doesNotMatch(studentCss, /#dash-progress \.dash-learning__metric \{[^}]*min-height: 124px/, 'oversized overview metric tiles removed')

assert.match(view, /mapWordingPassageRows/, 'wording helper is shared')
assert.match(view, /flattenProgressOverviewStats/, 'overview helper is shared')

console.log('phase6-student-progress.test.mjs: ok')