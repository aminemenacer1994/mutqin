import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const nav = readFileSync(new URL('../../resources/js/scripts/parent/navigation.js', import.meta.url), 'utf8')
const dashboard = readFileSync(new URL('../../resources/js/views/ParentDashboard.vue', import.meta.url), 'utf8')
const progress = readFileSync(new URL('../../resources/js/components/parent/ParentFamilyProgress.vue', import.meta.url), 'utf8')
const overview = readFileSync(new URL('../../resources/js/components/parent/ParentFamilyOverview.vue', import.meta.url), 'utf8')

assert.match(nav, /id: 'overview'/, 'Parent nav includes Home')
assert.match(nav, /id: 'children'/, 'Parent nav includes My Children')
assert.match(nav, /id: 'learning'/, 'Parent nav includes Homework')
assert.match(nav, /id: 'progress'/, 'Parent nav includes Progress')
assert.match(nav, /id: 'messages'/, 'Parent nav includes Messages')
assert.match(nav, /id: 'settings'/, 'Parent nav includes Settings')
assert.doesNotMatch(nav, /id: 'more'[\s\S]*label: 'parent.nav_more'/, 'More hub is not a primary nav destination')

assert.match(nav, /parentNavActiveView/, 'Parent nav active state maps child detail views')
assert.match(nav, /PARENT_CHILD_STORAGE_KEY/, 'Child selection persists across navigation')
assert.match(nav, /parentChildSelectorAllowsAll/, 'Child selector mode adapts by view')

assert.match(dashboard, /ParentChildContextBar/, 'Shell exposes persistent child context')
assert.match(dashboard, /:show-account="false"/, 'Account settings stay in primary nav')
assert.match(dashboard, /sessionStorage\.getItem\(PARENT_CHILD_STORAGE_KEY\)/, 'Child selection restores from session storage')

const homeHero = overview.match(/parent-home-hero[\s\S]*?<\/header>/)?.[0] || ''
assert.doesNotMatch(homeHero, /parent-hub-actions/, 'Home hero does not duplicate sidebar destinations')

assert.match(progress, /progress_section_attendance/, 'Progress surfaces attendance contextually')
assert.match(progress, /progress_current_learning/, 'Progress surfaces current learning')
assert.match(progress, /progress_section_homework/, 'Progress surfaces homework in period')
assert.match(progress, /progress_weak/, 'Progress surfaces teacher-confirmed weak areas')
assert.doesNotMatch(progress, /parent-progress-links/, 'Progress does not repeat bottom quick links')
assert.doesNotMatch(progress, /ParentChildFilter/, 'Progress does not duplicate shell child selector')

assert.match(dashboard, /progressWindow: 'week'/, 'Progress defaults to weekly overview')

console.log('phase1-parent-platform-navigation.test.mjs: ok')