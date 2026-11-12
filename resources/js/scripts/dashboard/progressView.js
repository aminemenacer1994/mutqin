const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const LAYOUTS = ['stacked', 'mushaf', 'madani_mushaf']

export const WORD_STATE = Object.freeze({
  matched: 'matched',
  mismatch: 'mismatch',
  uncertain: 'uncertain',
  skipped: 'skipped',
  extra: 'extra',
  unassessed: 'unassessed',
})

const STATE_LABEL = {
  matched: 'dashboard.word_matched',
  mismatch: 'dashboard.word_mismatch',
  uncertain: 'dashboard.word_uncertain',
  skipped: 'dashboard.word_skipped',
  extra: 'dashboard.word_extra',
  unassessed: 'dashboard.word_unassessed',
}

function textOf(word, keys) {
  for (const key of keys) {
    const value = String(word?.[key] || '').trim()
    if (value) return value
  }
  return ''
}

export function classifyStoredWord(word) {
  if (!word || typeof word !== 'object') return WORD_STATE.unassessed
  if (word.state && STATE_LABEL[word.state]) return word.state
  const status = String(word.status || word.result_type || '').toLowerCase()
  const type = String(word.type || '').toUpperCase()
  let raw = status
  if (!raw && type) {
    if (type === 'DELETION') raw = 'omitted'
    else if (type === 'EXTRA' || type === 'ADDITIONAL') raw = 'extra'
    else if (type === 'UNASSESSED') raw = 'unassessed'
    else if (type === 'DIVERGENCE') raw = 'wrong'
  }
  if (['extra', 'additional'].includes(raw)) return WORD_STATE.extra
  if (['omitted', 'missing', 'skipped', 'deletion', 'black'].includes(raw)) return WORD_STATE.skipped
  if (['wrong', 'incorrect', 'substitution', 'unmatched', 'red', 'out_of_order'].includes(raw)) return WORD_STATE.mismatch
  if (['close_match', 'minor_mistake', 'partial', 'uncertain', 'low_confidence', 'amber'].includes(raw)) return WORD_STATE.uncertain
  if (['correct', 'match', 'ok', 'matched', 'green'].includes(raw)) {
    const confidence = storedConfidence(word)
    if (confidence != null && confidence < 0.55) return WORD_STATE.uncertain
    return WORD_STATE.matched
  }
  return WORD_STATE.unassessed
}

export function storedConfidence(word) {
  const raw = Number(word?.classification_confidence ?? word?.confidence)
  if (!Number.isFinite(raw) || raw <= 0 || raw > 1) return null
  return raw
}

export function expectedIndex(word) {
  for (const key of ['index', 'ayah_word_index', 'ayahWordIndex', 'word_index', 'wordIndex', 'expected_index', 'target_index']) {
    if (word?.[key] == null || word[key] === '') continue
    const index = Number(word[key])
    if (Number.isInteger(index) && index >= 0 && index <= 80) return index
  }
  return null
}

/**
 * Paint a verified ayah in its stored order. Words without a saved status stay unassessed.
 * The token array is never reversed.
 */
export function paintReferenceWords(referenceText, storedWords, ayahNumber) {
  const tokens = String(referenceText || '').split(/\s+/u).filter(Boolean)
  const rows = (Array.isArray(storedWords) ? storedWords : []).filter((word) => {
    const ayah = Number(word?.ayah ?? word?.ayah_number ?? word?.ayahNumber ?? 0)
    return !ayahNumber || !ayah || ayah === Number(ayahNumber)
  })
  const byIndex = new Map()
  rows.forEach((word) => {
    const index = expectedIndex(word)
    if (index != null && !byIndex.has(index)) byIndex.set(index, word)
  })
  if (!tokens.length) {
    return {
      source: 'unavailable',
      words: rows
        .filter((word) => classifyStoredWord(word) !== WORD_STATE.extra)
        .map((word, index) => presentWord(word, textOf(word, ['expected', 'expected_word', 'text', 'target_word']), index)),
    }
  }
  return {
    source: 'uthmani',
    words: tokens.map((token, index) => presentWord(byIndex.get(index), token, index)),
  }
}

export function detectedWords(storedWords, ayahNumber) {
  return (Array.isArray(storedWords) ? storedWords : [])
    .filter((word) => {
      const ayah = Number(word?.ayah ?? word?.ayah_number ?? word?.ayahNumber ?? 0)
      if (ayahNumber && ayah && ayah !== Number(ayahNumber)) return false
      const state = classifyStoredWord(word)
      return state === WORD_STATE.extra || textOf(word, ['detected', 'recognised_word', 'recognized_word', 'detected_token', 'actual'])
    })
    .map((word, index) => presentWord(
      word,
      textOf(word, ['detected', 'recognised_word', 'recognized_word', 'detected_token', 'actual']) || textOf(word, ['expected', 'text']),
      expectedIndex(word) ?? index,
    ))
    .filter((word) => word.text)
}

function presentWord(stored, text, index) {
  const state = stored ? classifyStoredWord(stored) : WORD_STATE.unassessed
  const confidence = stored ? storedConfidence(stored) : null
  return {
    text: String(text || ''),
    state,
    labelKey: STATE_LABEL[state] || STATE_LABEL.unassessed,
    index,
    confidence,
    outOfOrder: !!(stored?.out_of_order || stored?.outOfOrder),
  }
}

