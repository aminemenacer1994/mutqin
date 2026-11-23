import { dueDaysFromNow } from '../teacher/learnerUpcoming.js'
import { daysUntilDueStartOfDay, resolveBaseTaskState, TASK_STATE } from '../teacher/taskState.js'
import { resolveTeacherTaskType } from '../teacher/taskTypes.js'

const CATEGORY_BY_TYPE = Object.freeze({
  nazra: 'nazra',
  hifz: 'hifz',
  new_memorisation: 'hifz',
  tajweed: 'tajweed',
  revision: 'revision',
  recitation_check: 'revision',
})

/** Nazra, Hifz, Tajweed, or Revision from the existing teacher task type. */
export function learningCategory(assignment) {
  const type = resolveTeacherTaskType(assignment?.kind, assignment?.hifz_category, assignment?.activity)
  return CATEGORY_BY_TYPE[type] || 'revision'
}

/** Workflow bucket. Overdue is a sort priority inside To do, not a separate status. */
export function learningStatusBucket(row) {
  const base = resolveBaseTaskState(row)
  if (base === TASK_STATE.DONE) return 'completed'
  if (base === TASK_STATE.WAITING_REVIEW) return 'review'
  if (base === TASK_STATE.IN_PROGRESS) return 'progress'
  return 'todo'
}

/** A submission the student or teacher has already recorded. */
export function isLearningHistory(row) {
  return Boolean(row?.completion_result || row?.student_submitted_at || row?.teacher_approved_at)
}

function hidesClosedTeacherAccess(row) {
  if (row?.teacher_access !== false) return false
  const bucket = learningStatusBucket(row)
  return bucket === 'todo' || bucket === 'progress'
}

export function countLearningBuckets(rows) {
  const counts = { overview: 0, todo: 0, progress: 0, review: 0, completed: 0, history: 0 }
  for (const row of rows || []) {
    if (!row?.id || hidesClosedTeacherAccess(row)) continue
    counts.overview += 1
    counts[learningStatusBucket(row)] += 1
    if (isLearningHistory(row)) counts.history += 1
  }
  return counts
}

export function learningCategoryCounts(rows, status = 'todo') {
  const counts = { all: 0, nazra: 0, hifz: 0, tajweed: 0, revision: 0 }
  for (const row of rows || []) {
    if (!row?.id || hidesClosedTeacherAccess(row)) continue
    if (status === 'history' && !isLearningHistory(row)) continue
    if (status !== 'overview' && status !== 'plan' && status !== 'history' && learningStatusBucket(row) !== status) continue
    counts.all += 1
    counts[learningCategory(row.assignment)] += 1
  }
  return counts
}

export function sortLearningAssignments(rows, now = new Date()) {
  return [...(rows || [])].sort((a, b) => {
    const overdueA = isOverdueRow(a, now) ? 0 : 1
    const overdueB = isOverdueRow(b, now) ? 0 : 1
    if (overdueA !== overdueB) return overdueA - overdueB
    return dueKey(a) - dueKey(b) || Number(a.id) - Number(b.id)
  })
}

/**
 * Status and category are display filters over the authorised assignment rows.
 * They do not change status, create a submission, or write progress.
 */
export function filterLearningAssignments(rows, { status = 'todo', category = 'all', now = new Date() } = {}) {
  const owned = (rows || []).filter((row) => row?.id && !hidesClosedTeacherAccess(row))
  const typed = category === 'all'
    ? owned
    : owned.filter((row) => learningCategory(row.assignment) === category)
  if (status === 'plan') return []
  if (status === 'overview') {
    const actionable = typed.filter((row) => {
      const bucket = learningStatusBucket(row)
      return bucket === 'todo' || bucket === 'progress'
    })
    const urgent = actionable.filter((row) => isUrgent(row, now))
    return sortLearningAssignments(urgent.length ? urgent : actionable, now).slice(0, 3)
  }
  if (status === 'history') {
    return typed.filter(isLearningHistory).sort((a, b) => historyKey(b) - historyKey(a) || Number(b.id) - Number(a.id))
  }
  if (status === 'completed') {
    return typed
      .filter((row) => learningStatusBucket(row) === 'completed')
      .sort((a, b) => historyKey(b) - historyKey(a) || Number(b.id) - Number(a.id))
  }
  return sortLearningAssignments(typed.filter((row) => learningStatusBucket(row) === status), now)
}

function isOverdueRow(row, now) {
  const base = resolveBaseTaskState(row)
  if (base === TASK_STATE.DONE || base === TASK_STATE.WAITING_REVIEW) return false
  if (String(row?.status || '') === 'overdue') return true
  const days = daysUntilDueStartOfDay(row?.assignment?.due_at, now)
  return days !== null && days < 0
}

function isUrgent(row, now) {
  const bucket = learningStatusBucket(row)
  if (bucket !== 'todo' && bucket !== 'progress') return false
  if (isOverdueRow(row, now)) return true
  if (resolveBaseTaskState(row) === TASK_STATE.NEEDS_CORRECTION) return true
  const days = dueDaysFromNow(row?.assignment?.due_at, now)
  return days !== null && days <= 1
}

function dueKey(row) {
  const ms = Date.parse(row?.assignment?.due_at || '')
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms
}

function historyKey(row) {
  const ms = Date.parse(row?.teacher_approved_at || row?.student_submitted_at || row?.completed_at || '')
  return Number.isNaN(ms) ? 0 : ms
}
