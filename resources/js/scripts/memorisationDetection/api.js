import axios from 'axios'

function readCsrfToken() {
  const meta = typeof document !== 'undefined'
    ? document.head?.querySelector('meta[name="csrf-token"]')
    : null
  return meta?.content || ''
}

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  },
})

const csrf = readCsrfToken()
if (csrf) http.defaults.headers.common['X-CSRF-TOKEN'] = csrf

/**
 * AI Memorisation Detection API client.
 */
export const memorisationDetectionApi = {
  async createAssessment(payload) {
    const { data } = await http.post('/memorisation/assessments', payload)
    return data
  },

  async adjustPlan(planId, adjustments) {
    const { data } = await http.patch(`/memorisation/practice-plans/${planId}`, adjustments)
    return data?.practice_plan ?? data
  },

  async startPlan(planId) {
    const { data } = await http.post(`/memorisation/practice-plans/${planId}/start`)
    return data
  },

  async completePlan(planId, completion = {}) {
    const { data } = await http.post(`/memorisation/practice-plans/${planId}/complete`, completion)
    return data?.practice_plan ?? data
  },

  async retestPlan(planId, payload) {
    const { data } = await http.post(`/memorisation/practice-plans/${planId}/retest`, payload)
    return data
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
 */
export function buildRecognitionWords(committedWords = []) {
  return (Array.isArray(committedWords) ? committedWords : [])
    .map((word) => ({
      word: String(word?.word || word?.text || '').trim(),
      confidence: Number.isFinite(Number(word?.confidence)) ? Number(word.confidence) : 1,
    }))
    .filter((word) => word.word)
}

export default memorisationDetectionApi
