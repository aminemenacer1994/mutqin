/**
 * Named Saved Sessions autosave helpers.
 *
 * Backend user_sessions already checkpoint mid-sitting. This module decides when
 * the Saved Sessions list should silently upsert the same bookmark as
 * in_progress or completed — without creating duplicates or empty rows.
 */

export const AUTOSAVED_SESSION_STATUS = Object.freeze({
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
})

export const SAVED_SESSION_AUTOSAVE_DEBOUNCE_MS = 2500

const UNFINISHED_STATUSES = new Set([
  'in_progress',
  'active',
  'paused',
  'interrupted',
  'interrupted_resumable',
  'ended_early',
  'abandoned',
  'none',
  'idle',
])

/**
 * Read a numeric backend session id from a saved bookmark or probe.
 * @param {object|null} session
 * @returns {number}
 */
export function readSavedSessionBackendId(session) {
  return Number(
    session?.backendSessionId
    || session?.config?.backendSessionId
    || session?.restore?.continueSession?.backendSessionId
    || 0
  )
}

/**
 * Explicit complete / in-progress status from a saved bookmark.
 * @param {object|null} session
 * @returns {string}
 */
export function readSavedSessionStatus(session) {
  return String(
    session?.status
    || session?.restore?.centralSession?.sessionStatus
    || session?.restore?.continueSession?.backendStatus
    || ''
  ).toLowerCase().trim()
}

/**
 * Whether a saved bookmark is genuinely completed (never treat leave/pause as done).
 * @param {object|null} session
 * @returns {boolean}
 */
export function isAutosavedSessionComplete(session) {
  if (!session) return false
  const status = readSavedSessionStatus(session)
  if (status === AUTOSAVED_SESSION_STATUS.COMPLETED || status === 'completed') return true
  if (UNFINISHED_STATUSES.has(status)) return false
  if (session?.restore?.continueSession?.completed === true) return true
  if (session?.restore?.continueSession?.completed === false) return false
  if (session?.restore?.continueSession?.ended_early === true) return false
  return Number(session?.stats?.sessions_completed || 0) >= 1
}

/**
 * Whether the sitting is a real started session (not page-open / setup only).
 * @param {object} ctx
 * @returns {boolean}
 */
export function hasStartedMemorisationSession(ctx = {}) {
  if (ctx.onboardingSample) return false
  if (ctx.isBootstrapping) return false
  if (ctx.completed) return true
  return !!(
    ctx.isLive
    || ctx.isPausedUnfinished
    || ctx.hasUnfinished
    || Number(ctx.sessionStartedAt || 0) > 0
  )
}

/**
 * Meaningful activity required before creating an In Progress bookmark.
 * Starting a real sitting counts; opening the page / picking a surah does not.
 * @param {object} ctx
 * @returns {boolean}
 */
export function hasMeaningfulSessionActivity(ctx = {}) {
  if (ctx.onboardingSample) return false
  if (ctx.isBootstrapping) return false
  if (ctx.completed) return true
  if (!hasStartedMemorisationSession(ctx)) return false

  const chapterId = Number(ctx.chapterId || ctx.config?.chapterId || 0)
  const rangeStart = Number(ctx.rangeStart || ctx.config?.rangeStart || 0)
  const rangeEnd = Number(ctx.rangeEnd || ctx.config?.rangeEnd || rangeStart)
  if (chapterId <= 0 || rangeStart <= 0 || rangeEnd < rangeStart) return false

  return true
}

/**
 * Whether the Saved Sessions bookmark may be created or updated.
 * Works for guests (local only) and authenticated users.
 * @param {object} ctx
 * @returns {boolean}
 */
export function shouldAutosaveNamedSession(ctx = {}) {
  if (ctx.onboardingSample) return false
  if (ctx.signupIsolation) return false
  if (ctx.isBootstrapping && !ctx.completed) return false

  const mutation = String(ctx.lifecycleMutation || '').toLowerCase()
  if (mutation === 'starting' || mutation === 'resuming') return false

  const status = String(ctx.lifecycleStatus || '').toLowerCase()
  if (status === 'starting' || status === 'hydrating' || status === 'resuming') return false

  if (ctx.completed) return hasMeaningfulSessionActivity(ctx)
  if (status === 'completing' || status === 'completed') return false

  return hasMeaningfulSessionActivity(ctx)
}

/**
 * @param {object} ctx
 * @returns {'in_progress'|'completed'}
 */
export function resolveAutosavedSessionStatus(ctx = {}) {
  if (ctx.completed) return AUTOSAVED_SESSION_STATUS.COMPLETED
  return AUTOSAVED_SESSION_STATUS.IN_PROGRESS
}

/**
 * Fingerprint of meaningful bookmark fields. Excludes audio clock ticks.
 * @param {object} ctx
 * @returns {string}
 */
export function buildAutosavedSessionFingerprint(ctx = {}) {
  return [
    Number(ctx.backendSessionId || 0) || '',
    Number(ctx.chapterId || ctx.config?.chapterId || 0) || '',
    Number(ctx.rangeStart || ctx.config?.rangeStart || 0) || '',
    Number(ctx.rangeEnd || ctx.config?.rangeEnd || 0) || '',
    Number(ctx.queueIndex || 0),
    Number(ctx.ayahNumber || 0),
    String(ctx.phase || ''),
    Number(ctx.repetitionsCompleted || 0),
    Number(ctx.progressPercent || 0),
    String(ctx.reciterId || ''),
    String(ctx.status || resolveAutosavedSessionStatus(ctx)),
    ctx.completed ? '1' : '0',
    Number(ctx.aiAttemptCount || 0),
    String(ctx.aiLastResult || ''),
    Number(ctx.weakAyahCount || 0),
    ctx.showTranslation ? '1' : '0',
    ctx.showTransliteration ? '1' : '0',
    String(ctx.readingViewMode || ''),
  ].join('|')
}

