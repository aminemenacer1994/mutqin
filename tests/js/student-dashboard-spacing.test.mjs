import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL(`../../resources/js/views/${p}`,import.meta.url),'utf8')
const tokens=read('Dashboard.student-tokens.css'), css=read('Dashboard.student.css'), dashboard=read('Dashboard.vue')
for(const n of [1,2,3,4,5,6]) assert.ok(tokens.includes(`--dash-space-${n}: var(--space-${n})`), 'Student spacing aliases inherit the established scale')
assert.match(tokens, /--dash-card-padding: var\(--teacher-panel-pad\)/)
assert.match(tokens, /--dash-section-gap: var\(--teacher-gap\)/)
assert.match(dashboard, /class="container user-dashboard__shell teacher-dashboard__shell"/)
assert.doesNotMatch(css, /\.teacher-dashboard__(?:layout|shell|main)\s*\{/, 'Shared shell geometry is inherited')
assert.match(css, /grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 14rem\), 1fr\)\)/, 'A single Home metric does not reserve unused columns')
assert.match(css, /scroll-margin-top: calc\(var\(--learner-header-height\) \+ var\(--space-6\)\)/)
console.log('student-dashboard-spacing.test.mjs: ok')
