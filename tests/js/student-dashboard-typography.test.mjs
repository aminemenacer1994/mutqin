import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('../../resources/js/views/Dashboard.learner-teacher.css', import.meta.url), 'utf8')

for (const token of [
  '--dash-type-page',
  '--dash-type-section',
  '--dash-type-card',
  '--dash-type-body',
  '--dash-type-secondary',
  '--dash-type-action',
  '--dash-type-stat',
  '--dash-type-arabic',
]) {
  assert.match(css, new RegExp(token), `Reusable typography token ${token} is defined`)
}

assert.match(css, /--dash-type-page:\s*clamp\(1\.625rem,[^;]+1\.875rem\)/, 'Page headings scale from 26px to 30px')
assert.match(css, /--dash-type-body:\s*1rem/, 'Desktop body text is 16px')
assert.match(css, /--dash-type-secondary:\s*0\.875rem/, 'Secondary text is at least 14px')
assert.match(css, /--dash-type-body:\s*0\.9375rem/, 'Responsive body text remains at least 15px')
assert.match(css, /var\(--dash-font-ar/, 'Arabic text preserves the dashboard Arabic font token')
assert.match(css, /font-feature-settings:\s*"liga" 1, "calt" 1, "kern" 1/, 'Arabic diacritics and shaping use appropriate font features')
assert.match(css, /\.dash-modal-root\.user-dashboard/, 'The typography scale also covers student modals')

console.log('student-dashboard-typography.test.mjs: ok')
