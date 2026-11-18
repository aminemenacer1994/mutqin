import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../resources/js/scripts/composables/useTeacherDashboard.js', import.meta.url), 'utf8')
const dashboard = readFileSync(new URL('../../resources/js/views/TeacherDashboard.vue', import.meta.url), 'utf8')

const bootstrap = source.slice(source.indexOf('async function bootstrapData'), source.indexOf('function onHistoryNavigation'))
assert.match(bootstrap, /const epoch = navigationEpoch/, 'A page load records the navigation it started with')
assert.ok(bootstrap.indexOf('await loadOverview()') < bootstrap.indexOf('epoch !== navigationEpoch'), 'A newer navigation cancels the startup load')
assert.ok(bootstrap.lastIndexOf('epoch !== navigationEpoch') < bootstrap.indexOf('await loadProfile'), 'A startup profile load does not run after the teacher has moved on')

assert.match(source, /function openView[\s\S]*?noteNavigation\(\)/, 'Choosing a page counts as navigation')
assert.match(source, /function openStudent[\s\S]*?noteNavigation\(\)/, 'Opening a student counts as navigation')
assert.match(source, /function onHistoryNavigation[\s\S]*?noteNavigation\(\)/, 'Browser Back counts as navigation')
assert.match(source, /epoch !== navigationEpoch/, 'A finished request is ignored after a newer navigation')
assert.match(dashboard, /onProfileSection\(tab\) \{[\s\S]*?noteNavigation\(\)/, 'Changing a student tab counts as navigation')

console.log('teacher navigation guard ok')
