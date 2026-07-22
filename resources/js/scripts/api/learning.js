import axios from 'axios'

/**
 * Backend-driven learning persistence client.
 *
 * Wraps the Sanctum-protected /api endpoints that replace localStorage as the
 * source of truth for authenticated users. Includes small debounce + retry
 * helpers so the UI never blocks on the network and autosaves are not spammy.
 */

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
 * Debounce an async function. Calls are coalesced; the returned wrapper exposes
 * `.flush()` to run immediately and `.cancel()` to drop a pending call.
 */
export function createDebouncer(fn, wait = 1500) {
  let timer = null
  let lastArgs = null

  const run = () => {
    timer = null
    const args = lastArgs || []
    lastArgs = null
    return fn(...args)
  }

  const debounced = (...args) => {
    lastArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, wait)
  }

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      return run()
    }
    return undefined
  }

  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    lastArgs = null
  }

  debounced.pending = () => timer !== null

  return debounced
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function isRetryable(error) {
  // Network errors (no response) and 5xx / 429 are worth retrying.
  if (!error?.response) return true
  const status = error.response.status
  return status >= 500 || status === 429
}

/**
 * Retry an async function with exponential backoff. Non-retryable errors
 * (e.g. 401/403/422) are rethrown immediately.
 */
export async function withRetry(fn, { retries = 3, baseDelay = 800 } = {}) {
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt++
      if (attempt > retries || !isRetryable(error)) throw error
      await sleep(baseDelay * 2 ** (attempt - 1))
    }
  }
}

export const learningApi = {
  // Session ---------------------------------------------------------------
  async getSession() {
    const { data } = await http.get('/session')
    return data?.session ?? null
  },
  async getCurrentSession() {
    const { data } = await http.get('/session/current')
    return {
      session: data?.session ?? null,
      unfinished: !!data?.unfinished,
    }
  },
  async saveSession(payload) {
    const { data } = await http.post('/session', payload)
    return data
  },
  async startSession(payload = {}) {
    const { data } = await http.post('/session/start', payload)
    return data
  },
  async pauseSession(payload = {}) {
    const { data } = await http.post('/session/pause', payload)
    return data
  },
  async resumeSession(payload = {}) {
    const { data } = await http.post('/session/resume', payload)
    return data
  },
  async endSession(payload = {}) {
    const { data } = await http.post('/session/end', payload)
    return data
  },
  async discardOnboardingExampleSession(payload = {}) {
    const { data } = await http.post('/session', { ...payload, action: 'discard_example' })
    return data
  },

  // Continue --------------------------------------------------------------
  async getContinuePosition() {
    const { data } = await http.get('/continue')
    return data?.position ?? null
  },
  async saveContinuePosition(payload) {
    const { data } = await http.post('/continue', payload)
    return data
  },

  // Progress --------------------------------------------------------------
  async getProgress() {
    const { data } = await http.get('/progress')
    return data?.progress ?? []
  },
  async saveProgress(items) {
    const { data } = await http.post('/progress', { items })
    return data
  },

  // Analytics -------------------------------------------------------------
  async getAnalytics(params = {}) {
    const { data } = await http.get('/analytics', { params })
    return data?.analytics ?? []
  },
  async saveAnalytics(payload) {
    const { data } = await http.post('/analytics', payload)
    return data
  },

  // Full-fidelity state blob (live persistence boundary) ------------------
  async getState() {
    const { data } = await http.get('/state')
    return data ?? { state: null, meta: { has_state: false } }
  },
  async saveState(payload) {
    const { data } = await http.post('/state', payload)
    return data
  },

  // One-time legacy migration --------------------------------------------
  async migrateLocalStorage(payload) {
    const { data } = await http.post('/migrate-local-storage', payload)
    return data
  },

  // Personalised next-session recommendations -----------------------------
  async getNextRecommendation(params = {}) {
    const { data } = await http.get('/recommendations/next', { params })
    return data?.recommendation ?? null
  },
  async startRecommendedSession(recommendationId, settings = null) {
    const payload = { recommendation_id: recommendationId }
    const sanitized = sanitizeRecommendationSettings(settings)
    if (sanitized) {
      payload.settings = sanitized
    }
    const { data } = await http.post('/recommendations/start', payload)
    return data
  },
  async rejectRecommendation(recommendationId, choseOther = true) {
    const { data } = await http.post('/recommendations/reject', {
      recommendation_id: recommendationId,
      chose_other: choseOther,
    })
    return data
  },
  async submitRecommendationConfidence(recommendationId, confidence) {
    const { data } = await http.post('/recommendations/confidence', {
      recommendation_id: recommendationId,
      confidence,
    })
    return data?.recommendation ?? null
  },
  async saveRecommendationSettings(recommendationId, settings, reset = false) {
    const payload = { recommendation_id: recommendationId, reset: !!reset }
    if (!reset) {
      payload.settings = sanitizeRecommendationSettings(settings) || {}
    }
    const { data } = await http.post('/recommendations/settings', payload)
    return data?.recommendation ?? null
  },
  async submitRecommendationAiAssessment(recommendationId, assessment) {
    const { data } = await http.post('/recommendations/ai-assessment', {
      recommendation_id: recommendationId,
      result: assessment?.result,
      summary: assessment?.summary || undefined,
      weak_ayahs: Array.isArray(assessment?.weak_ayahs) ? assessment.weak_ayahs : undefined,
      sequence_errors: Number.isFinite(Number(assessment?.sequence_errors))
        ? Number(assessment.sequence_errors)
        : undefined,
      missed_words: Number.isFinite(Number(assessment?.missed_words))
        ? Number(assessment.missed_words)
        : undefined,
      pronunciation_issues: typeof assessment?.pronunciation_issues === 'boolean'
        ? assessment.pronunciation_issues
        : undefined,
    })
    return data?.recommendation ?? null
  },
}

