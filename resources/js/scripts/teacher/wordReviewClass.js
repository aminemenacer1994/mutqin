/**
 * Map persisted AI word assessment status → recitation-word-* class suffix.
 * Review mode treats unknown/pending as omitted (grey), never as correct.
 */
export function normaliseTeacherWordStatus(statusEntry = {}) {
  if (String(statusEntry?.type || '').toUpperCase() === 'DELETION') return 'omitted'
  const raw = String(
    statusEntry?.status
    || statusEntry?.visual_status
    || statusEntry?.visualStatus
    || 'unknown'
  ).toLowerCase()

  if (raw === 'wrong' || raw === 'incorrect' || raw === 'red' || raw === 'mismatch') return 'incorrect'
  if (raw === 'partial' || raw === 'minor_mistake' || raw === 'amber' || raw === 'low_confidence') return 'partial'
  if (raw === 'correct' || raw === 'green' || raw === 'matched') return 'correct'
  if (raw === 'omitted' || raw === 'missing' || raw === 'omission' || raw === 'black') return 'omitted'
  if (raw === 'skipped') return 'skipped'
  if (raw === 'extra') return 'extra'
  if (
    raw === 'notattempted'
    || raw === 'not_attempted'
    || raw === 'pending'
    || raw === 'unknown'
    || raw === 'gray'
    || raw === 'grey'
  ) {
    return 'skipped'
  }
  return 'skipped'
}

export function wordReviewClass(statusEntry = {}, extra = '') {
  const status = normaliseTeacherWordStatus(statusEntry)
  const base = `recitation-word-${status}`
  return extra ? `${base} ${extra}` : base
}

export function wordReviewTitle(statusEntry = {}, t = (key) => key) {
  const status = normaliseTeacherWordStatus(statusEntry)
  if (status === 'correct') return t('teacher.word_status_correct')
  if (status === 'partial') return t('teacher.word_status_partial')
  if (status === 'incorrect') return t('teacher.word_status_incorrect')
  if (status === 'omitted') return t('teacher.word_status_omitted')
  if (status === 'skipped') return t('teacher.word_status_skipped')
  if (status === 'extra') return t('teacher.word_status_extra')
  return ''
}
