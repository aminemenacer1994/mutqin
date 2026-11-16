import { normaliseTeacherWordStatus } from './wordReviewClass.js'

/** Keep unassessed evidence distinct from an explicit checker match. */
export function studioWordStatusKey(status) {
  const raw = String(status || '').trim().toLowerCase()
  if (!raw || ['unknown', 'pending', 'unassessed', 'gray', 'grey', 'notattempted', 'not_attempted'].includes(raw)) {
    return 'teacher.playback_word_unassessed'
  }
  const normalised = normaliseTeacherWordStatus({ status: raw })
  if (normalised === 'correct') return 'teacher.word_status_correct'
  if (normalised === 'partial') return 'teacher.playback_legend_uncertain'
  if (normalised === 'incorrect') return 'teacher.playback_legend_flagged'
  if (normalised === 'omitted') return 'teacher.word_status_omitted'
  if (normalised === 'extra') return 'teacher.word_status_extra'
  if (raw === 'skipped') return 'teacher.word_status_skipped'
  return 'teacher.playback_word_unassessed'
}

/** A missing confidence is not a recorded confidence of zero. */
export function studioConfidenceValue(value) {
  if (value == null || value === '' || typeof value === 'boolean') return ''
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return ''
  return number <= 1 ? `${Math.round(number * 100)}%` : String(number)
}

/** Each visible composer, including revision dates, participates in draft protection. */
export function studioHasDraft(state = {}) {
  const hasText = value => typeof value === 'string' && value.trim().length > 0
  const hasVoice = voice => Boolean(voice?.hasRecording || voice?.active)
  return [state.feedback, state.privateNote, state.wordNote, state.wordStatus, state.revisionNote].some(hasText)
    || Object.values(state.wordDrafts || {}).some(hasText)
    || Object.values(state.wordStatusDrafts || {}).some(hasText)
    || Boolean(state.initialDueAt && state.dueAt !== state.initialDueAt)
    || Boolean(state.initialWordDueAt && state.wordDueAt !== state.initialWordDueAt)
    || hasVoice(state.voiceState)
    || hasVoice(state.wordVoiceState)
}
