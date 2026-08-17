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

function readXsrfCookie() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
  if (!match?.[1]) return ''
  try {
    return decodeURIComponent(match[1])
  } catch (_) {
    return match[1]
  }
}

function syncCsrfHeaders(config = {}) {
  const headers = { ...(config.headers || {}) }
  const meta = readCsrfToken()
  const xsrf = readXsrfCookie()
  if (meta) headers['X-CSRF-TOKEN'] = meta
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
  return { ...config, headers }
}

let csrfCookiePromise = null

async function ensureCsrfCookie({ force = false } = {}) {
  if (!force && readXsrfCookie()) return
  if (!csrfCookiePromise) {
    csrfCookiePromise = axios
      .get('/sanctum/csrf-cookie', { withCredentials: true })
      .catch(() => null)
      .finally(() => {
        csrfCookiePromise = null
      })
  }
  await csrfCookiePromise
}

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

http.interceptors.request.use(async (config) => {
  const method = String(config.method || 'get').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method) && !readXsrfCookie()) {
    await ensureCsrfCookie()
  }
  return syncCsrfHeaders(config)
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config
    const status = error?.response?.status
    if (status === 419 && config && !config.__csrfRetried) {
      config.__csrfRetried = true
      await ensureCsrfCookie({ force: true })
      return http.request(syncCsrfHeaders(config))
    }
    return Promise.reject(error)
  }
)

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
  // Never retry intentional cancellations / aborts.
  if (
    error?.code === 'ERR_CANCELED'
    || error?.name === 'CanceledError'
    || error?.name === 'AbortError'
    || error?.__CANCEL__
  ) {
    return false
  }
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
  // Dashboard -------------------------------------------------------------
  async getDashboard(days = 30, options = {}) {
    const safeDays = days === 7 ? 7 : 30
    const { signal } = options
    const { data } = await withRetry(() =>
      http.get('/dashboard', {
        params: { days: safeDays },
        signal,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    // Laravel JsonResource wraps the payload under `data`.
    return data?.data && typeof data.data === 'object' ? data.data : data
  },
  async getActivityLog(limit = 100) {
    const { data } = await withRetry(() =>
      http.get('/dashboard/activity', {
        params: { limit },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    return Array.isArray(data?.activity) ? data.activity : []
  },

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
  async getSessionHistory() {
    const { data } = await http.get('/sessions/history')
    return Array.isArray(data?.sessions) ? data.sessions : []
  },
  async getAiReciteAttempts() {
    const { data } = await http.get('/ai-recite-attempts')
    return Array.isArray(data?.attempts) ? data.attempts : []
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

  // Private āyah notes & reflections --------------------------------------
  async getAyahNotes(params = {}) {
    const { data } = await http.get('/ayah-notes', { params })
    return Array.isArray(data?.notes) ? data.notes : []
  },
  async getAyahNoteCounts(surahNumber) {
    const { data } = await http.get('/ayah-notes/counts', {
      params: { surah_number: Number(surahNumber) },
    })
    return data?.counts && typeof data.counts === 'object' ? data.counts : {}
  },
  async createAyahNote(payload) {
    const { data } = await http.post('/ayah-notes', payload)
    return data?.note ?? null
  },
  async updateAyahNote(noteId, payload) {
    const { data } = await http.put(`/ayah-notes/${noteId}`, payload)
    return data?.note ?? null
  },
  async deleteAyahNote(noteId) {
    const { data } = await http.delete(`/ayah-notes/${noteId}`)
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
  async getNextRecommendation(params = {}, options = {}) {
    const { signal } = options
    const { data } = await http.get('/recommendations/next', { params, signal })
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
  async submitRecommendationConfidence(recommendationId, confidence, extras = {}) {
    const { data } = await http.post('/recommendations/confidence', {
      recommendation_id: recommendationId,
      confidence,
      plan_detail: extras?.plan_detail && typeof extras.plan_detail === 'object'
        ? extras.plan_detail
        : undefined,
      ayah_range: extras?.ayah_range && typeof extras.ayah_range === 'object'
        ? extras.ayah_range
        : undefined,
      focus_ayahs: Array.isArray(extras?.focus_ayahs) ? extras.focus_ayahs : undefined,
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
    const colorCounts = assessment?.color_counts && typeof assessment.color_counts === 'object'
      ? assessment.color_counts
      : undefined
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
      color_counts: colorCounts,
      plan_detail: assessment?.plan_detail && typeof assessment.plan_detail === 'object'
        ? assessment.plan_detail
        : undefined,
      ayah_range: assessment?.ayah_range && typeof assessment.ayah_range === 'object'
        ? assessment.ayah_range
        : undefined,
      focus_ayahs: Array.isArray(assessment?.focus_ayahs) ? assessment.focus_ayahs : undefined,
      settings: assessment?.settings && typeof assessment.settings === 'object'
        ? sanitizeRecommendationSettings(assessment.settings)
        : undefined,
      average_accuracy: Number.isFinite(Number(assessment?.average_accuracy))
        ? Number(assessment.average_accuracy)
        : undefined,
      accuracy_percent: Number.isFinite(Number(assessment?.accuracy_percent))
        ? Number(assessment.accuracy_percent)
        : undefined,
      attempt_count: Number.isFinite(Number(assessment?.attempt_count))
        ? Number(assessment.attempt_count)
        : undefined,
      weak_words: Array.isArray(assessment?.weak_words) ? assessment.weak_words : undefined,
      attempts: Array.isArray(assessment?.attempts)
        ? assessment.attempts.slice(0, 10).map((attempt, index) => ({
          attempt_number: Number(attempt?.attempt_number ?? index + 1),
          accuracy: Number.isFinite(Number(attempt?.accuracy ?? attempt?.accuracyPercent))
            ? Number(attempt.accuracy ?? attempt.accuracyPercent)
            : undefined,
          band: attempt?.band || undefined,
          ayah_range: attempt?.ayah_range && typeof attempt.ayah_range === 'object'
            ? attempt.ayah_range
            : undefined,
          color_counts: attempt?.color_counts && typeof attempt.color_counts === 'object'
            ? attempt.color_counts
            : undefined,
          weak_words: Array.isArray(attempt?.weak_words) ? attempt.weak_words : undefined,
          word_statuses: Array.isArray(attempt?.word_statuses)
            ? attempt.word_statuses.slice(0, 200)
            : (Array.isArray(attempt?.result?.wordStatuses)
              ? attempt.result.wordStatuses.slice(0, 200)
              : undefined),
          plan_snapshot: attempt?.plan_snapshot && typeof attempt.plan_snapshot === 'object'
            ? attempt.plan_snapshot
            : undefined,
        }))
        : undefined,
    })
    return data?.recommendation ?? null
  },
  async getRecommendationHistory(limit = 20) {
    const { data } = await http.get('/recommendations/history', {
      params: { limit: Math.max(1, Math.min(50, Number(limit) || 20)) },
    })
    return Array.isArray(data?.history) ? data.history : []
  },
  async createMemorisationAssessment(payload) {
    const { data } = await http.post('/memorisation/assessments', payload)
    return data
  },
  async recordFailedMemorisationAssessment(payload) {
    const { data } = await http.post('/memorisation/assessments/failed', payload)
    return data
  },
  async adjustMemorisationPracticePlan(planId, adjustments) {
    const { data } = await http.patch(`/memorisation/practice-plans/${planId}`, adjustments)
    return data?.practice_plan ?? data
  },
  async startMemorisationPracticePlan(planId) {
    const { data } = await http.post(`/memorisation/practice-plans/${planId}/start`)
    return data
  },
  async completeMemorisationPracticePlan(planId, completion = {}) {
    const { data } = await http.post(`/memorisation/practice-plans/${planId}/complete`, completion)
    return data?.practice_plan ?? data
  },
  async retestMemorisationPracticePlan(planId, payload) {
    const { data } = await http.post(`/memorisation/practice-plans/${planId}/retest`, payload)
    return data
  },
  async submitRecommendationAdaptiveAssessment(recommendationId, assessment) {
    const { data } = await http.post('/recommendations/adaptive-assessment', {
      recommendation_id: recommendationId,
      result: assessment?.result,
      summary: assessment?.summary || undefined,
      assessment_id: assessment?.assessment_id || undefined,
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
      reason_codes: Array.isArray(assessment?.reason_codes) ? assessment.reason_codes : undefined,
      skills: assessment?.skills && typeof assessment.skills === 'object' ? assessment.skills : undefined,
      skill_view: Array.isArray(assessment?.skill_view) ? assessment.skill_view : undefined,
      policy: assessment?.policy && typeof assessment.policy === 'object' ? assessment.policy : undefined,
      responses: Array.isArray(assessment?.responses) ? assessment.responses : undefined,
      events: Array.isArray(assessment?.events) ? assessment.events : undefined,
      review: assessment?.review && typeof assessment.review === 'object' ? assessment.review : undefined,
      snapshot: assessment?.snapshot && typeof assessment.snapshot === 'object' ? assessment.snapshot : undefined,
      plan_detail: assessment?.plan_detail && typeof assessment.plan_detail === 'object'
        ? assessment.plan_detail
        : undefined,
      ayah_range: assessment?.ayah_range && typeof assessment.ayah_range === 'object'
        ? assessment.ayah_range
        : undefined,
      focus_ayahs: Array.isArray(assessment?.focus_ayahs) ? assessment.focus_ayahs : undefined,
    })
    return data?.recommendation ?? null
  },
}

function sanitizeRecommendationSettings(settings) {
  if (!settings || typeof settings !== 'object') return null
  const clean = {}
  const technique = String(settings.technique || '').toLowerCase().trim()
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor', 'chunking'].includes(technique)) clean.technique = technique
  const complementary = String(settings.complementary_technique || '').toLowerCase().trim()
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor', 'chunking'].includes(complementary)) {
    clean.complementary_technique = complementary
  }
  const tipTechnique = String(settings.tip_technique || '').toLowerCase().trim()
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor', 'chunking'].includes(tipTechnique)) {
    clean.tip_technique = tipTechnique
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
  if (Number.isFinite(anchorCount)) clean.anchor_count = Math.max(1, Math.min(4, Math.round(anchorCount)))
  const scopeRaw = String(settings.practice_scope || settings.scope || '').toLowerCase().trim()
  if (scopeRaw === 'weak_areas' || scopeRaw === 'weak' || scopeRaw === 'weak_words' || scopeRaw === 'weak_only') {
    clean.practice_scope = 'weak_areas'
    clean.practice_weak_words_only = true
    clean.weak_words_only = true
  } else if (scopeRaw === 'full_range' || scopeRaw === 'full' || scopeRaw === 'full_session') {
    clean.practice_scope = 'full_range'
    clean.practice_weak_words_only = false
    clean.weak_words_only = false
  }
  if (typeof settings.practice_weak_words_only === 'boolean' && clean.practice_scope == null) {
    clean.practice_weak_words_only = settings.practice_weak_words_only
    clean.weak_words_only = settings.practice_weak_words_only
    clean.practice_scope = settings.practice_weak_words_only ? 'weak_areas' : 'full_range'
  }
  if (typeof settings.emphasize_weak_areas === 'boolean') {
    clean.emphasize_weak_areas = settings.emphasize_weak_areas
  }
  if (settings.source_attempt_id != null && settings.source_attempt_id !== '') {
    clean.source_attempt_id = String(settings.source_attempt_id).slice(0, 64)
  }
  if (Array.isArray(settings.focus_ayahs)) {
    clean.focus_ayahs = settings.focus_ayahs
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 300)
      .slice(0, 40)
  }
  if (Array.isArray(settings.practice_focus_items)) {
    clean.practice_focus_items = settings.practice_focus_items.slice(0, 16).map((item) => {
      if (!item || typeof item !== 'object') return null
      const ayahNumber = Number(item.ayahNumber)
      if (!Number.isFinite(ayahNumber) || ayahNumber < 1) return null
      return {
        type: ['word', 'phrase', 'ayah'].includes(String(item.type)) ? String(item.type) : 'phrase',
        surahId: Number.isFinite(Number(item.surahId)) ? Number(item.surahId) : undefined,
        ayahNumber,
        verseKey: item.verseKey ? String(item.verseKey).slice(0, 32) : undefined,
        startWordIndex: Math.max(0, Number(item.startWordIndex) || 0),
        endWordIndex: Math.max(0, Number(item.endWordIndex) || 0),
        weakWordIndexes: Array.isArray(item.weakWordIndexes)
          ? item.weakWordIndexes.map(Number).filter((n) => Number.isFinite(n) && n >= 0).slice(0, 40)
          : [],
        wordIds: Array.isArray(item.wordIds)
          ? item.wordIds.map((id) => String(id).slice(0, 40)).slice(0, 24)
          : [],
      }
    }).filter(Boolean)
  }
  const weakSource = Array.isArray(settings.practice_weak_words)
    ? settings.practice_weak_words
    : (Array.isArray(settings.weak_words) ? settings.weak_words : null)
  if (weakSource?.length) {
    clean.practice_weak_words = weakSource.slice(0, 12).map((word) => {
      if (!word || typeof word !== 'object') return null
      const wordIndex = Number(word.ayahWordIndex ?? word.wordIndex ?? word.index)
      if (!Number.isFinite(wordIndex) || wordIndex < 0) return null
      return {
        text: String(word.text || word.word || word.ar || '').slice(0, 120),
        wordIndex,
        ayahNumber: Number.isFinite(Number(word.ayahNumber)) ? Number(word.ayahNumber) : undefined,
        surahId: Number.isFinite(Number(word.surahId)) ? Number(word.surahId) : undefined,
        verseKey: word.verseKey || word.ayahKey || undefined,
        reason: word.reason || word.status || undefined,
      }
    }).filter(Boolean)
  }
  return Object.keys(clean).length ? clean : null
}

export default learningApi
