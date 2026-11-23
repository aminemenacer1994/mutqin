import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const hifz = readFileSync(new URL('../../resources/js/components/teacher/profile/TeacherHifzProgress.vue', import.meta.url), 'utf8')
const plan = readFileSync(new URL('../../resources/js/components/teacher/profile/TeacherStudentProfilePlan.vue', import.meta.url), 'utf8')
const assignments = readFileSync(new URL('../../resources/js/components/teacher/TeacherAssignmentsSection.vue', import.meta.url), 'utf8')
const counts = readFileSync(new URL('../../resources/js/scripts/teacher/taskCounts.js', import.meta.url), 'utf8')

const memorised = hifz.indexOf('hifz_summary_validated')
const learning = hifz.indexOf('hifz_summary_learning')
const revision = hifz.indexOf('hifz_summary_revision')
assert.ok(memorised > 0 && learning > memorised && revision > learning, 'Memorisation summary stays in teacher decision order')
assert.doesNotMatch(hifz, /hifz_of_mushaf/, 'Duplicated whole-Qur\'an coverage is not shown beside the current-level summary')
assert.match(hifz, /new_memorisation/, 'Sabaq uses the learning bucket')
assert.match(hifz, /recent_revision/, 'Sabqi uses the recent revision bucket')
assert.match(hifz, /older_revision/, 'Manzil uses the older revision bucket')
assert.match(hifz, /last_validated_at/, 'Teacher-validated memorisation retains its approval date')

assert.match(plan, /plan_revision_heading/, 'Revision recommendations are visible on the plan')
assert.match(plan, /assignRecommendation\(row\)/, 'A recommendation has one direct primary assignment action')
assert.match(plan, /openRecommendationEdit\(row\)/, 'A recommendation can be edited without a hidden menu')
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
