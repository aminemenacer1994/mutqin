/**
 * Per-user, per-ayah (or range) mastery records.
 * Values are bounded 0–1. Raw evidence is preserved for later recalculation.
 */

import { MASTERY_FIELDS, STORAGE_KEYS } from './constants.js'
import { SKILLS } from './constants.js'

function storage() {
  const bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null
  if (bridge?.getItem && bridge?.setItem) return bridge
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

function clamp01(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.max(0, Math.min(1, n)) * 100) / 100
}

/**
 * @param {string} key e.g. "2:255"
 */
export function createDefaultMastery(key, nowIso = new Date().toISOString()) {
  const [surah, ayah] = String(key || '').split(':').map(Number)
  const base = {
    key: String(key || ''),
    surah: Number.isFinite(surah) ? surah : 0,
    ayah: Number.isFinite(ayah) ? ayah : 0,
    recallMastery: 0.5,
    sequenceMastery: 0.5,
    textualPrecision: 0.5,
    spokenAccuracy: 0.5,
    fluency: 0.5,
    independence: 0.5,
    visualDependency: 0.4,
    audioDependency: 0.4,
    hintDependency: 0.3,
    similarAyahMastery: 0.5,
    retentionStrength: 0.5,
    confidenceCalibration: 0.5,
    evidenceConfidence: 0.2,
    lastPractisedAt: null,
    lastTestedAt: null,
    nextReviewAt: nowIso,
    evidence: [],
  }
  return base
}

/**
 * @param {object} record
 */
export function normalizeMastery(record, key = '') {
  const src = record && typeof record === 'object' ? record : {}
  const defaults = createDefaultMastery(key || src.key || '')
  const out = { ...defaults, ...src, key: String(key || src.key || defaults.key) }
  for (const field of MASTERY_FIELDS) {
    out[field] = clamp01(out[field] ?? defaults[field])
  }
  if (!Array.isArray(out.evidence)) out.evidence = []
  return out
}

/**
 * @returns {Record<string, object>}
 */
export function loadMasteryMap() {
  const store = storage()
  if (!store) return {}
  try {
    const raw = store.getItem(STORAGE_KEYS.MASTERY_MAP)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const out = {}
    for (const [key, value] of Object.entries(parsed)) {
      out[key] = normalizeMastery(value, key)
    }
    return out
  } catch {
    return {}
  }
}

/**
 * @param {Record<string, object>} map
 */
export function saveMasteryMap(map) {
  const store = storage()
  if (!store) return false
  try {
    store.setItem(STORAGE_KEYS.MASTERY_MAP, JSON.stringify(map || {}))
    return true
  } catch {
    return false
  }
}

/**
 * Map assessment skills → mastery fields and merge with EMA.
 *
 * @param {object} existing
 * @param {{
 *   skills: Record<string, number>,
 *   verseKey: string,
 *   evidenceEntry?: object,
 *   confidence?: string|null,
 *   nowIso?: string,
 *   nextReviewAt?: string|null,
 * }} update
 */
