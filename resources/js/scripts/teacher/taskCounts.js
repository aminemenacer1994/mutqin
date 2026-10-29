import { TASK_STATE, taskStateFromTeacherItem } from './taskState'

function inferHifzCategory(assignment) {
  if (assignment?.kind === 'ai_recite') return 'sabqi'
  return Number(assignment?.repetition_target || 0) >= 5 ? 'manzil' : 'sabaq'
}

function normalizedStatus(status) {
  return status || 'pending'
}

/**
 * One row per assignment recipient (same shape as TeacherAssignmentsSection flatItems).
 * @param {Array<object>} rows assignment API rows
 */
export function flattenTeacherAssignmentRows(rows = []) {
  return (rows || []).flatMap((row) => {
    const assignment = row.assignment || {}
    const recipients = row.recipients || []
    return recipients.map((recipient) => {
      const status = normalizedStatus(recipient.status)
      const snapshot = taskStateFromTeacherItem(recipient, assignment)
      return {
        key: `${assignment.id}-${recipient.id}`,
        status,
        assignment,
        recipient,
        taskStateDisplay: snapshot.display,
        category: assignment.hifz_category || inferHifzCategory(assignment),
        dueAt: assignment.due_at || null,
        occurredAt: recipient.updated_at || assignment.created_at || '',
        messages: Array.isArray(recipient.messages) ? recipient.messages : [],
      }
    })
  })
}

/**
 * @param {ReturnType<typeof flattenTeacherAssignmentRows>} flat
 */
export function summarizeTeacherTaskCounts(flat = []) {
  const counts = flat.reduce((result, item) => {
    result.all += 1
    if (item.status === 'completed') result.done += 1
    else if (item.status === 'overdue') result.overdue += 1
    else if (item.status === 'in_progress') result.progress += 1
    else if (item.status === 'awaiting_confirmation') result.submitted += 1
    else result.waiting += 1
    return result
  }, { all: 0, waiting: 0, progress: 0, submitted: 0, overdue: 0, done: 0 })

  const outstanding = counts.all - counts.done

  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())
  let dueThisWeek = 0
  for (const item of flat) {
    if (item.status === 'completed') continue
    const due = item.dueAt ? new Date(item.dueAt) : null
    if (!due || Number.isNaN(due.getTime())) continue
    if (due >= weekStart && due <= weekEnd) dueThisWeek += 1
  }

  return { ...counts, outstanding, dueThisWeek }
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function unreadTaskMessagesCount(messages = []) {
  return (messages || []).filter((message) => message?.unread && message?.sender === 'student').length
}

/**
 * overdue → due today → submitted → in progress → not started → done
 * @param {Array<object>} items flat task rows with taskStateDisplay, dueAt, occurredAt, key
 */
export function sortTeacherTasksByUrgency(items = []) {
  const dueToday = (item) => {
    if (!item.dueAt || item.taskStateDisplay === TASK_STATE.DONE) return false
    const due = new Date(item.dueAt)
    if (Number.isNaN(due.getTime())) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDay = new Date(due)
    dueDay.setHours(0, 0, 0, 0)
    return dueDay.getTime() === today.getTime()
  }

  const rank = (item) => {
    if (item.taskStateDisplay === TASK_STATE.OVERDUE) return 0
    if (dueToday(item)) return 1
    if (item.taskStateDisplay === TASK_STATE.WAITING_REVIEW) return 2
    if (item.taskStateDisplay === TASK_STATE.IN_PROGRESS) return 3
    if (item.taskStateDisplay === TASK_STATE.NOT_STARTED) return 4
    return 5
  }

  return [...items].sort((a, b) => {
    const urgencyDifference = rank(a) - rank(b)
    if (urgencyDifference) return urgencyDifference
    const dateA = Date.parse(a.occurredAt || '') || 0
    const dateB = Date.parse(b.occurredAt || '') || 0
    return dateB - dateA || String(b.key).localeCompare(String(a.key), undefined, { numeric: true })
  })
}
