import learningApi from '../api/learning'

/**
 * AI Memorisation Detection API client.
 * Uses the shared learning API axios instance (Sanctum cookie + CSRF).
 */
export const memorisationDetectionApi = {
  async createAssessment(payload) {
    return learningApi.createMemorisationAssessment(payload)
  },

  async adjustPlan(planId, adjustments) {
    return learningApi.adjustMemorisationPracticePlan(planId, adjustments)
  },

  async startPlan(planId) {
    return learningApi.startMemorisationPracticePlan(planId)
  },

  async completePlan(planId, completion = {}) {
    return learningApi.completeMemorisationPracticePlan(planId, completion)
  },

  async retestPlan(planId, payload) {
    return learningApi.retestMemorisationPracticePlan(planId, payload)
  },
}

/**
 * Build ayah payload for Laravel alignment from verse objects.
 * @param {Array<object>} verses
 * @param {(verse: object) => string} getArabic
 */
export function buildAssessmentAyahs(verses = [], getArabic = (v) => v?.arabic || v?.text || '') {
  return (Array.isArray(verses) ? verses : []).map((verse) => {
    const ayahNumber = Number(verse?.number || verse?.ayah || String(verse?.key || '').split(':')[1] || 0)
    const surahNumber = Number(verse?.chapterId || verse?.surah || String(verse?.key || '').split(':')[0] || 0)
    const text = String(getArabic(verse) || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return {
      ayah_number: ayahNumber,
      surah_number: surahNumber,
      key: verse?.key || `${surahNumber}:${ayahNumber}`,
      text,
    }
  }).filter((ayah) => ayah.ayah_number > 0)
}

/**
 * @param {Array<object>} committedWords
 * @param {{ includeTiming?: boolean }} [options] — keep Speechmatics start/end for Tajweed practice check
 */
export function buildRecognitionWords(committedWords = [], options = {}) {
  const includeTiming = options.includeTiming !== false
  return (Array.isArray(committedWords) ? committedWords : [])
    .map((word) => {
      const text = String(word?.word || word?.text || '').trim().slice(0, 120)
      const rawWord = String(word?.rawWord || word?.raw_word || word?.display || '').trim()
      let confidence = Number(word?.confidence)
      if (!Number.isFinite(confidence)) confidence = 1
      else if (confidence > 1 && confidence <= 100) confidence = confidence / 100
      confidence = Math.max(0, Math.min(1, confidence))
      const entry = {
        word: text,
        confidence,
      }
      if (rawWord && rawWord !== text) entry.raw_word = rawWord.slice(0, 120)
      const token = word?.token
        ?? word?.speechmaticsToken
        ?? word?.speechmatics_token
        ?? word?.resultId
        ?? word?.result_id
        ?? word?.id
      if (token !== undefined && token !== null && String(token).trim()) {
        const tokenText = String(token).trim().slice(0, 160)
        entry.token = tokenText
        entry.speechmatics_token = tokenText
      }
      if (word?.provider) entry.provider = String(word.provider).slice(0, 40)
      if (word?.segmentId || word?.segment_id) {
        entry.segment_id = String(word.segmentId || word.segment_id).slice(0, 160)
      }
      const speaker = String(word?.speaker || '').trim().slice(0, 32)
      if (speaker) entry.speaker = speaker
      if (includeTiming) {
        const start = Number(word?.start ?? word?.startTime)
        const end = Number(word?.end ?? word?.endTime)
        if (Number.isFinite(start) && start >= 0) entry.start = start
        if (Number.isFinite(end) && end >= 0) entry.end = end
      }
      return entry
    })
    .filter((word) => word.word)
}

export default memorisationDetectionApi
