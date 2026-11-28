import assert from 'node:assert/strict'
import fs from 'node:fs'

const dashboard = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const api = fs.readFileSync(new URL('../../resources/js/scripts/api/learning.js', import.meta.url), 'utf8')
const inbox = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerStudentNotifications.vue', import.meta.url), 'utf8')

assert.match(dashboard, /LearnerStudentNotifications/)
assert.match(dashboard, /studentPane === 'messages'[\s\S]*LearnerStudentNotifications/, 'Messages pane includes the notifications inbox')
assert.match(dashboard, /openStudentNotice/)
assert.match(dashboard, /studentNoticeUnread/)
assert.match(api, /getStudentNotifications/)
assert.match(api, /\/me\/notifications/)
assert.match(inbox, /markAllStudentNotificationsRead/)

console.log('student-notifications-inbox.test.mjs: ok')