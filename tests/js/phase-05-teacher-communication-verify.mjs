import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const dashboard = read('resources/js/views/Dashboard.vue')
const notifier = read('app/Services/Learning/LearningTaskNotifier.php')
const messages = read('resources/js/components/teacher/LearnerStudentMessages.vue')

assert.match(messages, /learner-messages-workspace/, 'Messages workspace is present')
assert.match(messages, /directThreadUnreadCount/, 'Unread indicators on teacher threads')
assert.match(messages, /filterTeacherThreads/, 'Optional inbox search and unread filter')
assert.match(messages, /TeacherTaskConversation/, 'Thread reply UI reuses task conversation')
assert.match(messages, /:allow-recording="false"/, 'Student messages pane does not expose recording by default')

assert.match(dashboard, /id="progress-feedback"/, 'Progress surfaces teacher feedback')
assert.match(dashboard, /openHomeFeedback/, 'Home surfaces recent feedback actions')
assert.match(dashboard, /navBadges/, 'Unread feedback and DMs share the Messages nav badge')
assert.match(dashboard, /openLinkedLearnerRecord/, 'Dashboard consumes feedback and assignment deep links')
assert.match(dashboard, /openCircleTeacherMessage/, 'Circle message opens the Messages pane thread')
assert.match(dashboard, /params\.get\('teacher'\)/, 'Teacher-scoped message deep links')

assert.match(notifier, /dashboardHref/, 'In-app notices link back to dashboard with query params')
assert.match(notifier, /'feedback' => \(int\) \$note->id/, 'Feedback notices carry a feedback id deep link')
assert.match(notifier, /'assignment_recipient' => \(int\) \$recipient->id/, 'Assignment notices deep link to the task')

console.log('phase-05-teacher-communication-verify.mjs: ok')