import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attentionHomeworkIds,
  buildAttentionItems,
  childHomeworkPill,
  countUrgent,
  feedbackExcludingAttention,
  homeStatusSubtitle,
  homeworkExcludingAttention,
  homeworkRowStatusClass,
  isDueSoon,
  upcomingHomeworkRows,
  weeklyProgressCards,
} from '../../resources/js/scripts/parent/homeDashboard.js'

const t = (key, vars = {}) => {
  const strings = {
    'parent.home_status_urgent': '{count} items need your attention.',
    'parent.home_status_urgent_one': '1 item needs your attention.',
    'parent.home_status_upcoming': 'No urgent updates. {count} assignments coming up.',
    'parent.home_status_upcoming_one': 'No urgent updates. 1 assignment coming up.',
    'parent.home_status_clear': 'No pending homework or unread updates.',
    'parent.home_status_no_children': 'Link a child to get started.',
    'parent.attention_overdue': '{task} is past the deadline.',
    'parent.attention_overdue_when': '{task} was due {when}.',
    'parent.attention_due': '{task} is due {when}.',
    'parent.attention_due_soon': 'Due within 48 hours.',
    'parent.attention_open_homework': 'See homework',
    'parent.attention_open_messages': 'Open messages',
    'parent.attention_open_progress': 'View progress',
    'parent.attention_messages_name': 'Teacher messages',
    'parent.attention_messages_one': '1 unread message',
    'parent.attention_messages': '{count} unread messages',
    'parent.attention_why_overdue': 'overdue-reason',
    'parent.attention_why_due_soon': 'due-reason',
    'parent.attention_why_feedback': 'feedback-reason',
    'parent.attention_why_messages': 'messages-reason',
    'parent.attention_why_attendance': 'attendance-reason',
    'parent.attention_attendance_detail': '{status} on {when}',
    'parent.attendance_absent': 'Absent',
    'parent.attendance_late': 'Late',
    'parent.nav_learning': 'Homework',
    'parent.homework_overdue': 'Past the deadline',
    'parent.child_private': 'Private',
    'parent.child_overdue_one': '1 overdue',
    'parent.child_overdue': '{count} overdue',
    'parent.child_due_week_one': '1 due this week',
    'parent.child_due_week': '{count} due this week',
    'parent.child_on_track': 'On track',
    'parent.child_caught_up': 'All caught up',
    'parent.home_weekly_progress': '{done} of {total} done',
    'parent.home_weekly_progress_none': 'None due',
    'parent.home_weekly_practice': '{count} ayahs',
    'parent.home_weekly_practice_one': '1 ayah',
    'parent.home_weekly_practice_none': 'No practice',
  }
  return strings[key]?.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? '')) ?? key
}

const formatWhen = () => 'Mon'
const activityName = () => 'Hifz'
const passageLabel = () => 'Al-Fatiha'

test('home status matrix', () => {
  const now = new Date('2026-01-10T12:00:00Z')
  const dueLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()

  assert.match(
    homeStatusSubtitle(t, { homework: [{ overdue: true }], hasChildren: true }, now),
    /needs your attention/,
  )
  assert.equal(
    homeStatusSubtitle(t, { homework: [{ overdue: false, due_at: dueLater }], hasChildren: true }, now),
    'No urgent updates. 1 assignment coming up.',
  )
  assert.equal(homeStatusSubtitle(t, { homework: [], hasChildren: true }, now), stringsClear())
  assert.equal(homeStatusSubtitle(t, { hasChildren: false }, now), 'Link a child to get started.')
})

function stringsClear() {
  return 'No pending homework or unread updates.'
}

test('attention sort order and reasons', () => {
  const now = new Date('2026-01-10T12:00:00Z')
  const items = buildAttentionItems({
    t,
    formatWhen,
    activityName,
    passageLabel,
    messageUnread: 1,
    attendanceAlerts: [{ child_id: 1, child_name: 'Adam', date: '2026-01-09', status: 'absent' }],
    homework: [
      { id: 1, child_id: 1, child_name: 'Adam', overdue: false, due_at: new Date(now.getTime() + 12 * 3600000).toISOString(), activity: 'hifz' },
      { id: 2, child_id: 1, child_name: 'Adam', overdue: true, due_at: now.toISOString(), activity: 'hifz' },
    ],
    feedback: [{ id: 9, child_id: 1, child_name: 'Adam', excerpt: 'Nice work', unread: true }],
  }, now)

  assert.deepEqual(items.map((row) => row.kind), ['overdue', 'due_soon', 'feedback', 'attendance', 'messages'])
  assert.equal(items[0].reason, 'overdue-reason')
  assert.equal(countUrgent({ homework: [{ overdue: true }], feedback: [{ unread: true }], messageUnread: 1 }, now), 3)
})

