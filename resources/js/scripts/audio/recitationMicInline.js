/**
 * Inline microphone status for AI recitation (no blocking permission modal).
 */

import { MICROPHONE_ACCESS_KIND } from './microphonePermissionHelp.js'

export const RECITATION_MIC_INLINE_STATUS = Object.freeze({
  READY: 'ready',
  CHECKING: 'checking',
  LISTENING: 'listening',
  NEED_ACCESS: 'need_access',
  NO_DEVICE: 'no_device',
  UNAVAILABLE: 'unavailable',
  LOW_INPUT: 'low_input',
  RECORDING_ISSUE: 'recording_issue',
})

/** RMS below this is treated as silence for low-input hints (0–1 scale). */
export const RECITATION_MIC_LOW_INPUT_RMS = 0.008

/** After this many ms of low RMS while recording, surface low-input status. */
export const RECITATION_MIC_LOW_INPUT_GRACE_MS = 2800

/**
 * @param {string} [kind]
 * @returns {string}
 */
export function inlineMicStatusFromHelpKind(kind = '') {
  switch (String(kind || '').trim()) {
    case MICROPHONE_ACCESS_KIND.NOT_ALLOWED:
      return RECITATION_MIC_INLINE_STATUS.NEED_ACCESS
    case MICROPHONE_ACCESS_KIND.NOT_FOUND:
      return RECITATION_MIC_INLINE_STATUS.NO_DEVICE
    case MICROPHONE_ACCESS_KIND.NOT_READABLE:
    case MICROPHONE_ACCESS_KIND.SECURITY:
    case MICROPHONE_ACCESS_KIND.ABORTED:
    case MICROPHONE_ACCESS_KIND.UNKNOWN:
      return RECITATION_MIC_INLINE_STATUS.RECORDING_ISSUE
    case MICROPHONE_ACCESS_KIND.UNSUPPORTED:
      return RECITATION_MIC_INLINE_STATUS.UNAVAILABLE
    default:
      return RECITATION_MIC_INLINE_STATUS.READY
  }
}

/**
 * @param {{ explanation?: string, steps?: string[] }} [help]
 * @returns {string[]}
 */
export function micInlineGuidanceSteps(help) {
  const steps = Array.isArray(help?.steps) ? help.steps : []
  return steps.map((step) => String(step || '').trim()).filter(Boolean)
}

/**
 * @param {{ explanation?: string, steps?: string[] }} [help]
 * @returns {string}
 */
export function micInlineGuidanceLead(help) {
  return String(help?.explanation || '').trim()
}

/**
 * @param {number} rms
 * @returns {number} 0–100 for aria-valuenow
 */
export function micInputLevelPercent(rms) {
  const value = Number(rms)
  if (!Number.isFinite(value) || value <= 0) return 0
  const scaled = Math.min(1, value / 0.12)
  return Math.round(scaled * 100)
}
