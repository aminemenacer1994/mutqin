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
  if (base === TASK_STATE.NEEDS_CORRECTION) return 'revision'
  if (base === TASK_STATE.CANCELLED) return 'closed'
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
  return bucket === 'todo' || bucket === 'progress' || bucket === 'revision'
}

export function countLearningBuckets(rows) {
  const counts = { overview: 0, todo: 0, progress: 0, review: 0, revision: 0, closed: 0, completed: 0, history: 0 }
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
/** @returns {'overdue'|'today'|'upcoming'|'none'} */
export function dueWindowForRow(row, now = new Date()) {
  const base = resolveBaseTaskState(row)
  if (base === TASK_STATE.DONE || base === TASK_STATE.WAITING_REVIEW) return 'none'
  if (isOverdueRow(row, now)) return 'overdue'
  const days = daysUntilDueStartOfDay(row?.assignment?.due_at, now)
  if (days === null) return 'none'
  if (days === 0) return 'today'
  if (days > 0) return 'upcoming'
  return 'none'
}

export function matchesDueWindow(row, dueWindow = 'all', now = new Date()) {
  if (!dueWindow || dueWindow === 'all') return true
  return dueWindowForRow(row, now) === dueWindow
}

export function countDueWindows(rows, { status = 'todo', category = 'all', now = new Date() } = {}) {
  const base = filterLearningAssignments(rows, { status, category, now })
  const counts = { all: base.length, today: 0, upcoming: 0, overdue: 0 }
  for (const row of base) {
    const window = dueWindowForRow(row, now)
    if (window in counts) counts[window] += 1
  }
  return counts
}

export function filterLearningAssignments(rows, { status = 'todo', category = 'all', now = new Date() } = {}) {
  const owned = (rows || []).filter((row) => row?.id && !hidesClosedTeacherAccess(row))
  const typed = category === 'all'
    ? owned
    : owned.filter((row) => learningCategory(row.assignment) === category)
  if (status === 'plan') return []
  if (status === 'overview') {
    const actionable = typed.filter((row) => {
      const bucket = learningStatusBucket(row)
      return bucket === 'todo' || bucket === 'progress' || bucket === 'revision'
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

export const LEARNER_MY_LEARNING_FILTER_KEY = 'mutqin-learner-my-learning-filters'

const PRIMARY_FILTER_IDS = new Set(['todo', 'progress', 'review', 'revision', 'completed'])
const DUE_FILTER_IDS = new Set(['all', 'today', 'upcoming', 'overdue'])
const CATEGORY_FILTER_IDS = new Set(['all', 'nazra', 'hifz', 'tajweed', 'revision'])

/** @returns {{ status?: string, due?: string, category?: string } | null} */
export function readLearnerMyLearningFilters(storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null) {
  if (!storage) return null
  try {
    const raw = storage.getItem(LEARNER_MY_LEARNING_FILTER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    const out = {}
    if (PRIMARY_FILTER_IDS.has(data.status)) out.status = data.status
    if (DUE_FILTER_IDS.has(data.due)) out.due = data.due
    if (CATEGORY_FILTER_IDS.has(data.category)) out.category = data.category
    if (typeof data.search === 'string') out.search = data.search.slice(0, 120)
    if (Number(data.teacher) > 0) out.teacher = Number(data.teacher)
    if (['priority', 'due', 'recent'].includes(data.sort)) out.sort = data.sort
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

export function writeLearnerMyLearningFilters(
  { status = 'todo', due = 'all', category = 'all', search = '', teacher = '', sort = 'priority' } = {},
  storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null,
) {
  if (!storage) return
  try {
    storage.setItem(LEARNER_MY_LEARNING_FILTER_KEY, JSON.stringify({
      search: String(search).slice(0, 120), teacher, sort,
      status: PRIMARY_FILTER_IDS.has(status) ? status : 'todo',
      due: DUE_FILTER_IDS.has(due) ? due : 'all',
      category: CATEGORY_FILTER_IDS.has(category) ? category : 'all',
    }))
  } catch {
    /* quota / private mode */
  }
}