function sanitizeRecommendationSettings(settings) {
  if (!settings || typeof settings !== 'object') return null
  const clean = {}
  const technique = String(settings.technique || '').toLowerCase().trim()
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(technique)) clean.technique = technique
  const complementary = String(settings.complementary_technique || '').toLowerCase().trim()
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(complementary)) {
    clean.complementary_technique = complementary
  }
  if (settings.reciter) clean.reciter = String(settings.reciter)
  const speed = Number(settings.playback_speed)
  if (Number.isFinite(speed)) clean.playback_speed = Math.max(0.5, Math.min(1.5, Number(speed.toFixed(2))))
  const reps = Number(settings.repetitions)
  if (Number.isFinite(reps)) clean.repetitions = Math.max(1, Math.min(8, Math.round(reps)))
  if (settings.ayat_per_step != null && settings.ayat_per_step !== '') {
    const step = Number(settings.ayat_per_step)
    if (Number.isFinite(step)) clean.ayat_per_step = Math.max(1, Math.min(10, Math.round(step)))
  }
  if (typeof settings.focus_enabled === 'boolean') clean.focus_enabled = settings.focus_enabled
  if (typeof settings.blur_enabled === 'boolean') clean.blur_enabled = settings.blur_enabled
  if (typeof settings.talqin_enabled === 'boolean') clean.talqin_enabled = settings.talqin_enabled
  if (typeof settings.chaining_enabled === 'boolean') clean.chaining_enabled = settings.chaining_enabled
  if (typeof settings.anchor_mode_enabled === 'boolean') clean.anchor_mode_enabled = settings.anchor_mode_enabled
  if (['linking', 'cumulative'].includes(String(settings.chaining_method || ''))) {
    clean.chaining_method = settings.chaining_method
  }
  const chainingReps = Number(settings.chaining_repetitions)
  if (Number.isFinite(chainingReps)) clean.chaining_repetitions = Math.max(1, Math.min(5, Math.round(chainingReps)))
  const anchorCount = Number(settings.anchor_count)
  if (Number.isFinite(anchorCount)) clean.anchor_count = Math.max(1, Math.min(3, Math.round(anchorCount)))
  return Object.keys(clean).length ? clean : null
}

export default learningApi
