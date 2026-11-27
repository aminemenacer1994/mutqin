import assert from 'node:assert/strict'
import test from 'node:test'
import {
  directThreadUnreadCount,
  filterTeacherThreads,
  mergeThreadMessages,
  patchThreadRow,
  sortTeacherThreads,
  threadLastActivityKind,
  threadLastAt,
  threadPreview,
} from '../../resources/js/scripts/teacher/learnerStudentMessages.js'

test('sortTeacherThreads orders by latest message activity', () => {
  const rows = [
    { teacher_id: 1, teacher_name: 'A', messages: [{ created_at: '2026-01-01T10:00:00Z', sender: 'teacher' }] },
    { teacher_id: 2, teacher_name: 'B', messages: [{ created_at: '2026-01-03T10:00:00Z', sender: 'teacher' }] },
  ]
  const sorted = sortTeacherThreads(rows)
  assert.equal(sorted[0].teacher_id, 2)
  assert.equal(sorted[1].teacher_id, 1)
})

test('directThreadUnreadCount counts teacher unread only', () => {
  const thread = {
    messages: [
      { sender: 'teacher', unread: true },
      { sender: 'student', unread: true },
      { sender: 'teacher', unread: false },
    ],
  }
  assert.equal(directThreadUnreadCount(thread), 1)
})

test('threadPreview and threadLastAt use the latest message', () => {
  const thread = {
    messages: [
      { created_at: '2026-01-01T10:00:00Z', body: 'Earlier' },
      { created_at: '2026-01-02T10:00:00Z', preview: 'Latest preview' },
    ],
  }
  assert.equal(threadPreview(thread), 'Latest preview')
  assert.equal(threadLastAt(thread), '2026-01-02T10:00:00Z')
})

test('mergeThreadMessages deduplicates by id and sorts chronologically', () => {
  const merged = mergeThreadMessages(
    [{ id: 1, created_at: '2026-01-02T10:00:00Z' }],
    [{ id: 1, created_at: '2026-01-02T10:00:00Z', body: 'Updated' }, { id: 2, created_at: '2026-01-03T10:00:00Z' }],
  )
  assert.equal(merged.length, 2)
  assert.equal(merged[0].id, 1)
  assert.equal(merged[1].id, 2)
})

test('patchThreadRow replaces messages for the matching teacher', () => {
  const next = patchThreadRow(
    [{ teacher_id: 4, messages: [] }, { teacher_id: 5, messages: [{ id: 9 }] }],
    5,
    [{ id: 10 }],
  )
  assert.equal(next[1].messages[0].id, 10)
})

test('filterTeacherThreads applies unread and search', () => {
  const rows = [
    { teacher_id: 1, teacher_name: 'Aya', messages: [{ sender: 'teacher', unread: true, body: 'Hi' }] },
    { teacher_id: 2, teacher_name: 'Omar', messages: [{ sender: 'teacher', unread: false, body: 'Salam' }] },
  ]
  assert.equal(filterTeacherThreads(rows, { unreadOnly: true }).length, 1)
  assert.equal(filterTeacherThreads(rows, { query: 'omar' })[0].teacher_id, 2)
})

test('threadLastActivityKind detects feedback and assignment threads', () => {
  assert.equal(
    threadLastActivityKind({ messages: [{ feedback_type: 'written_feedback' }] }),
    'feedback',
  )
  assert.equal(
    threadLastActivityKind({ messages: [{ task: { id: 3 }, message_kind: 'note' }] }),
    'assignment',
  )
  assert.equal(threadLastActivityKind({ messages: [{ body: 'Hi' }] }), '')
})

test('server unread total includes messages outside the loaded preview', () => {
  assert.equal(directThreadUnreadCount({ unread_count: 65, messages: [{ sender: 'teacher', unread: true }] }), 65)
  assert.equal(directThreadUnreadCount({ unread_count: 0, messages: [{ sender: 'teacher', unread: true }] }), 0)
})