test('homework and feedback dedupe against attention queue', () => {
  const attention = [
    { id: 'overdue-2', kind: 'overdue' },
    { id: 'feedback-9', kind: 'feedback' },
  ]
  const homework = [
    { id: 2, overdue: true, due_at: '2026-01-01T00:00:00Z' },
    { id: 3, overdue: false, due_at: '2026-01-12T00:00:00Z' },
  ]
  assert.deepEqual(homeworkExcludingAttention(homework, attention).map((row) => row.id), [3])
  assert.equal(attentionHomeworkIds(attention).has(2), true)

  const feedback = [
    { id: 9, unread: true },
    { id: 10, unread: false },
  ]
  assert.deepEqual(feedbackExcludingAttention(feedback, attention).map((row) => row.id), [10])
})

test('weekly cards use per-child snapshot data', () => {
  const cards = weeklyProgressCards(t, [
    { id: 1, name: 'Adam', permissions: { progress: true, assignments: true }, weekly: { completed: 2, due: 1, practice_ayahs: 4 } },
    { id: 2, name: 'Sara', permissions: { progress: true, assignments: true }, weekly: { completed: 0, due: 0, practice_ayahs: 0 } },
  ])
  assert.equal(cards.length, 1)
  assert.equal(cards[0].label, '2 of 3 done')
})

test('upcoming homework skips overdue', () => {
  const rows = upcomingHomeworkRows([
    { id: 1, overdue: true, due_at: '2026-01-01T00:00:00Z' },
    { id: 2, overdue: false, due_at: '2026-01-12T00:00:00Z' },
    { id: 3, overdue: false, due_at: '2026-01-11T00:00:00Z' },
  ])
  assert.deepEqual(rows.map((row) => row.id), [3, 2])
})

test('child pill states', () => {
  const now = new Date('2026-01-10T12:00:00Z')
  const child = { id: 1, permissions: { assignments: true }, assignments: { active: 2 } }
  const homework = [
    { child_id: 1, overdue: true, due_at: now.toISOString() },
    { child_id: 1, overdue: false, due_at: new Date(now.getTime() + 3 * 86400000).toISOString() },
  ]
  assert.equal(childHomeworkPill(t, child, homework, now).text, '1 overdue')

  const weekChild = { id: 1, permissions: { assignments: true }, assignments: { active: 1 } }
  const weekHomework = [{ child_id: 1, overdue: false, due_at: new Date(now.getTime() + 2 * 86400000).toISOString() }]
  assert.match(childHomeworkPill(t, weekChild, weekHomework, now).text, /due this week/)

  const clearChild = { id: 1, permissions: { assignments: true }, assignments: { active: 0 } }
  assert.equal(childHomeworkPill(t, clearChild, [], now).text, 'All caught up')
})

test('due soon window', () => {
  const now = new Date('2026-01-10T12:00:00Z')
  assert.equal(isDueSoon({ due_at: new Date(now.getTime() + 36 * 3600000).toISOString() }, now), true)
  assert.equal(isDueSoon({ due_at: new Date(now.getTime() + 72 * 3600000).toISOString() }, now), false)
})

test('homework badges distinguish work in progress, review, completion and overdue work', () => {
  assert.equal(homeworkRowStatusClass({ status: 'pending' }), 'is-open')
  assert.equal(homeworkRowStatusClass({ status: 'in_progress' }), 'is-open')
  assert.equal(homeworkRowStatusClass({ status: 'awaiting_confirmation' }), 'is-wait')
  assert.equal(homeworkRowStatusClass({ status: 'completed' }), 'is-ok')
  assert.equal(homeworkRowStatusClass({ status: 'in_progress', overdue: true }), 'is-late')
})
