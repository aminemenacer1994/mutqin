export const PRACTICE_THRESHOLD = 90
export const ALL_TAB_COMPLETED_PREVIEW = 3
export const FEEDBACK_READ_STORAGE_KEY = 'mutqin.learner.feedback.read'

function startOfLocalDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Monday-based week start (matches Carbon default). */
function startOfLocalWeek(date) {
  const d = startOfLocalDay(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function endOfLocalWeek(date) {
  const start = startOfLocalWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function isDueThisWeek(dueAt, now = new Date()) {
  if (!dueAt) return false
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return false
  const start = startOfLocalWeek(now).getTime()
  const end = endOfLocalWeek(now).getTime()
  const ms = due.getTime()
  return ms >= start && ms <= end
}

function daysUntilDueStartOfDay(dueAt, now = new Date()) {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return null
  const today = startOfLocalDay(now).getTime()
  const dueDay = startOfLocalDay(due).getTime()
  return Math.round((dueDay - today) / 86400000)
}

/**
 * @param {number} done
 * @param {number} total all tasks due this week (incl. pending)
 */
export function weeklyProgressPercent(done, total) {
  const completed = Math.max(0, Number(done) || 0)
  const goal = Math.max(0, Number(total) || 0)
  if (goal <= 0) return completed > 0 ? 100 : 0
  if (completed >= goal) return 100
  return Math.round((completed / goal) * 100)
}

export function practiceAgainVariant(accuracyPercent, threshold = PRACTICE_THRESHOLD) {
  if (accuracyPercent === null || accuracyPercent === undefined) return 'secondary'
  return Number(accuracyPercent) < threshold ? 'primary' : 'secondary'
}

function parseTime(value) {
  const ms = Date.parse(value || '')
  return Number.isNaN(ms) ? null : ms
}

function dueSortKey(row) {
  const due = row?.assignment?.due_at
  if (!due) return Number.MAX_SAFE_INTEGER
  const ms = parseTime(due)
  return ms === null ? Number.MAX_SAFE_INTEGER : ms
}

function completedSortKey(row) {
  const at = row?.teacher_approved_at || row?.completed_at
  const ms = parseTime(at)
  return ms === null ? 0 : ms
}

/**
 * @param {Array<object>} assignments
 * @param {{ isTeacherApproved: (row: object) => boolean, isPending: (row: object) => boolean }} helpers
 */
export function sortAllTabAssignments(assignments, helpers) {
  const pending = assignments
    .filter((row) => helpers.isPending(row) && !helpers.isTeacherApproved(row))
    .sort((a, b) => dueSortKey(a) - dueSortKey(b) || Number(a.id) - Number(b.id))

  const completed = assignments
    .filter((row) => helpers.isTeacherApproved(row))
    .sort((a, b) => completedSortKey(b) - completedSortKey(a) || Number(b.id) - Number(a.id))

  return { pending, completed }
}

/**
 * @param {{ pending: object[], completed: object[] }} groups
 * @param {number} [preview=ALL_TAB_COMPLETED_PREVIEW]
 */
export function buildAllTabList(groups, preview = ALL_TAB_COMPLETED_PREVIEW) {
  const completedShown = groups.completed.slice(0, preview)
  const completedHidden = Math.max(0, groups.completed.length - completedShown.length)
  return {
    items: [...groups.pending, ...completedShown],
    hiddenCompletedCount: completedHidden,
    totalCompleted: groups.completed.length,
  }
}

/**
 * Earliest pending assignment for "Next:" line.
 */
export function pickNextPendingAssignment(assignments, isPending, isTeacherApproved) {
  return assignments
    .filter((row) => isPending(row) && !isTeacherApproved(row))
    .sort((a, b) => dueSortKey(a) - dueSortKey(b) || Number(a.id) - Number(b.id))[0] || null
}

export function daysUntilDueLabel(dueAt, now = new Date()) {
  return daysUntilDueStartOfDay(dueAt, now)
}

/** Matches LearnerTeacherSection tab "Done" semantics. */
export function isLearnerTaskApproved(row) {
  return row?.status === 'completed' && (row?.review_state === 'approved' || !row?.student_submitted_at)
}

/**
 * Weekly header strip — tasks due this calendar week (incl. pending).
 * @param {Array<object>} assignments
 * @param {(row: object) => boolean} [isTeacherApproved]
 * @param {Date} [now]
 */
export function learnerWeeklyProgressFromAssignments(
  assignments,
  isTeacherApproved = isLearnerTaskApproved,
  now = new Date(),
) {
  const list = (Array.isArray(assignments) ? assignments : []).filter((row) =>
    isDueThisWeek(row?.assignment?.due_at, now),
  )
  const total = list.length
  const done = list.filter(isTeacherApproved).length
  return { done, total, percent: weeklyProgressPercent(done, total) }
}

/**
 * @returns {{ kind: 'retry_requested' } | { kind: 'extra_attempt', remaining: number } | null}
 */
export function learnerAttemptHint(row) {
  if (row?.review_state === 'needs_correction') {
    return { kind: 'retry_requested' }
  }
  const target = Number(row?.progress?.target || 0)
  const completed = Number(row?.progress?.activity_count ?? row?.progress?.completed ?? 0)
  if (!target || completed >= target) return null
  return { kind: 'extra_attempt', remaining: target - completed }
}

/** @returns {'redo'|'resume'|'start'} */
export function learnerPrimaryActionKey(row) {
  if (row?.review_state === 'needs_correction') return 'redo'
  if (row?.progress?.resume_available || row?.status === 'in_progress' || row?.started_at) return 'resume'
  return 'start'
}

/** @returns {'perfect'|'solid'|'low'|'neutral'} */
export function completionScoreBand(accuracyPercent) {
  if (accuracyPercent === null || accuracyPercent === undefined || Number.isNaN(Number(accuracyPercent))) {
    return 'neutral'
  }
  const n = Number(accuracyPercent)
  if (n >= 100) return 'perfect'
  if (n >= 70) return 'solid'
  return 'low'
}

export function mergeFeedbackReadState(items, localReadMap = {}) {
  return (items || []).map((item) => {
    const localReadAt = localReadMap[item.id]
    const readAt = localReadAt || item.read_at || null
    const unread = Boolean(item.unread) && !readAt
    return { ...item, read_at: readAt, unread }
  })
}

export function sortFeedbackInbox(items) {
  return [...items].sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
}

export function completionResultLink(result, t) {
  if (!result) return null
  const hasNote = Boolean(String(result.feedback_snippet || '').trim())
  const mistakes = Array.isArray(result?.attempt?.mistakes) ? result.attempt.mistakes : []
  const hasMistakeDetails = mistakes.length > 0 || Boolean(result.has_recitation_review)
  if (!hasNote && !hasMistakeDetails) return null
  if (hasNote && !hasMistakeDetails) {
    return { label: t('teacher.learner_view_feedback'), opensFeedback: true }
  }
  return {
    label: hasNote ? t('teacher.learner_view_feedback') : t('teacher.learner_view_results'),
    opensMistakeDetails: true,
    opensFeedback: hasNote,
  }
}

export function readFeedbackReadMap() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(FEEDBACK_READ_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

export function persistFeedbackRead(id, readAt = new Date().toISOString()) {
  if (typeof localStorage === 'undefined') return
  try {
    const map = readFeedbackReadMap()
    map[id] = readAt
    localStorage.setItem(FEEDBACK_READ_STORAGE_KEY, JSON.stringify(map))
  } catch (_) {
    // storage unavailable
  }
}
