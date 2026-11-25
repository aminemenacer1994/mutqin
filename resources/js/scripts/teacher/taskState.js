import { formatTeacherWhen } from './formatters.js'

export const TASK_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_REVIEW: 'WAITING_REVIEW',
  NEEDS_CORRECTION: 'NEEDS_CORRECTION',
  DONE: 'DONE',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
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

  if (reviewState === 'needs_correction') {
    return TASK_STATE.NEEDS_CORRECTION
  }

  if (status === 'cancelled') {
    return TASK_STATE.CANCELLED
  }

  if (status === 'in_progress') {
    return TASK_STATE.IN_PROGRESS
  }

  if (status === 'overdue') {
    return row?.started_at ? TASK_STATE.IN_PROGRESS : TASK_STATE.NOT_STARTED
  }

  if (row?.started_at || status === 'in_progress') {
    return TASK_STATE.IN_PROGRESS
  }

  return TASK_STATE.NOT_STARTED
}

export function isTaskDoneState(state) {
  return state === TASK_STATE.DONE || state === TASK_STATE.CANCELLED
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
  [TASK_STATE.NEEDS_CORRECTION]: 'teacher.status_needs_correction',
  [TASK_STATE.DONE]: 'teacher.task_state_done',
  [TASK_STATE.OVERDUE]: 'teacher.task_state_overdue',
  [TASK_STATE.CANCELLED]: 'teacher.task_state_cancelled',
}

export function taskStateLabelKey(displayState) {
  return TASK_STATE_LABEL_KEYS[displayState] || TASK_STATE_LABEL_KEYS[TASK_STATE.NOT_STARTED]
}

export function taskStateTone(displayState) {
  if (displayState === TASK_STATE.CANCELLED) return 'muted'
  if (displayState === TASK_STATE.DONE) return 'approved'
  if (displayState === TASK_STATE.OVERDUE) return 'overdue'
  if (displayState === TASK_STATE.WAITING_REVIEW) return 'submitted'
  if (displayState === TASK_STATE.NEEDS_CORRECTION) return 'correction'
  if (displayState === TASK_STATE.IN_PROGRESS) return 'active'
  return 'default'
}

export function taskStateIcon(displayState) {
  if (displayState === TASK_STATE.CANCELLED) return 'bi-slash-circle'
  if (displayState === TASK_STATE.DONE) return 'bi-check2-circle'
  if (displayState === TASK_STATE.OVERDUE) return 'bi-exclamation-circle'
  if (displayState === TASK_STATE.WAITING_REVIEW) return 'bi-hourglass-split'
  if (displayState === TASK_STATE.NEEDS_CORRECTION) return 'bi-arrow-counterclockwise'
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
    [TASK_STATE.NEEDS_CORRECTION]: 'is-correction',
    [TASK_STATE.IN_PROGRESS]: 'is-active',
    [TASK_STATE.NOT_STARTED]: 'is-default',
  }
  return map[displayState] || 'is-default'
}

export function teacherStatusToneFromDisplay(displayState) {
  if (displayState === TASK_STATE.DONE) return 'good'
  if (displayState === TASK_STATE.OVERDUE) return 'danger'
  if (displayState === TASK_STATE.WAITING_REVIEW) return 'mid'
  if (displayState === TASK_STATE.NEEDS_CORRECTION) return 'danger'
  if (displayState === TASK_STATE.IN_PROGRESS) return 'mid'
  return 'muted'
}

/** Teacher assignment list row tone — matches learner correction emphasis. */
export function teacherListStatusTone(row, displayState) {
  if (row?.review_state === 'needs_correction') return 'danger'
  return teacherStatusToneFromDisplay(displayState)
}

/** Mutually exclusive progress. Overdue is never one of these. */
export const TASK_LIFECYCLE = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  NEEDS_REVIEW: 'needs_review',
  REVISION_REQUESTED: 'revision_requested',
  COMPLETED: 'completed',
}

const LIFECYCLE_LABEL_KEYS = {
  [TASK_LIFECYCLE.NOT_STARTED]: 'teacher.task_state_not_started',
  [TASK_LIFECYCLE.IN_PROGRESS]: 'teacher.task_state_in_progress',
  [TASK_LIFECYCLE.SUBMITTED]: 'teacher.task_lifecycle_submitted',
  [TASK_LIFECYCLE.NEEDS_REVIEW]: 'teacher.task_lifecycle_needs_review',
  [TASK_LIFECYCLE.REVISION_REQUESTED]: 'teacher.task_lifecycle_revision',
  [TASK_LIFECYCLE.COMPLETED]: 'teacher.task_lifecycle_completed',
}

