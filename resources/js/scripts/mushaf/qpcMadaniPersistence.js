/**
 * Madani uses the existing session record. The displayed page is derived from
 * the canonical ayah and is not stored as a second source of truth.
 */
import { resolveMadaniSpread, shouldShowTwoMadaniPages } from './madaniPagePair.js'
import { resolveMadaniPage, verseKeyFromCoordinates } from './qpcMadaniVersePage.js'
import { isQpcMadaniMushafView, normalizeReadingViewMode } from './readingViewModes.js'

const VISUAL_ONLY_REASONS = new Set([
  'word-highlight',
  'page-render',
  'glyph-paint',
  'tajweed-sync',
  'scroll',
  'viewport',
])

function positiveInt(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return Math.trunc(number)
}

export function canonicalAyahFromSession(session = {}) {
  const key = String(
    session.activeVerseKey
    || session.activeKey
    || session.config?.activeVerseKey
    || ''
  ).trim()
  if (/^\d+:\d+$/.test(key)) return key
  const surah = positiveInt(session.chapterId || session.config?.chapterId || session.surahNumber)
  const ayah = positiveInt(
    session.ayahNumber
    || session.ayah
    || session.rangeStart
    || session.config?.rangeStart
  )
  return verseKeyFromCoordinates(surah, ayah)
}

export function canonicalSessionStatus(session = {}) {
  const raw = String(
    session.sessionStatus
    || session.status
    || session.backendStatus
    || ''
  ).toLowerCase()
  if (session.endedEarly === true || session.ended_early === true || raw === 'ended_early') {
    return 'ended_early'
  }
  if (session.completed === true || raw === 'completed') return 'completed'
  if (session.paused === true || session.sessionPaused === true || raw === 'paused') return 'paused'
  if (raw === 'interrupted' || raw === 'interrupted_resumable') return 'paused'
  return 'active'
}

export function isTerminalSessionStatus(status) {
  return status === 'completed' || status === 'ended_early'
}

/**
 * Canonical fields already owned by the session payload.
 * Page number is intentionally absent.
 */
export function buildMadaniSessionPersistence(session = {}) {
  const status = canonicalSessionStatus(session)
  const activeVerseKey = canonicalAyahFromSession(session)
  const [surah, ayah] = activeVerseKey ? activeVerseKey.split(':') : ['', '']
  return {
    sessionId: positiveInt(session.sessionId || session.backendSessionId) || null,
    readingViewMode: normalizeReadingViewMode(session.readingViewMode, 'mushaf'),
    stage: String(session.stage || session.phase || session.mutqinPhase || ''),
    activeVerseKey,
    chapterId: positiveInt(surah || session.chapterId || session.config?.chapterId),
    rangeStart: positiveInt(session.rangeStart || session.config?.rangeStart || ayah),
    rangeEnd: positiveInt(session.rangeEnd || session.config?.rangeEnd || session.rangeStart || ayah),
    progress: Number.isFinite(Number(session.progress))
      ? Number(session.progress)
      : Math.max(0, Number(session.queueIndex || 0)),
    playback: {
      speed: Number(session.speed || session.config?.speed || 1) || 1,
      reciterId: String(session.reciterId || session.config?.reciterId || ''),
      currentTime: Math.max(0, Number(session.currentTime || 0)),
      isPlaying: !!session.isPlaying,
    },
    technique: String(session.technique || session.config?.technique || ''),
    aiAttemptId: positiveInt(session.aiAttemptId || session.ai_attempt_id) || null,
    aiResultId: positiveInt(session.aiResultId || session.ai_result_id) || null,
    status,
  }
}

export function buildMadaniAutosaveFingerprint(session = {}) {
  const record = buildMadaniSessionPersistence(session)
  return [
    record.sessionId || '',
    record.readingViewMode,
    record.stage,
    record.activeVerseKey,
    record.rangeStart,
    record.rangeEnd,
    record.progress,
    record.playback.speed,
    record.playback.reciterId,
    record.playback.currentTime > 0 ? '1' : '0',
    record.playback.isPlaying ? '1' : '0',
    record.technique,
    record.aiAttemptId || '',
    record.aiResultId || '',
    record.status,
  ].join('|')
}

/**
 * Visual painting and repeat renders must not write. Canonical changes still can.
 */
export function shouldWriteMadaniAutosave({
  reason = '',
  previousFingerprint = '',
  nextFingerprint = '',
} = {}) {
  if (VISUAL_ONLY_REASONS.has(String(reason || ''))) return false
  if (previousFingerprint && nextFingerprint && previousFingerprint === nextFingerprint) return false
  return true
}

export function shouldKeepSessionOnReload(session = {}) {
  const record = buildMadaniSessionPersistence(session)
  if (isTerminalSessionStatus(record.status)) return false
  return !!(record.sessionId || record.activeVerseKey || record.chapterId)
}

/**
 * Resume order: canonical ayah and layout first, then derive the Madani page.
 * A previously stored page number is ignored.
 */
export function resolveMadaniResumeView(session = {}, { index = {}, viewportWidth = 1080 } = {}) {
  const record = buildMadaniSessionPersistence(session)
  const resumable = shouldKeepSessionOnReload(session)
  if (!resumable || !isQpcMadaniMushafView(record.readingViewMode) || !record.activeVerseKey) {
    return {
      ...record,
      resumable,
      page: null,
      spread: null,
      visiblePages: [],
      derivedFromAyah: false,
      usedSavedPage: false,
    }
  }
  const page = resolveMadaniPage(record.chapterId, Number(record.activeVerseKey.split(':')[1]), index)
  const spread = page ? resolveMadaniSpread(page) : null
  const visiblePages = page
    ? (shouldShowTwoMadaniPages(viewportWidth) && spread ? [...spread.pages] : [page])
    : []
  return {
    ...record,
    resumable,
    page,
    spread,
    visiblePages,
    derivedFromAyah: !!page,
    usedSavedPage: false,
  }
}
