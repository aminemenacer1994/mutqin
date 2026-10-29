import assert from 'node:assert/strict'
import {
  canSendNow,
  createOptimisticMessage,
  groupThreadMessagesByDay,
  latestStudentMessageId,
  markOptimisticFailed,
  normalizeThreadMessages,
  readReceiptLabel,
  recordingStateReducer,
  sanitizeThreadText,
  shouldShowReadReceipt,
  threadUnreadCount,
} from '../../resources/js/scripts/teacher/learnerTaskThread.js'

const t = (key) => {
  if (key === 'teacher.message_sent_status') return 'Sent'
  if (key === 'teacher.learner_message_seen') return 'Seen'
  return key
}

assert.equal(sanitizeThreadText('<b>hi</b>'), 'hi')

const messages = normalizeThreadMessages([
  { id: 1, sender: 'teacher', body: 'Salam', created_at: '2026-03-10T10:00:00Z', unread: true },
  { id: 2, sender: 'student', body: 'Reply', created_at: '2026-03-10T10:05:00Z', delivery_status: 'sent' },
  { id: 3, sender: 'student', body: 'Later', created_at: '2026-03-11T09:00:00Z', read_at: '2026-03-11T09:01:00Z', delivery_status: 'read' },
], 42)

assert.equal(threadUnreadCount(messages), 1)

const groups = groupThreadMessagesByDay(messages, () => 'Today', 'en', new Date('2026-03-11T12:00:00Z'))
assert.equal(groups.length, 2)
assert.equal(groups[0].messages.length, 2)

const latestStudent = latestStudentMessageId(messages)
assert.equal(latestStudent, 3)
assert.equal(shouldShowReadReceipt(messages[1], messages), false)
assert.equal(shouldShowReadReceipt(messages[2], messages), true)
assert.equal(readReceiptLabel(messages[2], t), 'Seen')
assert.equal(readReceiptLabel(messages[1], t), 'Sent')

const optimistic = createOptimisticMessage(5, 'hello', null, 'client-1')
assert.equal(optimistic.pending, true)
const failed = markOptimisticFailed([optimistic], optimistic.id)
assert.equal(failed[0].failed, true)

assert.equal(canSendNow(Date.now() - 500), false)
assert.equal(canSendNow(Date.now() - 5000), true)

assert.equal(recordingStateReducer('idle', 'request'), 'requesting')
assert.equal(recordingStateReducer('requesting', 'start'), 'recording')
assert.equal(recordingStateReducer('recording', 'stop'), 'recorded')
assert.equal(recordingStateReducer('recorded', 'discard'), 'idle')
assert.equal(recordingStateReducer('idle', 'permission_denied'), 'error')

console.log('learner-task-thread.test.mjs: ok')