function hasReviewableEvidence(row) {
  const evidence = row?.evidence || {}
  return Boolean(
    evidence.attempt_id
    || evidence.audio?.available
    || evidence.transcript
    || (Array.isArray(evidence.words) && evidence.words.length)
  )
}

/**
 * One progress state per task. A submission waits for the teacher;
 * it does not complete the task. Revision requested stays with the student.
 */
export function resolveTaskLifecycle(row) {
  const status = row?.status || 'pending'
  const reviewState = row?.review_state

  if (status === 'completed' && (reviewState === 'approved' || !row?.student_submitted_at)) {
    return TASK_LIFECYCLE.COMPLETED
  }

  if (reviewState === 'needs_correction') {
    return TASK_LIFECYCLE.REVISION_REQUESTED
  }

  const handedIn = status === 'awaiting_confirmation'
    || reviewState === 'submitted'
    || Boolean(row?.student_submitted_at)

  if (handedIn) {
    return hasReviewableEvidence(row) ? TASK_LIFECYCLE.NEEDS_REVIEW : TASK_LIFECYCLE.SUBMITTED
  }

  if (row?.started_at || status === 'in_progress') {
    return TASK_LIFECYCLE.IN_PROGRESS
  }

  return TASK_LIFECYCLE.NOT_STARTED
}

export function taskLifecycleLabelKey(lifecycle) {
  return LIFECYCLE_LABEL_KEYS[lifecycle] || LIFECYCLE_LABEL_KEYS[TASK_LIFECYCLE.NOT_STARTED]
}

export function taskLifecycleTone(lifecycle) {
  if (lifecycle === TASK_LIFECYCLE.COMPLETED) return 'good'
  if (lifecycle === TASK_LIFECYCLE.REVISION_REQUESTED) return 'warn'
  if (lifecycle === TASK_LIFECYCLE.NEEDS_REVIEW || lifecycle === TASK_LIFECYCLE.SUBMITTED) return 'mid'
  if (lifecycle === TASK_LIFECYCLE.IN_PROGRESS) return 'mid'
  return 'muted'
}

/** Due-date flag. Completed tasks are never overdue. */
export function taskIsOverdue(row) {
  if (resolveTaskLifecycle(row) === TASK_LIFECYCLE.COMPLETED) return false
  return isDuePastEndOfDay(row?.assignment?.due_at)
}

export function studentTaskMatchesFilter(row, filter) {
  const lifecycle = resolveTaskLifecycle(row)
  if (filter === 'overdue') return taskIsOverdue(row)
  if (filter === 'completed') return lifecycle === TASK_LIFECYCLE.COMPLETED
  if (filter === 'needs_review') return lifecycle === TASK_LIFECYCLE.NEEDS_REVIEW
  if (filter === 'submitted') return lifecycle === TASK_LIFECYCLE.SUBMITTED
  if (filter === 'todo') {
    return lifecycle === TASK_LIFECYCLE.NOT_STARTED
      || lifecycle === TASK_LIFECYCLE.IN_PROGRESS
      || lifecycle === TASK_LIFECYCLE.REVISION_REQUESTED
  }
  return true
}

/** Progress filters partition every task. Overdue overlaps those sets. */
export function summarizeStudentTaskCounts(rows = []) {
  const counts = {
    all: 0,
    todo: 0,
    submitted: 0,
    needs_review: 0,
    completed: 0,
    overdue: 0,
  }

  for (const row of rows) {
    const lifecycle = resolveTaskLifecycle(row)
    counts.all += 1
    if (lifecycle === TASK_LIFECYCLE.COMPLETED) counts.completed += 1
    else if (lifecycle === TASK_LIFECYCLE.NEEDS_REVIEW) counts.needs_review += 1
    else if (lifecycle === TASK_LIFECYCLE.SUBMITTED) counts.submitted += 1
    else counts.todo += 1
    if (taskIsOverdue(row)) counts.overdue += 1
  }

  return counts
}
