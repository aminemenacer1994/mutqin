import { practiceToolHref } from '../dashboard/studentPractice.js'

const QUALITY_KEYS = {
  invalid: 'dashboard.ai_recite.quality_invalid',
  low: 'dashboard.ai_recite.quality_low',
  incomplete: 'dashboard.ai_recite.quality_incomplete',
}

const PRACTICE_REASON_KEYS = {
  wording_difference: 'dashboard.ai_recite.practice_reason_wording_difference',
  uncertain: 'dashboard.ai_recite.practice_reason_uncertain',
  incomplete: 'dashboard.ai_recite.practice_reason_incomplete',
  recording: 'dashboard.ai_recite.practice_reason_recording',
}

/**
 * Open the existing Revise practice tool on a saved surah and ayah.
 * This is self-practice: it never carries an assignment submission id.
 */
export function practiceRevisionHref(base, target = {}) {
  const surah = Number(target?.surah_number || 0)
  const from = Number(target?.ayah_start || target?.ayah_number || target?.ayah || 0)
  const to = Number(target?.ayah_end || from)
  if (!(surah > 0 && from > 0)) return ''
  const href = practiceToolHref(base, 'revise')
  const url = new URL(href, 'http://localhost')
  url.searchParams.set('surah', String(surah))
  url.searchParams.set('from', String(from))
  url.searchParams.set('to', String(Math.max(from, to)))
  url.searchParams.delete('assignment_recipient')
  return `${url.pathname}${url.search}`
}

/** Only a server-provided practice target becomes a revision link. */
export function feedbackPracticeHref(base, item) {
  const practice = item?.feedback?.practice || item?.practice
  if (!practice || practice.tool !== 'revise') return ''
  return practiceRevisionHref(base, practice)
}

export function feedbackQualityKey(feedback) {
  return QUALITY_KEYS[feedback?.quality] || ''
}

export function practiceReasonKey(feedback) {
  return PRACTICE_REASON_KEYS[feedback?.practice?.reason] || ''
}

export function teacherReviewOf(feedback) {
  const review = feedback?.teacher_review
  if (!review || review.visible !== true || review.authority !== 'teacher') return null
  return review
}

export function feedbackContextKeys(feedback) {
  const links = feedback?.links || {}
  const keys = []
  if (Number(links.session_id) > 0) keys.push('dashboard.ai_recite.session_linked')
  if (Number(links.assignment_recipient_id) > 0) keys.push('dashboard.ai_recite.assignment_linked')
  return keys
}

/**
 * Hide scores and word counts the saved check cannot support.
 * Low-quality checks keep their stored counts, with a separate caveat.
 */
export function applyFeedbackToSummary(summary, feedback) {
  if (!feedback || typeof feedback !== 'object' || !summary) return summary
  if (feedback.valid === false) {
    return {
      ...summary,
      percent: null,
      matched: null,
      uncertain: null,
      mismatch: null,
      skipped: null,
      attention: null,
      hasDetailedCounts: false,
    }
  }
  if (feedback.quality === 'incomplete') {
    return {
      ...summary,
      matched: null,
      uncertain: null,
      mismatch: null,
      skipped: null,
      attention: null,
      hasDetailedCounts: false,
    }
  }
  const wording = feedback.wording
  if (!wording || typeof wording !== 'object') return summary
  const detailed = wording.matched != null || wording.uncertain != null || wording.mismatch != null || wording.skipped != null
  if (!detailed) return summary
  return {
    ...summary,
    percent: wording.percent == null ? summary.percent : wording.percent,
    matched: wording.matched,
    uncertain: wording.uncertain,
    mismatch: wording.mismatch,
    skipped: wording.skipped,
    attention: Number(wording.uncertain || 0) + Number(wording.mismatch || 0) + Number(wording.skipped || 0),
    hasDetailedCounts: true,
  }
}