export function presentationTone(score) {
  if (score == null || score === '') return 'neutral'
  const n = Number(score)
  if (!Number.isFinite(n) || n < 0 || n > 100) return 'neutral'
  if (n >= 90) return 'strong'
  if (n >= 75) return 'mixed'
  return 'weak'
}

export function buildReviewHref(base, item) {
  const root = String(base || '/memorisation').split('?')[0]
  const surah = Number(item?.surah_number || 0)
  const ayah = Number(item?.ayah_number || item?.ayah_start || 0)
  const end = Number(item?.ayah_end || ayah)
  if (!(surah > 0 && ayah > 0)) return root
  const params = new URLSearchParams({
    surah: String(surah),
    from: String(ayah),
    to: String(Math.max(ayah, end)),
    review: '1',
    return: 'dashboard',
  })
  const attemptId = Number(item?.attempt_id || item?.id || 0)
  const assessmentId = Number(item?.assessment_id || 0)
  if (attemptId > 0) params.set('attempt', String(attemptId))
  if (assessmentId > 0) params.set('prior_assessment', String(assessmentId))
  const flagged = flaggedTokens(item)
  if (flagged.length) params.set('weak', flagged.join(','))
  const settings = item?.settings && typeof item.settings === 'object' ? item.settings : {}
  const reciter = String(settings.reciter || '')
  if (/^ar\.[a-z0-9]+$/i.test(reciter)) params.set('reciter', reciter)
  const speed = Number(settings.speed)
  if (SPEEDS.includes(speed)) params.set('speed', String(speed))
  const repetitions = Number(settings.repetitions)
  if (Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 10) {
    params.set('repetitions', String(repetitions))
  }
  const layout = String(settings.layout || '')
  if (LAYOUTS.includes(layout)) params.set('view', layout)
  return `${root}?${params.toString()}`
}

export function buildCheckAgainHref(base, item) {
  const root = String(base || '/memorisation').split('?')[0]
  const surah = Number(item?.surah_number || 0)
  const from = Number(item?.ayah_start || item?.ayah_number || 0)
  const to = Number(item?.ayah_end || from)
  if (!(surah > 0 && from > 0)) return root
  const params = new URLSearchParams({
    surah: String(surah),
    from: String(from),
    to: String(Math.max(from, to)),
    ai_check: '1',
    return: 'dashboard',
  })
  const assessmentId = Number(item?.assessment_id || 0)
  if (assessmentId > 0) params.set('prior_assessment', String(assessmentId))
  return `${root}?${params.toString()}`
}

function flaggedTokens(item) {
  const surah = Number(item?.surah_number || 0)
  const ayah = Number(item?.ayah_number || item?.ayah_start || 0)
  const words = Array.isArray(item?.words) ? item.words : []
  return words
    .filter((word) => ['mismatch', 'uncertain', 'skipped'].includes(classifyStoredWord(word)))
    .map((word) => expectedIndex(word))
    .filter((index) => index != null)
    .slice(0, 24)
    .map((index) => `${surah}:${ayah}:${index}`)
}

export const PREVIOUS_AI_CHECK_KEY = 'mutqin.previousAiCheck'

export function stashPreviousAiCheck(storage, item) {
  if (!storage || !item) return
  const words = (Array.isArray(item.words) ? item.words : [])
    .filter((word) => ['mismatch', 'uncertain', 'skipped'].includes(classifyStoredWord(word)))
    .map((word) => ({
      surahId: Number(item.surah_number || word.surah || 0),
      ayahNumber: Number(word.ayah || item.ayah_number || 0),
      wordIndex: expectedIndex(word),
      text: textOf(word, ['expected', 'expected_word', 'text', 'target_word']),
      reason: classifyStoredWord(word) === 'skipped' ? 'omission' : 'pronunciation',
      status: classifyStoredWord(word),
    }))
    .filter((word) => word.wordIndex != null)
  try {
    storage.setItem(PREVIOUS_AI_CHECK_KEY, JSON.stringify({
      attemptId: Number(item.attempt_id || item.id || 0) || null,
      assessmentId: Number(item.assessment_id || 0) || null,
      surah: Number(item.surah_number || 0),
      ayah: Number(item.ayah_number || item.ayah_start || 0),
      words,
    }))
  } catch (_) { /* storage can be unavailable */ }
}

export function readPreviousAiCheck(storage) {
  if (!storage) return null
  try {
    const parsed = JSON.parse(storage.getItem(PREVIOUS_AI_CHECK_KEY) || 'null')
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (_) {
    return null
  }
}

export function compatibleAttemptDelta(current, previous) {
  if (!current || !previous) return null
  if (Number(current.id) === Number(previous.id)) return null
  const samePassage = Number(current.surah_number) === Number(previous.surah_number)
    && Number(current.ayah_start) === Number(previous.ayah_start)
    && Number(current.ayah_end) === Number(previous.ayah_end)
  if (!samePassage) return null
  const modelA = String(current.model_version || '')
  const modelB = String(previous.model_version || '')
  const algorithmA = String(current.algorithm_version || '')
  const algorithmB = String(previous.algorithm_version || '')
  if (!modelA || !modelB || modelA !== modelB) return null
  if (algorithmA !== algorithmB) return null
  const left = Number(current.accuracy_percent)
  const right = Number(previous.accuracy_percent)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  return {
    points: left - right,
    model_version: modelA,
  }
}
