
const STORAGE_KEY = 'mutqin_ayah_progress'
const LEGACY_STORAGE_KEY = 'mutqin_spaced_repetition_memory'

const PERFECT_SCORE = 1
const PARTIAL_SCORE = 0.5
const FAIL_SCORE = 0

const PERFECT_MASTERY_INCREMENT = 0.25
const PARTIAL_MASTERY_INCREMENT = 0.08
const FAIL_MASTERY_DECREMENT = 0.2

function hasLocalStorage() {
  return typeof localStorage !== 'undefined'
}

function getStorageAdapter() {
  const bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null
  if (bridge && typeof bridge.getItem === 'function' && typeof bridge.setItem === 'function') {
    return bridge
  }
  if (hasLocalStorage()) return localStorage
  return null
}

function clampMasteryScore(value) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0
  const clamped = Math.max(0, Math.min(1, score))
  return Math.round(clamped * 100) / 100
}

function normalizeScore(score) {
  const numericScore = Number(score)
  if (numericScore === PARTIAL_SCORE) return PARTIAL_SCORE
  if (numericScore === PERFECT_SCORE) return PERFECT_SCORE
  return FAIL_SCORE
}

function normalizePositiveInteger(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.floor(numericValue))
}

function createAyahKey(surah, ayah) {
  const normalizedSurah = String(surah || '').trim()
  const normalizedAyah = String(ayah || '').trim()
  if (!normalizedSurah || !normalizedAyah) {
    throw new Error('A surah and ayah are required to update spaced repetition progress.')
  }
  return `${normalizedSurah}:${normalizedAyah}`
}

function parseAyahKey(key) {
  const match = String(key || '').trim().match(/^(\d+):(\d+)$/)
  if (!match) return null
  return {
    surah: Number(match[1]),
    ayah: Number(match[2])
  }
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + Number(days || 0))
  return nextDate
}

function getPerfectReviewIntervalDays(repetitionCount) {
  if (repetitionCount <= 1) return 1
  if (repetitionCount === 2) return 3
  if (repetitionCount === 3) return 7
  return 14
}

function createDefaultAyahProgress(nowIso = new Date().toISOString()) {
  return {
    surah: 0,
    ayah: 0,
    attempts: 0,
    lastScore: 0,
    masteryScore: 0,
    repetitionCount: 0,
    lastReviewed: null,
    nextReview: nowIso
  }
}

function normalizeAyahProgress(progress, nowIso = new Date().toISOString(), ref = {}) {
  const safeProgress = progress && typeof progress === 'object' ? progress : {}
  return {
    surah: Number.isFinite(Number(safeProgress.surah)) ? Number(safeProgress.surah) : Number(ref.surah || 0),
    ayah: Number.isFinite(Number(safeProgress.ayah)) ? Number(safeProgress.ayah) : Number(ref.ayah || 0),
    attempts: normalizePositiveInteger(safeProgress.attempts),
    lastScore: normalizeScore(safeProgress.lastScore),
    masteryScore: clampMasteryScore(safeProgress.masteryScore),
    repetitionCount: normalizePositiveInteger(safeProgress.repetitionCount),
    lastReviewed: safeProgress.lastReviewed || null,
    nextReview: safeProgress.nextReview || nowIso
  }
}

export function loadMemoryState() {
  const storage = getStorageAdapter()
  if (!storage) return {}

  try {
    const raw = storage.getItem(STORAGE_KEY)
    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : {}
    const current = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    const legacy = legacyParsed && typeof legacyParsed === 'object' && !Array.isArray(legacyParsed) ? legacyParsed : {}
    return {
      ...legacy,
      ...current
    }
  } catch {
    return {}
  }
}

export function saveMemoryState(state) {
  const sourceState = state && typeof state === 'object' && !Array.isArray(state) ? state : {}
  const nowIso = new Date().toISOString()
  const safeState = Object.entries(sourceState).reduce((next, [key, progress]) => {
    const ref = parseAyahKey(key)
    if (!ref) return next
    next[key] = normalizeAyahProgress(progress, nowIso, ref)
    return next
  }, {})
  const storage = getStorageAdapter()
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(safeState))
  }
  return safeState
}

export function getAyahProgress(surah, ayah) {
  const key = createAyahKey(surah, ayah)
  const state = loadMemoryState()
  return normalizeAyahProgress(state[key])
}

export function updateAyahProgress(surah, ayah, score) {
  const key = createAyahKey(surah, ayah)
  const normalizedScore = normalizeScore(score)
  const state = loadMemoryState()
  const now = new Date()
  const nowIso = now.toISOString()
  const normalizedSurah = Number(surah)
  const normalizedAyah = Number(ayah)
  const previous = normalizeAyahProgress(state[key], nowIso, {
    surah: normalizedSurah,
    ayah: normalizedAyah
  })

  let masteryScore = previous.masteryScore
  let repetitionCount = previous.repetitionCount
  let nextReview = nowIso

  if (normalizedScore === PERFECT_SCORE) {
    repetitionCount += 1
    masteryScore = clampMasteryScore(masteryScore + PERFECT_MASTERY_INCREMENT)
    nextReview = addDays(now, getPerfectReviewIntervalDays(repetitionCount)).toISOString()
  } else if (normalizedScore === PARTIAL_SCORE) {
    masteryScore = clampMasteryScore(masteryScore + PARTIAL_MASTERY_INCREMENT)
    nextReview = nowIso
  } else {
    repetitionCount = 0
    masteryScore = clampMasteryScore(masteryScore - FAIL_MASTERY_DECREMENT)
    nextReview = nowIso
  }

  const nextProgress = {
    surah: normalizedSurah,
    ayah: normalizedAyah,
    attempts: previous.attempts + 1,
    lastScore: normalizedScore,
    masteryScore,
    repetitionCount,
    lastReviewed: nowIso,
    nextReview
  }

  saveMemoryState({
    ...state,
    [key]: nextProgress
  })

  return nextProgress
}

export function clearMemoryProgress() {
  const storage = getStorageAdapter()
  if (storage) storage.removeItem(STORAGE_KEY)
}

export { STORAGE_KEY as SPACED_REPETITION_MEMORY_STORAGE_KEY }
export { STORAGE_KEY as AYAH_PROGRESS_STORAGE_KEY, LEGACY_STORAGE_KEY as LEGACY_AYAH_PROGRESS_STORAGE_KEY }

export default {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  loadMemoryState,
  saveMemoryState,
  getAyahProgress,
  updateAyahProgress,
  clearMemoryProgress
}