/**
 * @param {string} prev
 * @param {string} next
 * @returns {boolean}
 */
export function shouldSkipAutosavedSessionWrite(prev, next) {
  return !!prev && !!next && prev === next
}

/**
 * Do not reuse a completed bookmark for a later in-progress sitting.
 * @param {object|null} existing
 * @param {{ completed?: boolean }} incoming
 * @returns {boolean}
 */
export function canReuseAutosavedRecord(existing, incoming = {}) {
  if (!existing) return false
  const existingCompleted = isAutosavedSessionComplete(existing)
  const incomingCompleted = incoming.completed === true
    || incoming.status === AUTOSAVED_SESSION_STATUS.COMPLETED
    || isAutosavedSessionComplete(incoming)
  if (existingCompleted && !incomingCompleted) return false
  return true
}

/**
 * Locate the single bookmark that should receive this autosave.
 * @param {Array} sessions
 * @param {object} incoming
 * @returns {number}
 */
export function findReusableAutosavedSessionIndex(sessions, incoming = {}) {
  const rows = Array.isArray(sessions) ? sessions : []
  const incomingCompleted = incoming.completed === true
    || incoming.status === AUTOSAVED_SESSION_STATUS.COMPLETED

  const backendId = readSavedSessionBackendId(incoming)
  if (backendId > 0) {
    const byBackend = rows.findIndex((row) => readSavedSessionBackendId(row) === backendId)
    if (byBackend >= 0 && canReuseAutosavedRecord(rows[byBackend], incoming)) {
      return byBackend
    }
  }

  const incomingId = incoming.id != null ? String(incoming.id) : ''
  if (incomingId) {
    const byId = rows.findIndex((row) => String(row?.id || '') === incomingId)
    if (byId >= 0 && canReuseAutosavedRecord(rows[byId], incoming)) {
      return byId
    }
  }

  if (incomingCompleted) {
    // Completing must update the in-progress row for this set, not spawn a twin.
    const inProgress = findRangeInProgressIndex(rows, incoming)
    if (inProgress >= 0) return inProgress
    return -1
  }

  return findRangeInProgressIndex(rows, incoming)
}

function readSessionRange(session) {
  const config = session?.config || session || {}
  return {
    chapterId: Number(config.chapterId || 0),
    rangeStart: Number(config.rangeStart || 0),
    rangeEnd: Number(config.rangeEnd || config.rangeStart || 0),
    sessionStartedAt: Number(
      session?.sessionStartedAt
      || session?.restore?.continueSession?.sessionStartedAt
      || 0
    ),
  }
}

function findRangeInProgressIndex(rows, incoming) {
  const target = readSessionRange(incoming)
  if (target.chapterId <= 0 || target.rangeStart <= 0) return -1

  const matches = []
  rows.forEach((row, index) => {
    if (isAutosavedSessionComplete(row)) return
    const range = readSessionRange(row)
    if (
      range.chapterId === target.chapterId
      && range.rangeStart === target.rangeStart
      && range.rangeEnd === target.rangeEnd
    ) {
      matches.push({ row, index })
    }
  })
  if (!matches.length) return -1

  if (target.sessionStartedAt > 0) {
    const sameSitting = matches.find((item) => item.row && readSessionRange(item.row).sessionStartedAt === target.sessionStartedAt)
    if (sameSitting) return sameSitting.index
  }

  matches.sort((a, b) => String(b.row?.savedAt || '').localeCompare(String(a.row?.savedAt || '')))
  return matches[0].index
}

/**
 * Merge an autosave into the existing bookmark, keeping id/name.
 * @param {object} existing
 * @param {object} incoming
 * @returns {object}
 */
export function mergeAutosavedSessionRecord(existing, incoming) {
  if (!existing) return incoming
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    name: existing.name || incoming.name,
    autoSaved: existing.autoSaved || incoming.autoSaved,
    backendSessionId: incoming.backendSessionId || existing.backendSessionId || null,
  }
}

/**
 * Stable list label — no clock stamp, so updates do not rename the row.
 * @param {object} ctx
 * @returns {string}
 */
export function buildStableAutosaveSessionName(ctx = {}) {
  const chapter = String(ctx.chapterName || ctx.config?.chapterName || '').trim() || 'Session'
  const start = Number(ctx.rangeStart || ctx.config?.rangeStart || 0)
  const end = Number(ctx.rangeEnd || ctx.config?.rangeEnd || start)
  if (start > 0 && end >= start) return `${chapter} ${start}-${end}`
  return chapter
}

export default {
  AUTOSAVED_SESSION_STATUS,
  SAVED_SESSION_AUTOSAVE_DEBOUNCE_MS,
  readSavedSessionBackendId,
  readSavedSessionStatus,
  isAutosavedSessionComplete,
  hasStartedMemorisationSession,
  hasMeaningfulSessionActivity,
  shouldAutosaveNamedSession,
  resolveAutosavedSessionStatus,
  buildAutosavedSessionFingerprint,
  shouldSkipAutosavedSessionWrite,
  canReuseAutosavedRecord,
  findReusableAutosavedSessionIndex,
  mergeAutosavedSessionRecord,
  buildStableAutosaveSessionName,
}
