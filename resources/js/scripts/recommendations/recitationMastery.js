/**
 * Long-term recitation mastery + reliable word weakness (client mirror).
 *
 * Keeps local ayah progress aligned with server EMA logic for guests/offline,
 * and filters session weak words so uncertain STT alone never becomes focus.
 */

import {
  getAyahProgress,
  loadMemoryState,
  saveMemoryState,
  updateAyahProgress,
} from '../engine/spaced_repetition_memory.js'
import { normalisePlanWordSeverity } from './aiRecitePracticePlan.js'
import { resultStateToLegacyOutcome, resolveRecitationResultState } from './recitationResultState.js'
import { attemptAffectsScoring, classifyRecitationAttempt } from '../audio/recitationAttemptGuard.js'

const PERSISTENT_WEAK_STORAGE_KEY = 'mutqin.persistentWordWeakness'

const EMA_ALPHA = 0.15
const MAX_SESSION_DELTA = 0.10
const HIGH_CONFIDENCE = 0.72

function storage() {
  const bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null
  if (bridge?.getItem && bridge?.setItem) return bridge
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

function clamp01(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000
}

function wordSpotKey(word = {}) {
  const surah = Number(word.surahId ?? word.surah_number ?? 0)
  const ayah = Number(word.ayahNumber ?? word.ayah_number ?? 0)
  const index = Number(word.wordIndex ?? word.word_index ?? word.ayah_word_index ?? -1)
  if (!surah || !ayah || index < 0) return ''
  return `${surah}:${ayah}:${index}`
}

/**
 * @returns {Record<string, { count: number, lastSeenAt: string|null, severity: string, text?: string }>}
 */
export function loadPersistentWordWeaknessMap() {
  const store = storage()
  if (!store) return {}
  try {
    const raw = store.getItem(PERSISTENT_WEAK_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * @param {Record<string, object>} map
 */
export function savePersistentWordWeaknessMap(map) {
  const store = storage()
  if (!store) return
  try {
    store.setItem(PERSISTENT_WEAK_STORAGE_KEY, JSON.stringify(map || {}))
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {object} word
 * @param {Record<string, object>} persistentMap
 */
export function isReliableSessionWeakWord(word = {}, persistentMap = null) {
  const map = persistentMap || loadPersistentWordWeaknessMap()
  const key = wordSpotKey(word)
  const existing = key ? map[key] : null
  const severity = normalisePlanWordSeverity(word.status || word.visualStatus || word.severity)
  if (!severity || severity === 'green' || severity === 'gray') return false

  const status = String(word.status || word.reason || '').toLowerCase()
  if (/uncertain|pending|skipped|grey|gray/.test(status)) return false

  const confidence = Number.isFinite(Number(word.confidence)) ? Number(word.confidence) : null
  const isHard = severity === 'red' || severity === 'black'
    || /wrong|missing|incorrect|omitted|omission/.test(status)
  const isSoft = severity === 'amber' || /partial|minor|hesitation|close/.test(status)

  if (isHard) {
    if (confidence != null && confidence >= HIGH_CONFIDENCE) return true
    return !!existing
  }
  if (isSoft) {
    return !!existing && Number(existing.count || 0) >= 1
  }
  return false
}

/**
 * @param {object[]} words
 * @param {Record<string, object>|null} persistentMap
 */
export function filterReliableWeakWords(words = [], persistentMap = null) {
  const map = persistentMap || loadPersistentWordWeaknessMap()
  return (Array.isArray(words) ? words : []).filter((word) => isReliableSessionWeakWord(word, map))
}

/**
 * Record session weaknesses into the local persistent registry.
 *
 * @param {object[]} words
 */
export function recordPersistentWordWeaknesses(words = []) {
  const map = loadPersistentWordWeaknessMap()
  const now = new Date().toISOString()
  let changed = false

  for (const word of Array.isArray(words) ? words : []) {
    if (!isReliableSessionWeakWord(word, map)) continue
    const key = wordSpotKey(word)
    if (!key) continue
    const prev = map[key] || { count: 0, lastSeenAt: null, severity: 'moderate' }
    map[key] = {
      count: Number(prev.count || 0) + 1,
      lastSeenAt: now,
      severity: word.severity || prev.severity || 'moderate',
      text: String(word.text || word.word || prev.text || '').trim() || undefined,
      surahId: Number(word.surahId ?? word.surah_number ?? 0) || undefined,
      ayahNumber: Number(word.ayahNumber ?? word.ayah_number ?? 0) || undefined,
      wordIndex: Number(word.wordIndex ?? word.word_index ?? 0),
    }
    changed = true
  }

  if (changed) savePersistentWordWeaknessMap(map)
  return map
}

/**
 * @param {object[]} sessionWords
 * @param {number} limit
 */
export function mergePersistentWeakWords(sessionWords = [], limit = 16) {
  const map = loadPersistentWordWeaknessMap()
  const merged = []
  const seen = new Set()

  const push = (word) => {
    const key = wordSpotKey(word)
    if (!key || seen.has(key)) return
    seen.add(key)
    merged.push(word)
  }

  for (const word of filterReliableWeakWords(sessionWords, map)) push(word)

  for (const [key, spot] of Object.entries(map)) {
    if (Number(spot.count || 0) < 2) continue
    const [surah, ayah, index] = key.split(':').map(Number)
    push({
      surahId: surah,
      ayahNumber: ayah,
      wordIndex: index,
      text: spot.text || '',
      severity: spot.severity === 'high' ? 'red' : 'amber',
      reason: 'persistent',
      persistent: true,
    })
  }

  return merged.slice(0, Math.max(1, limit))
}

/**
 * @param {string} outcome strong|mixed|weak
 * @param {number|null} accuracyPercent
 */
export function sessionScoreFromOutcome(outcome = 'mixed', accuracyPercent = null) {
  const acc = Number.isFinite(Number(accuracyPercent))
    ? Math.max(0, Math.min(100, Number(accuracyPercent))) / 100
    : 0.55
  const band = String(outcome || '').toLowerCase()
  if (band === 'strong') return clamp01(0.75 + (acc * 0.23))
  if (band === 'weak') return clamp01(0.08 + (acc * 0.34))
  return clamp01(0.35 + (acc * 0.43))
}

/**
 * Slow EMA update for one ayah (mirrors server RecitationMasteryService).
 *
 * @param {number} surah
 * @param {number} ayah
 * @param {number} sessionScore 0–1
 * @param {string} outcome
 */
export function applyAyahRecitationMastery(surah, ayah, sessionScore, outcome = 'mixed') {
  const prev = getAyahProgress(surah, ayah)
  const prevEma = Number.isFinite(Number(prev.masteryScore)) ? Number(prev.masteryScore) : 0
  const target = clamp01(sessionScore)
  let delta = EMA_ALPHA * (target - prevEma)
  delta = Math.max(-MAX_SESSION_DELTA, Math.min(MAX_SESSION_DELTA, delta))
  const newEma = clamp01(prevEma + delta)

  const success = outcome === 'strong' || (outcome === 'mixed' && sessionScore >= 0.62)
  let spacedScore = 0
  if (success && newEma >= 0.8) spacedScore = 1
  else if (success || newEma >= 0.55) spacedScore = 0.5

  const progress = updateAyahProgress(surah, ayah, spacedScore)
  const state = loadMemoryState()
  const key = `${surah}:${ayah}`
  state[key] = {
    ...progress,
    masteryScore: newEma,
    recitationMastery: {
      ema: newEma,
      lastSessionScore: target,
      lastOutcome: outcome,
      updatedAt: new Date().toISOString(),
    },
  }
  saveMemoryState(state)
  return state[key]
}

/**
 * Apply mastery for each ayah in a recitation result range.
 *
 * @param {object} input
 */
export function applyRecitationMasteryFromResult(input = {}) {
  const result = input.result || null
  if (!result) return []

  const extras = input.extras || {}
  const classification = classifyRecitationAttempt({ result, extras })
  if (!attemptAffectsScoring(classification)) return []

  const resultState = resolveRecitationResultState(result, extras)
  if (resultState === 'insufficient_audio') return []

  const outcome = input.outcome
    || resultStateToLegacyOutcome(resultState)
    || 'mixed'
  const accuracy = Number(
    input.accuracyPercent
    ?? result.accuracyScore
    ?? result.accuracy
    ?? result.matchPercent,
  )
  const accuracyPercent = Number.isFinite(accuracy)
    ? Math.round(accuracy <= 1 ? accuracy * 100 : accuracy)
    : null

  const baseScore = sessionScoreFromOutcome(outcome, accuracyPercent)
  const range = input.range || {}
  const surah = Number(range.surahId ?? range.chapterId ?? range.surah_number ?? 0)
  const from = Number(range.from ?? range.start ?? 1)
  const to = Number(range.to ?? range.end ?? from)
  const weakAyahs = new Set(
    (Array.isArray(input.weakAyahs) ? input.weakAyahs : (result.weakAyahs || []))
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0),
  )

  const updates = []
  if (!surah || !from) return updates

  for (let ayah = from; ayah <= to; ayah += 1) {
    const score = weakAyahs.has(ayah) ? Math.min(baseScore, 0.52) : baseScore
    updates.push({
      key: `${surah}:${ayah}`,
      ...applyAyahRecitationMastery(surah, ayah, score, outcome),
    })
  }

  const sessionWords = input.weakWords
    || (typeof input.extractWeakWords === 'function' ? input.extractWeakWords(result) : [])
  recordPersistentWordWeaknesses(sessionWords)

  return updates
}

export default {
  loadPersistentWordWeaknessMap,
  savePersistentWordWeaknessMap,
  isReliableSessionWeakWord,
  filterReliableWeakWords,
  recordPersistentWordWeaknesses,
  mergePersistentWeakWords,
  sessionScoreFromOutcome,
  applyAyahRecitationMastery,
  applyRecitationMasteryFromResult,
}
