import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAttentionItems,
  childHomeworkPill,
  countUrgent,
  homeStatusSubtitle,
  isDueSoon,
  upcomingHomeworkRows,
} from '../../resources/js/scripts/parent/homeDashboard.js'

const t = (key, vars = {}) => {
  const strings = {
    'parent.home_status_urgent': '{count} items need your attention.',
    'parent.home_status_urgent_one': '1 item needs your attention.',
    'parent.home_status_upcoming': 'No urgent updates — {count} upcoming assignments scheduled.',
    'parent.home_status_upcoming_one': 'No urgent updates — 1 upcoming assignment scheduled.',
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
    'parent.nav_learning': 'Homework',
    'parent.homework_overdue': 'Past the deadline',
    'parent.child_private': 'Private',
    'parent.child_overdue_one': '1 overdue',
    'parent.child_overdue': '{count} overdue',
    'parent.child_due_week_one': '1 due this week',
    'parent.child_due_week': '{count} due this week',
    'parent.child_on_track': 'On track',
    'parent.child_caught_up': 'All caught up',
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
    'No urgent updates — 1 upcoming assignment scheduled.',
  )
  assert.equal(homeStatusSubtitle(t, { homework: [], hasChildren: true }, now), stringsClear())
  assert.equal(homeStatusSubtitle(t, { hasChildren: false }, now), 'Link a child to get started.')
})

function stringsClear() {
  return 'No pending homework or unread updates.'
}

test('attention sort order', () => {
  const now = new Date('2026-01-10T12:00:00Z')
  const items = buildAttentionItems({
    t,
    formatWhen,
    activityName,
    passageLabel,
    messageUnread: 1,
    homework: [
      { id: 1, child_id: 1, child_name: 'Adam', overdue: false, due_at: new Date(now.getTime() + 12 * 3600000).toISOString(), activity: 'hifz' },
      { id: 2, child_id: 1, child_name: 'Adam', overdue: true, due_at: now.toISOString(), activity: 'hifz' },
    ],
    feedback: [{ id: 9, child_id: 1, child_name: 'Adam', excerpt: 'Nice work', unread: true }],
  }, now)

  assert.deepEqual(items.map((row) => row.kind), ['overdue', 'due_soon', 'feedback', 'messages'])
  assert.equal(countUrgent({ homework: [{ overdue: true }], feedback: [{ unread: true }], messageUnread: 1 }, now), 3)
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