const DUE_SOON_MS = 48 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function isHomeworkOverdue(row) {
  return Boolean(row?.overdue)
}

export function isDueSoon(row, now = new Date()) {
  if (!row?.due_at || isHomeworkOverdue(row)) return false
  const due = new Date(row.due_at)
  if (Number.isNaN(due.getTime())) return false
  const delta = due.getTime() - now.getTime()
  return delta > 0 && delta <= DUE_SOON_MS
}

export function isDueThisWeek(row, now = new Date()) {
  if (!row?.due_at || isHomeworkOverdue(row)) return false
  const due = new Date(row.due_at)
  if (Number.isNaN(due.getTime())) return false
  const delta = due.getTime() - now.getTime()
  return delta > 0 && delta <= WEEK_MS
}

export function homeworkForChild(homework, childId) {
  return (homework || []).filter((row) => Number(row.child_id) === Number(childId))
}

export function countUrgent({ homework = [], feedback = [], messageUnread = 0 } = {}, now = new Date()) {
  const overdue = (homework || []).filter(isHomeworkOverdue).length
  const dueSoon = (homework || []).filter((row) => isDueSoon(row, now)).length
  const unreadFeedback = (feedback || []).filter((row) => row.unread).length
  const unreadMessages = Number(messageUnread || 0)
  return overdue + dueSoon + unreadFeedback + unreadMessages
}

export function countUpcomingHomework(homework = [], now = new Date()) {
  return (homework || []).filter((row) => !isHomeworkOverdue(row) && (row.due_at || row.status !== 'completed')).length
}

export function homeStatusSubtitle(t, { homework = [], feedback = [], messageUnread = 0, hasChildren = true } = {}, now = new Date()) {
  if (!hasChildren) return t('parent.home_status_no_children')
  const urgent = countUrgent({ homework, feedback, messageUnread }, now)
  if (urgent > 0) {
    return urgent === 1 ? t('parent.home_status_urgent_one') : t('parent.home_status_urgent', { count: urgent })
  }
  const upcoming = (homework || []).filter((row) => !isHomeworkOverdue(row)).length
  if (upcoming > 0) {
    return upcoming === 1 ? t('parent.home_status_upcoming_one') : t('parent.home_status_upcoming', { count: upcoming })
  }
  return t('parent.home_status_clear')
}

export function buildAttentionItems({
  t,
  homework = [],
  feedback = [],
  messageUnread = 0,
  formatWhen,
  activityName,
  passageLabel,
}, now = new Date()) {
  const items = []

  ;(homework || []).filter(isHomeworkOverdue).forEach((row) => {
    const task = [activityName(t, row.activity), passageLabel(row)].filter(Boolean).join(' · ')
    items.push({
      id: `overdue-${row.id}`,
      rank: 0,
      kind: 'overdue',
      icon: 'bi bi-exclamation-circle',
      childId: row.child_id,
      name: row.child_name,
      detail: task
        ? t('parent.attention_overdue_when', { task, when: formatWhen(row.due_at) || t('parent.homework_overdue') })
        : t('parent.attention_overdue', { task: t('parent.nav_learning') }),
      action: t('parent.attention_open_homework'),
    })
  })

  ;(homework || []).filter((row) => isDueSoon(row, now)).forEach((row) => {
    const task = [activityName(t, row.activity), passageLabel(row)].filter(Boolean).join(' · ')
    items.push({
      id: `due-soon-${row.id}`,
      rank: 1,
      kind: 'due_soon',
      icon: 'bi bi-alarm',
      childId: row.child_id,
      name: row.child_name,
      detail: task
        ? t('parent.attention_due', { task, when: formatWhen(row.due_at) })
        : t('parent.attention_due_soon'),
      action: t('parent.attention_open_homework'),
    })
  })

  ;(feedback || []).filter((row) => row.unread).forEach((row) => {
    items.push({
      id: `feedback-${row.id}`,
      rank: 2,
      kind: 'feedback',
      icon: 'bi bi-chat-square-text',
      childId: row.child_id,
      name: row.child_name,
      detail: row.excerpt,
      action: t('parent.attention_open_progress'),
    })
  })

  const unread = Number(messageUnread || 0)
  if (unread > 0) {
    items.push({
      id: 'unread-messages',
      rank: 3,
      kind: 'messages',
      icon: 'bi bi-chat-heart',
      childId: null,
      name: t('parent.attention_messages_name'),
      detail: unread === 1 ? t('parent.attention_messages_one') : t('parent.attention_messages', { count: unread }),
      action: t('parent.attention_open_messages'),
    })
  }

  return items.sort((a, b) => a.rank - b.rank || String(a.name).localeCompare(String(b.name)))
}

export function upcomingHomeworkRows(homework = [], limit = 5, now = new Date()) {
  return (homework || [])
  .filter((row) => !isHomeworkOverdue(row))
  .slice()
  .sort((a, b) => {
    if (a.due_at && b.due_at) return new Date(a.due_at) - new Date(b.due_at)
    if (a.due_at) return -1
    if (b.due_at) return 1
    return Number(a.id) - Number(b.id)
  })
  .slice(0, limit)
}

export function latestFeedbackRows(feedback = [], limit = 3) {
  return (feedback || []).slice(0, limit)
}

export function childHomeworkPill(t, child, homework = [], now = new Date()) {
  if (!child.permissions?.assignments) {
    return { tone: 'quiet', icon: 'bi bi-lock', text: t('parent.child_private') }
  }
  const rows = homeworkForChild(homework, child.id)
  const overdue = rows.filter(isHomeworkOverdue).length
  const dueWeek = rows.filter((row) => isDueThisWeek(row, now)).length
  const active = Number(child.assignments?.active || 0)

  if (overdue > 0) {
    return {
      tone: 'late',
      icon: 'bi bi-exclamation-circle',
      text: overdue === 1 ? t('parent.child_overdue_one') : t('parent.child_overdue', { count: overdue }),
    }
  }
  if (dueWeek > 0) {
    return {
      tone: 'open',
      icon: 'bi bi-calendar-week',
      text: dueWeek === 1 ? t('parent.child_due_week_one') : t('parent.child_due_week', { count: dueWeek }),
    }
  }
  if (active > 0) {
    return { tone: 'ok', icon: 'bi bi-check-circle', text: t('parent.child_on_track') }
  }
  return { tone: 'ok', icon: 'bi bi-check-circle', text: t('parent.child_caught_up') }
}

export function homeworkRowStatusClass(row, now = new Date()) {
  if (isHomeworkOverdue(row)) return 'is-late'
  if (isDueSoon(row, now)) return 'is-open'
  return 'is-wait'
}