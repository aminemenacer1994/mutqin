import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url),'utf8')
const dashboard=read('resources/js/views/Dashboard.vue')
for(const role of ['Dashboard','TeacherDashboard','ParentDashboard']) {
 const source=read(`resources/js/views/${role}.vue`)
 assert.match(source, /container user-dashboard__shell teacher-dashboard__shell/)
 assert.match(source, /teacher-dashboard__layout/)
 assert.match(source, /teacher-dashboard__main dash-reveal/)
 assert.match(source, /variant="desktop"/)
 assert.match(source, /variant="mobile"/)
}
assert.match(dashboard, /data-platform-shell="student"/)
assert.doesNotMatch(dashboard, /nav-class="dash-jump"|link-class="dash-jump__link"/)
for(const pane of ['learning','practice','progress','activity','messages']) assert.ok(dashboard.includes(`:title="t('dashboard.jump_${pane}')"`))
assert.match(read('resources/views/layouts/app.blade.php'), /globalNavUsesWorkspaceHomeLabel/)
assert.match(read('resources/js/components/teacher/LearnerSettingsSection.vue'), /ParentPlatformSwitch/)
console.log('phase2-student-app-shell-navigation.test.mjs: ok')
