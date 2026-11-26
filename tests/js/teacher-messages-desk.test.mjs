import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const section = readFileSync(new URL('../../resources/js/components/teacher/TeacherMessagesSection.vue', import.meta.url), 'utf8')
const dash = readFileSync(new URL('../../resources/js/views/TeacherDashboard.vue', import.meta.url), 'utf8')

assert.match(section, /messages_tab_students/, 'Student messages tab')
assert.match(section, /messages_tab_parents/, 'Parent messages tab')
assert.match(section, /TeacherStudentProfileMessages/, 'Student thread reuses profile composer')
assert.match(section, /GuardianConversation/, 'Parent thread uses guardian conversation')
assert.match(section, /teacher-messages-desk__workspace/, 'Two-pane desk layout')

assert.match(dash, /:format-when="formatWhen"/, 'Desk messages receives formatWhen')
assert.doesNotMatch(dash, /openStudent\(id, 'messages'\)/, 'Messages no longer only deep-links to profile')

console.log('teacher messages desk ok')