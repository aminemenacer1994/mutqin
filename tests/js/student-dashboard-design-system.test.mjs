import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const studentCss = readFileSync(new URL('../../resources/js/views/Dashboard.learner-teacher.css', import.meta.url), 'utf8')
const teacherCss = readFileSync(new URL('../../resources/js/views/TeacherDashboard.css', import.meta.url), 'utf8')
const marker = '/* Student dashboard control system.'
const system = studentCss.slice(studentCss.lastIndexOf(marker))

assert.ok(system.startsWith(marker), 'The canonical student control system is present')
assert.ok(studentCss.lastIndexOf(marker) > studentCss.indexOf('Student workspace spacing foundation'), 'The canonical control layer wins the cascade')

for (const shared of [
  'var(--surface-strong',
  'var(--radius-card',
  'var(--radius-control',
  'var(--control-height',
  'var(--success-strong',
  'var(--warning-strong',
  'var(--danger-strong',
]) {
  assert.ok(teacherCss.includes(shared), `Teacher design system exposes ${shared}`)
  assert.ok(system.includes(shared), `Student design system reuses ${shared}`)
}

assert.match(system, /--dash-ds-control-height: var\(--control-height, 44px\)/, 'Standard controls share the teacher height token')
assert.match(system, /--dash-ds-control-height-sm: 36px/, 'Compact controls use one standard height')
assert.match(system, /--dash-ds-radius-card: var\(--radius-card, 12px\)/, 'Cards reuse the shared radius')
assert.match(system, /--dash-ds-radius-control: var\(--radius-control, 8px\)/, 'Controls reuse the shared radius')
assert.match(system, /--dash-ds-shadow-card: 0 2px 8px/, 'Cards use a restrained shadow')
assert.match(system, /--workspace-gradient: var\(--dash-ds-accent\)/, 'Shared teacher active-control styling resolves to the student accent')

assert.match(system, /:is\(\.dash-btn--primary, \.btn-primary, \.learner-teacher__icon-hit--primary\)/, 'Primary actions share one semantic variant')
assert.match(system, /:is\(\.dash-btn--secondary, \.dash-btn--ghost, \.btn-outline-secondary\)/, 'Secondary actions share one semantic variant')
assert.match(system, /:is\(\.dash-btn--tertiary, \.btn-link, \.dash-text-link, \.dash-link\)/, 'Tertiary actions share one semantic variant')
assert.match(system, /:is\(\.dash-btn--danger, \.btn-danger, \.btn-outline-danger\)/, 'Destructive actions share one semantic variant')
assert.match(system, /:hover:not\(:disabled\)/, 'Interactive hover states exclude disabled controls')
assert.match(system, /:focus-visible[\s\S]*?outline: 2px solid var\(--dash-ds-focus\)/, 'Keyboard focus is consistently visible')
assert.match(system, /\[aria-disabled="true"\]/, 'ARIA disabled controls receive the disabled treatment')
assert.match(system, /\[aria-busy="true"\]/, 'Loading controls expose a shared busy treatment')
assert.match(system, /@keyframes dash-ds-spin/, 'Loading icons use one motion treatment')

assert.match(system, /\.dash-jump__link\.is-active,[\s\S]*?\.learner-teacher__filter\.is-active,[\s\S]*?\.dash-drawer__filter\.is-active/, 'Active navigation, filters and modal tabs share an obvious selected state')
assert.match(system, /\.learner-home__today,[\s\S]*?#dash-my-learning,[\s\S]*?#dash-progress,[\s\S]*?#dash-activity/, 'All four dashboard pages share the card surface primitive')
assert.match(system, /\.learner-home__status,[\s\S]*?\.dash-revisit__state,[\s\S]*?\.dash-strength/, 'Badges and statuses share one geometry')
assert.match(system, /\.form-control, \.form-select, \.dash-drawer__search-input/, 'Inputs and selects share one form primitive')
assert.match(system, /\.dash-section__collapse, \.dash-card__collapse, \.learner-teacher__instruct > summary/, 'Accordions share one interaction primitive')
assert.match(system, /\.learner-teacher__progress-meter,[\s\S]*?\.learner-my-plan__meter,[\s\S]*?\.dash-ai-results__meter/, 'Progress indicators share one track primitive')
assert.match(system, /\.dash-modal-root\.user-dashboard :is\(\.dash-modal, \.dash-drawer, \.dash-student-dialog--thread\)/, 'Student modals and drawers share one surface primitive')

assert.match(system, /--dash-ds-success-soft: var\(--success-soft/, 'Success has a shared semantic surface')
assert.match(system, /--dash-ds-warning-soft: var\(--warning-soft/, 'Warning has a shared semantic surface')
assert.match(system, /--dash-ds-danger-soft: var\(--danger-soft/, 'Error has a shared semantic surface')
assert.match(system, /--dash-ds-pending-soft: var\(--dash-ds-accent-soft\)/, 'Pending remains a neutral brand state')
assert.match(system, /\.learner-teacher__ai-score-badge,[\s\S]*?background: var\(--dash-ds-pending-soft\)/, 'AI wording results remain visually neutral rather than teacher-approved')
assert.match(system, /\.learner-teacher__card-note\.is-correction[\s\S]*?var\(--dash-ds-warning\)/, 'Teacher correction requests keep a distinct warning treatment')
assert.match(system, /html\[data-theme="dark"\][\s\S]*?--dash-ds-surface: var\(--surface-2/, 'Dark mode uses the shared raised surface')

assert.doesNotMatch(system, /\.dash-word|\.teacher-quran-ayah__word|\.recitation-word-/, 'The shared component layer does not override Qur\'an word-level colours')
assert.match(studentCss, /\.recitation-word-incorrect|\.teacher-quran-ayah__word\.is-coaching-focus/, 'Existing Qur\'an word-level states remain available')
assert.doesNotMatch(studentCss, /learner-home__task-footer \.dash-btn \{ min-height: 40px/, 'The conflicting one-off 40px Home button was removed')
const studentExperience = readFileSync(new URL('../../resources/js/views/Dashboard.student-experience.css', import.meta.url), 'utf8')
assert.doesNotMatch(studentExperience, /learner-home__task-footer \.dash-btn \{[^}]*min-height: 40px/, 'Home task actions use the shared control height')
assert.match(studentExperience, /#dash-my-learning :is\([\s\S]*?overflow: visible/, 'My Learning cards keep focus rings visible')
assert.doesNotMatch(studentCss, /#dash-my-learning \.learner-teacher__filter \{ min-height: 38px/, 'The conflicting one-off 38px filter was removed')

console.log('student-dashboard-design-system.test.mjs: ok')
