/**
 * Tracks whether recommendations improved performance and ranks techniques per learner.
 */

import { STORAGE_KEYS } from './constants.js'

function storage() {
  const bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null
  if (bridge?.getItem && bridge?.setItem) return bridge
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

/**
 * @returns {{
 *   techniqueScores: Record<string, number>,
 *   history: object[],
 * }}
 */
export function loadEffectivenessState() {
  const store = storage()
  if (!store) return { techniqueScores: {}, history: [] }
  try {
    const raw = store.getItem(STORAGE_KEYS.EFFECTIVENESS)
    if (!raw) return { techniqueScores: {}, history: [] }
    const parsed = JSON.parse(raw)
    return {
      techniqueScores: parsed?.techniqueScores && typeof parsed.techniqueScores === 'object'
        ? parsed.techniqueScores
        : {},
      history: Array.isArray(parsed?.history) ? parsed.history : [],
    }
  } catch {
    return { techniqueScores: {}, history: [] }
  }
}

export function saveEffectivenessState(state) {
  const store = storage()
  if (!store) return false
  try {
    store.setItem(STORAGE_KEYS.EFFECTIVENESS, JSON.stringify({
      techniqueScores: state?.techniqueScores || {},
      history: (state?.history || []).slice(-60),
    }))
    return true
  } catch {
    return false
  }
}

/**
 * Compare prior vs new mastery / behaviour after a recommended session or review.
 *
 * @param {{
 *   recommendationId?: string|number|null,
 *   technique?: string,
 *   accepted?: boolean,
 *   adjusted?: boolean,
 *   priorSkills?: Record<string, number>,
 *   newSkills?: Record<string, number>,
 *   priorHints?: number,
 *   newHints?: number,
 *   priorRecallMs?: number,
 *   newRecallMs?: number,
 *   priorAiBand?: string,
 *   newAiBand?: string,
 *   delayedRetentionDelta?: number,
 * }} observation
 */
export function recordEffectiveness(observation = {}) {
  const state = loadEffectivenessState()
  const deltas = computeDeltas(observation)
  const improved = deltas.overall > 0.02
  const declined = deltas.overall < -0.02

  const technique = String(observation.technique || '').toLowerCase()
  if (technique) {
    const prev = Number(state.techniqueScores[technique] || 0)
    let delta = 0
    if (observation.accepted === false || observation.adjusted) delta -= 0.05
    if (improved) delta += 0.12
    if (declined) delta -= 0.15
    // Avoid rewarding techniques the learner immediately changed away from
    if (observation.adjusted && !improved) delta -= 0.08
    state.techniqueScores[technique] = Math.round(Math.max(-1, Math.min(1, prev + delta)) * 100) / 100
  }

  state.history.push({
    at: new Date().toISOString(),
    recommendationId: observation.recommendationId ?? null,
    technique: technique || null,
    accepted: observation.accepted !== false,
    adjusted: !!observation.adjusted,
    deltas,
    improved,
  })

  saveEffectivenessState(state)
  return state
}

/**
 * @param {object} observation
 */
export function computeDeltas(observation = {}) {
  const skillDelta = averageDelta(observation.priorSkills || {}, observation.newSkills || {})
  const hintDelta = safeNum(observation.priorHints) - safeNum(observation.newHints)
  const speedDelta = (() => {
    const prior = safeNum(observation.priorRecallMs)
    const next = safeNum(observation.newRecallMs)
    if (!prior || !next) return 0
    return (prior - next) / prior
  })()
  const aiDelta = bandScore(observation.newAiBand) - bandScore(observation.priorAiBand)
  const retentionDelta = Number(observation.delayedRetentionDelta || 0)

  const overall = average([
    skillDelta,
    clamp(hintDelta / 5, -1, 1),
    clamp(speedDelta, -1, 1),
    clamp(aiDelta, -1, 1),
    clamp(retentionDelta, -1, 1),
  ])

  return {
    skillDelta: round2(skillDelta),
    hintReduction: round2(hintDelta),
    recallSpeedImprovement: round2(speedDelta),
    aiImprovement: round2(aiDelta),
    delayedRetention: round2(retentionDelta),
    overall: round2(overall),
  }
}

function averageDelta(prior, next) {
  const keys = [...new Set([...Object.keys(prior), ...Object.keys(next)])]
  if (!keys.length) return 0
  const deltas = keys.map((k) => Number(next[k] ?? 0.5) - Number(prior[k] ?? 0.5))
  return deltas.reduce((a, b) => a + b, 0) / deltas.length
}

function bandScore(band) {
  const b = String(band || '').toLowerCase()
  if (b === 'strong') return 1
  if (b === 'mixed') return 0.5
  if (b === 'weak') return 0
  return 0.5
}

function safeNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function average(values) {
  const nums = values.filter((n) => Number.isFinite(n))
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100
}

export const RecommendationEffectivenessService = {
  loadEffectivenessState,
  saveEffectivenessState,
  recordEffectiveness,
  computeDeltas,
}

export default RecommendationEffectivenessService
