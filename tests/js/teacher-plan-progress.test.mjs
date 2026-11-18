import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const hifz = readFileSync(new URL('../../resources/js/components/teacher/profile/TeacherHifzProgress.vue', import.meta.url), 'utf8')
const plan = readFileSync(new URL('../../resources/js/components/teacher/profile/TeacherStudentProfilePlan.vue', import.meta.url), 'utf8')
const assignments = readFileSync(new URL('../../resources/js/components/teacher/TeacherAssignmentsSection.vue', import.meta.url), 'utf8')
const counts = readFileSync(new URL('../../resources/js/scripts/teacher/taskCounts.js', import.meta.url), 'utf8')

const knows = hifz.indexOf('hifz_step_knows')
const sabaq = hifz.indexOf('hifz_sabaq')
const sabqi = hifz.indexOf('hifz_sabqi')
const manzil = hifz.indexOf('hifz_manzil')
const weak = hifz.indexOf('hifz_weak')
const next = hifz.indexOf('hifz_next_lesson')
assert.ok(knows > 0 && sabaq > knows && sabqi > sabaq && manzil > sabqi && weak > manzil && next > weak, 'Memorisation lines stay in teaching order')
assert.match(hifz, /hifz_of_mushaf/, 'Whole-Qur\'an coverage stays secondary')
assert.match(hifz, /new_memorisation/, 'Sabaq uses the learning bucket')
assert.match(hifz, /recent_revision/, 'Sabqi uses recent validated revision')
assert.match(hifz, /older_revision/, 'Manzil uses older validated revision')

assert.match(plan, /plan_revision_heading/, 'Revision recommendations are visible on the plan')
assert.match(plan, /plan_snooze/, 'A recommendation can be snoozed')
assert.match(plan, /plan_dismiss/, 'A recommendation can be dismissed')
assert.match(plan, /plan_revision_history/, 'Earlier recommendations stay available')
assert.match(plan, /plan_following/, 'Plan cards answer whether the student is following the plan')
const planTemplate = plan.slice(plan.indexOf('<template>'), plan.indexOf('<script>'))
assert.doesNotMatch(planTemplate, /assignTeacherRevisionRecommendation/, 'The plan view does not assign revision until the teacher chooses it')
assert.match(plan, /syncTeacherRevisionRecommendations/, 'Recommendations are loaded without creating a task')

assert.doesNotMatch(assignments, /repetition_target/, 'Assignment category does not come from the repetition count')
assert.match(assignments, /recording_required/, 'A recording requirement stays visible')
assert.doesNotMatch(counts, /repetition_target/, 'Shared task rows use the stored category')

console.log('teacher plan progress ok')