export function applySkillUpdate(existing, update = {}) {
  const key = update.verseKey || existing?.key || ''
  const nowIso = update.nowIso || new Date().toISOString()
  const current = normalizeMastery(existing, key)
  const skills = update.skills || {}
  const alpha = 0.4

  const mapping = [
    ['recallMastery', skills[SKILLS.PHRASE_RECALL]],
    ['sequenceMastery', skills[SKILLS.AYAH_SEQUENCE]],
    ['textualPrecision', skills[SKILLS.TEXTUAL_PRECISION]],
    ['spokenAccuracy', skills[SKILLS.SPOKEN_RECALL]],
    ['fluency', skills[SKILLS.FLUENCY]],
    ['independence', skills[SKILLS.INDEPENDENCE]],
    ['visualDependency', skills[SKILLS.VISUAL_TEXT_DEPENDENCY]],
    ['audioDependency', skills[SKILLS.AUDIO_DEPENDENCY]],
    ['hintDependency', skills[SKILLS.HINT_DEPENDENCY]],
    ['similarAyahMastery', skills[SKILLS.SIMILAR_AYAH_CONFUSION]],
    ['retentionStrength', skills[SKILLS.DELAYED_RETENTION]],
  ]

  for (const [field, value] of mapping) {
    if (!Number.isFinite(Number(value))) continue
    current[field] = clamp01(current[field] + alpha * (Number(value) - current[field]))
  }

  if (update.confidence === 'confident' || update.confidence === 'needs_practice') {
    const objective = average([
      current.recallMastery,
      current.sequenceMastery,
      current.textualPrecision,
      current.independence,
    ])
    const reported = update.confidence === 'confident' ? 1 : 0.3
    const gap = 1 - Math.abs(objective - reported)
    current.confidenceCalibration = clamp01(
      current.confidenceCalibration + alpha * (gap - current.confidenceCalibration),
    )
  }

  current.evidenceConfidence = clamp01(Math.min(1, current.evidenceConfidence + 0.12))
  current.lastTestedAt = nowIso
  current.lastPractisedAt = nowIso
  if (update.nextReviewAt) current.nextReviewAt = update.nextReviewAt

  if (update.evidenceEntry) {
    current.evidence = [...(current.evidence || []), update.evidenceEntry].slice(-40)
  }

  return current
}

/**
 * Apply assessment results across touched ayahs.
 * @param {Record<string, object>} map
 * @param {{
 *   responses: object[],
 *   skills: Record<string, number>,
 *   confidence?: string|null,
 *   nextReviewByKey?: Record<string, string>,
 *   nowIso?: string,
 * }} result
 */
export function applyAssessmentToMastery(map, result = {}) {
  const next = { ...(map || {}) }
  const responses = Array.isArray(result.responses) ? result.responses : []
  const keys = [...new Set(responses.map((r) => r.verseKey || r.question?.verseKey).filter(Boolean))]
  const nowIso = result.nowIso || new Date().toISOString()

  for (const key of keys) {
    const itemResponses = responses.filter((r) => (r.verseKey || r.question?.verseKey) === key)
    next[key] = applySkillUpdate(next[key] || createDefaultMastery(key, nowIso), {
      verseKey: key,
      skills: result.skills || {},
      confidence: result.confidence,
      nowIso,
      nextReviewAt: result.nextReviewByKey?.[key] || null,
      evidenceEntry: {
        at: nowIso,
        skills: result.skills || {},
        responses: itemResponses.map((r) => ({
          type: r.question?.type || r.type,
          correct: !!r.correct,
          partial: !!r.partial,
          usedHint: !!r.usedHint,
          difficulty: r.question?.difficulty || r.difficulty,
          similarity: r.similarity,
        })),
        reasonCodes: result.reasonCodes || [],
      },
    })
  }

  return next
}

/**
 * Convert mastery records into progress API items (hybrid persistence).
 * @param {Record<string, object>} map
 * @param {string[]} keys
 */
export function toProgressPayload(map, keys = null) {
  const source = map || {}
  const list = keys || Object.keys(source)
  return list.map((key) => {
    const m = normalizeMastery(source[key], key)
    const masteryLevel = Math.round(
      average([m.recallMastery, m.sequenceMastery, m.textualPrecision, m.independence]) * 100,
    )
    return {
      surah_number: m.surah,
      ayah_number: m.ayah,
      mastery_level: masteryLevel,
      status: masteryLevel < 25 ? 'reviewing' : masteryLevel >= 80 ? 'mastered' : 'learning',
      metadata: {
        learnerMastery: m,
        next_review: m.nextReviewAt,
      },
    }
  }).filter((row) => row.surah_number > 0 && row.ayah_number > 0)
}

function average(values) {
  const nums = (values || []).map(Number).filter((n) => Number.isFinite(n))
  if (!nums.length) return 0.5
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export const LearnerMasteryService = {
  createDefaultMastery,
  normalizeMastery,
  loadMasteryMap,
  saveMasteryMap,
  applySkillUpdate,
  applyAssessmentToMastery,
  toProgressPayload,
}

export default LearnerMasteryService
