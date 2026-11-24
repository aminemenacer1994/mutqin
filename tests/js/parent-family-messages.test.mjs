import assert from 'node:assert/strict'
import test from 'node:test'
import {
  contextFeedbackForThread,
  conversationKey,
  createSearchDebouncer,
  filterConversations,
  matchContextFeedback,
} from '../../resources/js/scripts/parent/messages.js'
import { formatConversationWhen } from '../../resources/js/scripts/parent/dashboard.js'

test('createSearchDebouncer batches search updates', async () => {
  let runs = 0
  const debouncer = createSearchDebouncer(20)
  debouncer.push(() => { runs += 1 })
  debouncer.push(() => { runs += 1 })
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(runs, 1)
  debouncer.cancel()
})

test('conversationKey is stable per teacher and child', () => {
  assert.equal(conversationKey({ teacher_id: 3, child_id: 9 }), '3-9')
})

test('filterConversations respects child filter, unread toggle, and search', () => {
  const rows = [
    { teacher_id: 1, child_id: 10, teacher_name: 'Umar', child_name: 'Aisha', preview: 'Salaam', unread: 2 },
    { teacher_id: 2, child_id: 11, teacher_name: 'Fatima', child_name: 'Yusuf', preview: 'Homework', unread: 0 },
  ]
  assert.equal(filterConversations(rows, { selectedId: 10 }).length, 1)
  assert.equal(filterConversations(rows, { unreadOnly: true }).length, 1)
  assert.equal(filterConversations(rows, { query: 'homework' }).length, 1)
  assert.equal(filterConversations(rows, { query: 'missing' }).length, 0)
})

test('contextFeedbackForThread hides formal feedback already present in the thread', () => {
  const feedback = [{ child_id: 10, teacher_id: 1, excerpt: 'Good tajweed' }]
  const active = { child_id: 10, teacher_id: 1 }
  const messages = [{ body: 'Good tajweed on the first ayah.' }]
  assert.equal(contextFeedbackForThread(feedback, active, messages), null)
  assert.deepEqual(contextFeedbackForThread(feedback, active, []), feedback[0])
})

test('matchContextFeedback only links feedback for the active thread', () => {
  const feedback = [
    { child_id: 10, teacher_id: 1, excerpt: 'Good tajweed' },
    { child_id: 11, teacher_id: 2, excerpt: 'Repeat surah' },
  ]
  const active = { child_id: 10, teacher_id: 1, teacher_name: 'Umar', child_name: 'Aisha' }
  assert.deepEqual(matchContextFeedback(feedback, active), feedback[0])
  assert.equal(matchContextFeedback(feedback, { child_id: 10, teacher_id: 99 }), null)
})

test('formatConversationWhen shows time for today and date otherwise', () => {
  const now = new Date()
  const earlier = new Date(now)
  earlier.setDate(now.getDate() - 3)
  assert.match(formatConversationWhen(now.toISOString()), /\d/)
  assert.match(formatConversationWhen(earlier.toISOString()), /[A-Za-z]/)
})