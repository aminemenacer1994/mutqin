import { formatTeacherWhen } from './formatters'

export const TASK_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_REVIEW: 'WAITING_REVIEW',
  DONE: 'DONE',
  OVERDUE: 'OVERDUE',
}

function startOfLocalDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfLocalDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isDuePastEndOfDay(dueAt) {
  if (!dueAt) return false
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return false
  return Date.now() > endOfLocalDay(due).getTime()
}

export function daysUntilDueStartOfDay(dueAt, now = new Date()) {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return null
  const today = startOfLocalDay(now).getTime()
  const dueDay = startOfLocalDay(due).getTime()
  return Math.round((dueDay - today) / 86400000)
}

/**
 * @param {object|null|undefined} row recipient / assignment row from API
 */
export function resolveBaseTaskState(row) {
  const status = row?.status || 'pending'
  const reviewState = row?.review_state

  if (status === 'completed' && (reviewState === 'approved' || !row?.student_submitted_at)) {
    return TASK_STATE.DONE
  }

  if (status === 'awaiting_confirmation' || reviewState === 'submitted') {
    return TASK_STATE.WAITING_REVIEW
  }

  if (
    reviewState === 'needs_correction'
    || status === 'in_progress'
    || status === 'overdue'
  ) {
    return row?.started_at ? TASK_STATE.IN_PROGRESS : TASK_STATE.NOT_STARTED
  }

  if (row?.started_at || status === 'in_progress') {
    return TASK_STATE.IN_PROGRESS
  }

  return TASK_STATE.NOT_STARTED
}

export function isTaskDoneState(state) {
  return state === TASK_STATE.DONE
}

export function isOverdueOverlay(row, baseState = resolveBaseTaskState(row)) {
  if (isTaskDoneState(baseState)) return false
  return isDuePastEndOfDay(row?.assignment?.due_at)
}

export function resolveDisplayTaskState(row) {
  const base = resolveBaseTaskState(row)
  if (isOverdueOverlay(row, base)) return TASK_STATE.OVERDUE
  return base
}

export function taskStateSnapshot(row) {
  const base = resolveBaseTaskState(row)
  const overdueOverlay = isOverdueOverlay(row, base)

  return {
    base,
    display: overdueOverlay ? TASK_STATE.OVERDUE : base,
    overdueOverlay,
  }
}

const TASK_STATE_LABEL_KEYS = {
  [TASK_STATE.NOT_STARTED]: 'teacher.task_state_not_started',
  [TASK_STATE.IN_PROGRESS]: 'teacher.task_state_in_progress',
  [TASK_STATE.WAITING_REVIEW]: 'teacher.task_state_waiting_review',
  [TASK_STATE.DONE]: 'teacher.task_state_done',
  [TASK_STATE.OVERDUE]: 'teacher.task_state_overdue',
}

export function taskStateLabelKey(displayState) {
  return TASK_STATE_LABEL_KEYS[displayState] || TASK_STATE_LABEL_KEYS[TASK_STATE.NOT_STARTED]
}

export function taskStateTone(displayState) {
  if (displayState === TASK_STATE.DONE) return 'approved'
  if (displayState === TASK_STATE.OVERDUE) return 'overdue'
  if (displayState === TASK_STATE.WAITING_REVIEW) return 'submitted'
  if (displayState === TASK_STATE.IN_PROGRESS) return 'active'
  return 'default'
}

export function taskStateIcon(displayState) {
  if (displayState === TASK_STATE.DONE) return 'bi-check2-circle'
  if (displayState === TASK_STATE.OVERDUE) return 'bi-exclamation-circle'
  if (displayState === TASK_STATE.WAITING_REVIEW) return 'bi-hourglass-split'
  if (displayState === TASK_STATE.IN_PROGRESS) return 'bi-arrow-repeat'
  return 'bi-circle'
}

/**
 * @param {string|null|undefined} dueAt
 * @param {{ done?: boolean, t?: (key: string, params?: object) => string, formatDate?: (value: string) => string, now?: Date }} options
 */
export function formatTaskDueUrgency(dueAt, options = {}) {
  const { done = false, t = (key) => key, formatDate = formatTeacherWhen, now = new Date() } = options

  if (done || !dueAt) {
    return { text: '', tone: 'neutral', daysRemaining: null }
  }

  const daysRemaining = daysUntilDueStartOfDay(dueAt, now)
  if (daysRemaining === null) {
    return { text: '', tone: 'neutral', daysRemaining: null }
  }

  if (daysRemaining < 0) {
    return { text: t('teacher.task_due_overdue'), tone: 'danger', daysRemaining }
  }

  if (daysRemaining === 0) {
    return { text: t('teacher.task_due_today'), tone: 'warn', daysRemaining }
  }

  if (daysRemaining === 1) {
    return { text: t('teacher.task_due_tomorrow'), tone: 'warn', daysRemaining }
  }

  if (daysRemaining <= 3) {
    return {
      text: t('teacher.task_due_in_days', { n: daysRemaining }),
      tone: 'warning',
      daysRemaining,
    }
  }

  return {
    text: t('teacher.task_due_on', { date: formatDate(dueAt) }),
    tone: 'neutral',
    daysRemaining,
  }
}

/** Teacher list row shape (flat recipient + assignment). */
export function taskStateFromTeacherItem(recipient, assignment) {
  return taskStateSnapshot({
    status: recipient?.status,
    review_state: recipient?.review_state,
    started_at: recipient?.started_at,
    student_submitted_at: recipient?.student_completed_at ?? recipient?.student_submitted_at,
    assignment: { due_at: assignment?.due_at },
  })
}

export function taskStateCardClass(displayState) {
  const map = {
    [TASK_STATE.DONE]: 'is-approved',
    [TASK_STATE.OVERDUE]: 'is-overdue',
    [TASK_STATE.WAITING_REVIEW]: 'is-submitted',
    [TASK_STATE.IN_PROGRESS]: 'is-active',
    [TASK_STATE.NOT_STARTED]: 'is-default',
  }
  return map[displayState] || 'is-default'
}

export function teacherStatusToneFromDisplay(displayState) {
  if (displayState === TASK_STATE.DONE) return 'good'
  if (displayState === TASK_STATE.OVERDUE) return 'danger'
  if (displayState === TASK_STATE.WAITING_REVIEW) return 'mid'
  if (displayState === TASK_STATE.IN_PROGRESS) return 'mid'
  return 'muted'
}
