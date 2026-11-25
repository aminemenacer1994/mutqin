import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const teacherCss = readFileSync(new URL('../../resources/js/views/TeacherDashboard.css', import.meta.url), 'utf8')
const studentPremium = readFileSync(new URL('../../resources/js/views/Dashboard.student-premium.css', import.meta.url), 'utf8')
const studentExperience = readFileSync(new URL('../../resources/js/views/Dashboard.student-experience.css', import.meta.url), 'utf8')
const learnerCss = readFileSync(new URL('../../resources/js/views/Dashboard.learner-teacher.css', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../../resources/views/layouts/app.blade.php', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../../resources/js/components/teacher/LearnerSettingsSection.vue', import.meta.url), 'utf8')
const teacherDash = readFileSync(new URL('../../resources/js/views/TeacherDashboard.vue', import.meta.url), 'utf8')
const parentDash = readFileSync(new URL('../../resources/js/views/ParentDashboard.vue', import.meta.url), 'utf8')

assert.match(dashboard, /data-platform-shell="student"/)
assert.match(dashboard, /teacher-dashboard__layout/)
assert.match(dashboard, /teacher-dashboard__main dash-reveal/)
assert.match(dashboard, /variant="desktop"[\s\S]*?style="--dash-delay: 40ms"/)
assert.match(dashboard, /variant="mobile"/)
assert.match(dashboard, /StudentPageHeading[\s\S]*section-id="learning"/)
assert.match(dashboard, /StudentPageHeading[\s\S]*section-id="progress"/)
assert.match(dashboard, /StudentPageHeading[\s\S]*section-id="activity"/)
assert.match(dashboard, /StudentPageHeading[\s\S]*section-id="messages"/)
assert.doesNotMatch(dashboard, /user-dashboard__shell[^>]*grid-template-columns/)

assert.match(teacherCss, /\[data-platform-shell="student"\]\.teacher-dashboard \.teacher-dashboard__shell\.container-fluid[\s\S]*?display: block !important/)
assert.match(teacherCss, /\[data-platform-shell="student"\]\.teacher-dashboard \.teacher-dashboard__shell\.container-fluid[\s\S]*?max-width: var\(--content-max\)/)
assert.match(teacherCss, /teacher-nav__link\.dash-jump__link\.is-active/, 'Student nav active state follows TeacherNav semantics')

assert.doesNotMatch(studentPremium, /1760px/, 'Student shell uses the shared content max width')
assert.match(studentPremium, /max-width: var\(--content-max/)
assert.doesNotMatch(studentPremium, /user-dashboard__shell\.container-fluid[\s\S]*?grid-template-columns: 208px/, 'Legacy shell sidebar grid removed')
assert.doesNotMatch(studentPremium, /\.dash-jump[\s\S]*?grid-column: 1/, 'Navigation is owned by teacher-dashboard__layout')

assert.match(studentExperience, /padding: 28px 0 48px !important/, 'Desktop shell padding matches teacher workspace rhythm')
assert.doesNotMatch(studentExperience, /padding: 36px 0 72px !important/)

for (const css of [studentExperience, learnerCss]) {
  assert.doesNotMatch(css, /\.dash-jump \{\s*[\s\S]{0,120}?border: 1px solid/, `${css.includes('experience') ? 'experience' : 'learner'}: dash-jump container styles defer to TeacherNav`)
}

assert.match(learnerCss, /\.dash-jump:not\(\.teacher-nav\)/, 'Learner jump-bar hooks do not style TeacherNav twice')

assert.match(layout, /globalNavUsesWorkspaceHomeLabel/, 'Global header separates site Home from workspace Home')
assert.match(settings, /ParentPlatformSwitch/, 'Student settings exposes authorised platform switching')

assert.match(teacherDash, /teacher-dashboard__main dash-reveal/)
assert.match(parentDash, /teacher-dashboard__main dash-reveal/)

console.log('phase2-student-app-shell-navigation.test.mjs: ok')