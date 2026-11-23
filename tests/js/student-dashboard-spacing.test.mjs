import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../../resources/js/views/Dashboard.learner-teacher.css', import.meta.url), 'utf8')
const foundation = css.slice(css.indexOf('/* Student workspace spacing foundation.'))

assert.ok(foundation.length > 0, 'The student workspace has a shared spacing foundation')

for (const [token, value] of [
  ['--dash-space-1', '4px'],
  ['--dash-space-2', '8px'],
  ['--dash-space-3', '12px'],
  ['--dash-space-4', '16px'],
  ['--dash-space-6', '24px'],
  ['--dash-space-8', '32px'],
]) {
  assert.match(foundation, new RegExp(`${token}: ${value.replace('px', 'px')}`), `${token} uses the agreed spacing scale`)
}

assert.match(foundation, /--dash-card-padding: var\(--dash-space-6\)/, 'Desktop cards use 24px padding')
assert.match(foundation, /--dash-section-gap: var\(--dash-space-8\)/, 'Desktop major sections use 32px rhythm')
assert.match(foundation, /@media \(max-width: 767\.98px\)[\s\S]*?--dash-card-padding: var\(--dash-space-4\)/, 'Mobile cards use 16px padding')
assert.match(foundation, /\.learner-workspace \.dash-pane\.user-dashboard__content[\s\S]*?gap: var\(--dash-section-gap\)/, 'All four dashboard panes share the major-section gap')
assert.match(foundation, /#dash-my-learning > \.dash-section__body[\s\S]*?padding: var\(--dash-card-padding\)/, 'My Learning uses the shared card inset')
assert.match(foundation, /#dash-progress \.dash-learning__body[\s\S]*?gap: var\(--dash-related-gap\)/, 'Progress groups related metrics consistently')
assert.match(foundation, /#dash-activity \.dash-history__link[\s\S]*?padding: var\(--dash-space-3\) var\(--dash-space-2\)/, 'Activity rows use compact scale values without excess height')
assert.match(foundation, /\.dash-review-workspace[\s\S]*?padding: var\(--dash-card-padding\) !important/, 'AI feedback and Arabic review content receive a consistent outer inset')
assert.match(foundation, /\.learner-my-plan[\s\S]*?padding: var\(--dash-card-padding\)/, 'Learning plans use the shared card inset')
assert.match(foundation, /\.dash-modal-root\.user-dashboard :is\([\s\S]*?\.dash-modal__body[\s\S]*?padding-block-end: var\(--dash-section-gap\)/, 'Modal content preserves breathing room above actions')
assert.match(foundation, /\.learner-self-assessment__actions[\s\S]*?padding-block-start: var\(--dash-space-2\)/, 'Self-assessment actions are separated from form content')
assert.match(foundation, /\.teacher-task-conversation__composer-foot--learner button[\s\S]*?min-height: calc\(var\(--dash-space-6\) \* 2\)/, 'Conversation actions align to a robust touch-sized height')

console.log('student-dashboard-spacing.test.mjs: ok')
