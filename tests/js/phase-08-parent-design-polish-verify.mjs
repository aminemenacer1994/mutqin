import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const css = read('resources/js/views/TeacherDashboard.css')
const views = [
  'ParentFamilyOverview.vue',
  'ParentFamilyLearning.vue',
  'ParentFamilyProgress.vue',
  'ParentFamilyMessages.vue',
  'ParentFamilyReports.vue',
  'ParentFamilyMore.vue',
  'ParentFamilyChildren.vue',
  'ParentFamilySettings.vue',
]

for (const name of views) {
  const source = read(`resources/js/components/parent/${name}`)
  assert.match(source, /teacher-page-header/, `${name} uses shared page header`)
  assert.match(source, /teacher-page-header__title/, `${name} exposes a single page title`)
  assert.match(source, /teacher-stack/, `${name} uses teacher stack spacing`)
}

const messages = read('resources/js/components/parent/ParentFamilyMessages.vue')
const reports = read('resources/js/components/parent/ParentFamilyReports.vue')
assert.match(messages, /NetworkFallback/, 'Messages uses shared error recovery')
assert.match(reports, /NetworkFallback/, 'Reports uses shared error recovery')
assert.doesNotMatch(messages, /alert alert-danger/, 'Messages avoids bootstrap alert error chrome')
assert.doesNotMatch(reports, /alert alert-danger/, 'Reports avoids bootstrap alert error chrome')

const overview = read('resources/js/components/parent/ParentFamilyOverview.vue')
assert.doesNotMatch(overview, /parent-home-status-bar/, 'Home does not duplicate status under the hero')

const parentShellBlock = css.match(/\[data-platform-shell="parent"\]\.teacher-dashboard \{[\s\S]*?\n\}/)?.[0] || ''
assert.match(parentShellBlock, /background:\s*var\(--teacher-bg\)/, 'Parent shell uses flat teacher background')
assert.doesNotMatch(parentShellBlock, /radial-gradient/, 'Parent shell avoids ornamental background gradients')

assert.match(css, /\.parent-filters[\s\S]*border-radius: 16px/, 'Parent filter bars use compact teacher radii')
assert.match(css, /\[data-platform-shell="parent"\] \.parent-report__head[\s\S]*box-shadow: none/, 'Report heads avoid heavy card chrome')

console.log('phase-08-parent-design-polish-verify.mjs: ok')