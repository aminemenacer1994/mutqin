import axios from 'axios'
import { attachHttpErrorTracking } from '../observability/errorTracking'
import { attachNetworkFailureEmitter } from '../../utils/networkStatus'

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
  timeout: 30000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

attachNetworkFailureEmitter(http)
attachHttpErrorTracking(http)

function isSessionMutation(config = {}) {
  const method = String(config.method || 'get').toLowerCase()
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return false
  const path = String(config.url || '')
  return path === '/session'
    || path.startsWith('/session/')
    || path === 'session'
    || path.startsWith('session/')
}

http.interceptors.request.use(async (config) => {
  const method = String(config.method || 'get').toLowerCase()
  // Session start/save/pause are CSRF-sensitive; refresh cookie when missing so a
  // stale page meta token alone cannot produce a hard 419 failure.
  if (['post', 'put', 'patch', 'delete'].includes(method) && (!readXsrfCookie() || isSessionMutation(config))) {
    await ensureCsrfCookie({ force: !readXsrfCookie() })
  }
  return syncCsrfHeaders(config)
})

/** 409 = stale/conflict body; callers handle it — avoid axios reject + console noise. */
const HTTP_VALIDATE_WITH_CONFLICT = {
  validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config
    const status = error?.response?.status
    if (status === 429 && error?.response?.data?.reason === 'daily_limit' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mutqin:upgrade-required', { detail: error.response.data }))
    }
    if (status === 419 && config && !config.__csrfRetried) {
      config.__csrfRetried = true
      await ensureCsrfCookie({ force: true })
      const retryConfig = syncCsrfHeaders(config)
      if (readCsrfToken()) {
        http.defaults.headers.common['X-CSRF-TOKEN'] = readCsrfToken()
      }
      return http.request(retryConfig)
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

export function createClientMessageId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16)
    const digit = character === 'x' ? value : ((value & 0x3) | 0x8)
    return digit.toString(16)
  })
}

export async function stableClientMessageId(seed) {
  try {
    const subtle = globalThis.crypto?.subtle
    if (!subtle?.digest) return createClientMessageId()
    const digest = new Uint8Array(await subtle.digest('SHA-1', new TextEncoder().encode(String(seed))))
    digest[6] = (digest[6] & 0x0f) | 0x50
    digest[8] = (digest[8] & 0x3f) | 0x80
    const hex = [...digest.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  } catch {
    return createClientMessageId()
  }
}

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

function buildTeacherLearningPlanRequestBody(payload = {}, itemVoices = []) {
  const voices = Array.isArray(itemVoices) ? itemVoices : []
  const hasVoice = voices.some((voice) => Boolean(
    voice?.instruction?.blob
    || voice?.recitationDemo?.blob
    || voice?.clearInstruction
    || voice?.clearRecitationDemo
    || voice?.instruction_audio_asset_id
    || voice?.recitation_demo_audio_asset_id,
  ))
  const items = Array.isArray(payload.items) ? payload.items.map((item, index) => {
    const voice = voices[index] || {}
  const next = { ...item }
    if (voice.instruction_audio_asset_id) next.instruction_audio_asset_id = voice.instruction_audio_asset_id
    if (voice.recitation_demo_audio_asset_id) next.recitation_demo_audio_asset_id = voice.recitation_demo_audio_asset_id
    if (voice.clearInstruction) next.clear_instruction_audio = true
    if (voice.clearRecitationDemo) next.clear_recitation_demo_audio = true
    if (voice.instruction?.durationMs) next.instruction_audio_duration_ms = Math.round(voice.instruction.durationMs)
    if (voice.recitationDemo?.durationMs) next.recitation_demo_audio_duration_ms = Math.round(voice.recitationDemo.durationMs)
    return next
  }) : []
  if (!hasVoice) {
    return { ...payload, items }
  }
  const form = new FormData()
  const scalarKeys = ['student_id', 'title', 'cadence', 'starts_on', 'ends_on', 'notes', 'student_goal', 'activate', 'allow_duplicate', 'status']
  scalarKeys.forEach((key) => {
    const value = payload[key]
    if (value === undefined || value === null || value === '') return
    if (key === 'activate' || key === 'allow_duplicate') {
      form.append(key, value ? '1' : '0')
      return
    }
    form.append(key, String(value))
  })
  form.append('items', JSON.stringify(items))
  voices.forEach((voice, index) => {
    if (voice?.instruction?.blob) {
      form.append(`items_instruction_audio_${index}`, voice.instruction.blob, voice.instruction.filename || 'instruction.webm')
    }
    if (voice?.recitationDemo?.blob) {
      form.append(`items_recitation_demo_audio_${index}`, voice.recitationDemo.blob, voice.recitationDemo.filename || 'recitation-demo.webm')
    }
  })

  return form
}

function buildTeacherAssignmentRequestBody(payload = {}, recordings = {}) {
  const hasVoice = Boolean(
    recordings.instruction?.blob
    || recordings.recitationDemo?.blob
    || recordings.clearInstruction
    || recordings.clearRecitationDemo,
  )
  if (!hasVoice) return payload

  const form = new FormData()
  const scalarKeys = [
    'kind', 'hifz_category', 'activity', 'recording_required', 'surah_number', 'ayah_start', 'ayah_end',
    'repetition_target', 'due_at', 'priority', 'feedback', 'student_id', 'learning_group_id',
  ]
  scalarKeys.forEach((key) => {
    const value = payload[key]
    if (value === undefined || value === null || value === '') return
    if (key === 'recording_required') {
      form.append(key, value ? '1' : '0')
      return
    }
    form.append(key, String(value))
  })
  if (payload.session_settings && typeof payload.session_settings === 'object') {
    form.append('session_settings', JSON.stringify(payload.session_settings))
  }
  if (recordings.instruction?.blob) {
    form.append('instruction_audio', recordings.instruction.blob, recordings.instruction.filename || 'instruction.webm')
    if (recordings.instruction.durationMs) {
      form.append('instruction_audio_duration_ms', String(Math.round(recordings.instruction.durationMs)))
    }
  }
  if (recordings.recitationDemo?.blob) {
    form.append('recitation_demo_audio', recordings.recitationDemo.blob, recordings.recitationDemo.filename || 'recitation-demo.webm')
    if (recordings.recitationDemo.durationMs) {
      form.append('recitation_demo_audio_duration_ms', String(Math.round(recordings.recitationDemo.durationMs)))
    }
  }
  if (recordings.clearInstruction) form.append('clear_instruction_audio', '1')
  if (recordings.clearRecitationDemo) form.append('clear_recitation_demo_audio', '1')

  return form
}

export const learningApi = {
  // Dashboard -------------------------------------------------------------
  async getDashboard(days = 30, options = {}) {
    const safeDays = days === 7 ? 7 : 30
    const { signal, fresh = false } = options
    const { data } = await withRetry(() =>
      http.get('/dashboard', {
        params: { days: safeDays, ...(fresh ? { fresh: 1 } : {}) },
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
  async getProgressSnapshot(window = 'month') {
    const safeWindow = window === 'week' ? 'week' : 'month'
    const { data } = await withRetry(() =>
      http.get('/dashboard/progress', {
        params: { window: safeWindow },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    return data && typeof data === 'object' ? data : null
  },
  async getActivityLog(limit = 100, options = {}) {
    const { paged = false, ...params } = options && typeof options === 'object' ? options : {}
    const query = { limit }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query[key] = value
    })
    const { data } = await withRetry(() =>
      http.get('/dashboard/activity', {
        params: query,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    const items = Array.isArray(data?.activity) ? data.activity : []
    if (!paged) return items
    const nextOffset = Number(data?.next_offset)
    return {
      items,
      has_more: data?.has_more === true,
      next_offset: Number.isFinite(nextOffset) ? nextOffset : null,
    }
  },

  async getAchievements() {
    const { data } = await withRetry(() =>
      http.get('/achievements', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    return data && typeof data === 'object' ? data : { items: [] }
  },

  async acknowledgeAchievements(achievementIds = []) {
    const ids = Array.isArray(achievementIds) ? achievementIds.filter(Boolean) : []
    if (!ids.length) return { items: [] }
    const { data } = await http.post('/achievements/acknowledge', {
      achievement_ids: ids,
    })
    return data && typeof data === 'object' ? data : { items: [] }
  },

  async updateAchievementSettings(payload = {}) {
    const { data } = await http.patch('/achievements/settings', payload)
    return data?.settings && typeof data.settings === 'object' ? data.settings : data
  },

  async getRevisionReminders() {
    const { data } = await withRetry(() =>
      http.get('/revision-reminders', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    )
    return data?.payload && typeof data.payload === 'object' ? data.payload : data
  },

  async snoozeRevisionReminder(id, hours = null) {
    const body = hours != null ? { hours } : {}
    const { data } = await http.post(`/revision-reminders/${id}/snooze`, body)
    return data?.payload && typeof data.payload === 'object' ? data.payload : data
  },

  async dismissRevisionReminder(id) {
    const { data } = await http.post(`/revision-reminders/${id}/dismiss`)
    return data?.payload && typeof data.payload === 'object' ? data.payload : data
  },

  async updateRevisionReminderPreferences(payload = {}) {
    const { data } = await http.patch('/revision-reminders/preferences', payload)
    return data?.preferences && typeof data.preferences === 'object' ? data.preferences : data
  },

  async completeOnboarding() {
    const { data } = await http.patch('/profile/onboarding')
    return data && typeof data === 'object' ? data : {}
  },

  // Session ---------------------------------------------------------------
  async getSession(params = {}) {
    const query = {}
    const id = Number(params?.id || params?.session_id || 0)
    if (id > 0) query.id = id
    const { data } = await http.get('/session', { params: query })
    return {
      session: data?.session ?? null,
      unfinished: !!data?.unfinished,
      found: data?.found !== false && !!data?.session,
    }
  },
  async getCurrentSession(params = {}) {
    const query = {}
    const id = Number(params?.id || params?.session_id || 0)
    if (id > 0) query.id = id
    const { data } = await http.get('/session/current', { params: query })
    return {
      session: data?.session ?? null,
      unfinished: !!data?.unfinished,
      invalidRequested: !!data?.invalid_requested,
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
  async getDashboardAiReciteStats() {
    const { data } = await http.get('/ai-recite-attempts/stats')
    return data?.stats && typeof data.stats === 'object' ? data.stats : null
  },
  async markAiReciteAttemptPeek(attemptId) {
    const id = Number(attemptId || 0)
    if (id <= 0) throw new Error('attempt_id required')
    const { data } = await http.patch(`/ai-recite-attempts/${id}/peek`)
    return data?.attempt || data
  },
  async getSessionAnalysis(sessionId) {
    const id = Number(sessionId || 0)
    if (id <= 0) throw new Error('session_id required')
    const { data } = await http.get(`/sessions/${id}/analysis`)
    return data
  },
  async getAiReciteAttemptAnalysis(attemptId) {
    const id = Number(attemptId || 0)
    if (id <= 0) throw new Error('attempt_id required')
    const { data } = await http.get(`/ai-recite-attempts/${id}`)
    return data
  },
  async uploadAiReciteAttemptAudio(attemptId, blob, durationMs = null) {
    const id = Number(attemptId || 0)
    if (id <= 0 || !blob) return null
    const type = String(blob.type || 'audio/webm')
    const extension = type.includes('mp4') || type.includes('m4a')
      ? 'm4a'
      : (type.includes('ogg') ? 'ogg' : (type.includes('wav') ? 'wav' : (type.includes('mpeg') || type.includes('mp3') ? 'mp3' : 'webm')))
    const form = new FormData()
    form.append('audio', blob, `recitation.${extension}`)
    const elapsed = Number(durationMs)
    if (Number.isFinite(elapsed) && elapsed > 0) {
      form.append('duration_ms', String(Math.round(elapsed)))
    }
    const { data } = await http.post(`/ai-recite-attempts/${id}/audio`, form)
    return data?.audio && typeof data.audio === 'object' ? data.audio : null
  },
  async saveSession(payload) {
    const { data } = await http.post('/session', payload)
    return data
  },
  /**
   * Mid-session progress checkpoint (action=save). Never completes a session.
   * Server rejects stale client_revision and will not create a new row.
   */
  async checkpointSession(payload = {}) {
    const body = { ...(payload || {}), action: 'save' }
    const { data } = await http.post('/session', body, HTTP_VALIDATE_WITH_CONFLICT)
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
  async getProgress(params = {}) {
    const { data } = await http.get('/progress', { params })
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

  // Structured custom hifz plan (Premium+) --------------------------------
  async getHifzPlan() {
    const { data } = await http.get('/hifz-plan')
    return data?.plan ?? null
  },
  async saveHifzPlan(plan) {
    const { data } = await http.put('/hifz-plan', {
      plan,
      client_id: plan?.id ? String(plan.id).slice(0, 80) : null,
    })
    return data?.plan ?? plan
  },
  async deleteHifzPlan() {
    const { data } = await http.delete('/hifz-plan')
    return data
  },

  // Analytics -------------------------------------------------------------
  async getAnalytics(params = {}) {
    const { data } = await http.get('/analytics', { params })
    return data?.analytics ?? []
  },
  async getAdvancedAnalytics(params = {}) {
    const { data } = await withRetry(() =>
      http.get('/analytics/advanced', {
        params,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
    )
    return data?.report && typeof data.report === 'object' ? data.report : null
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
    const { data } = await http.post('/state', payload, HTTP_VALIDATE_WITH_CONFLICT)
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

  async getLearnerAssignment(id) {
    const { data } = await http.get(`/me/assignments/${id}`)
    return data.assignment
  },

  async getLearnerAssignments(params = {}) {
    const { data } = await http.get('/me/assignments', { params })
    return data
  },

  async getLearnerSupport() {
    const { data } = await http.get('/me/support', { headers: { 'Cache-Control': 'no-cache' } })
    return data
  },
  async requestLearnerGroup(groupId) {
    const { data } = await http.post(`/me/groups/${groupId}/request`)
    return data
  },
  async grantLearnerConsent(membershipId) {
    const { data } = await http.post(`/me/memberships/${membershipId}/consent`)
    return data
  },
  async getLearnerCircle() {
    const { data } = await http.get('/me/circle', { headers: { 'Cache-Control': 'no-cache' } })
    return data
  },
  async previewLearnerClassInvite(code) {
    const { data } = await http.post('/me/class-invites/preview', { code })
    return data
  },
  async redeemLearnerClassInvite(code) {
    const { data } = await http.post('/me/class-invites/redeem', { code })
    return data
  },
  async rejectLearnerMembership(membershipId) {
    const { data } = await http.post(`/me/memberships/${membershipId}/reject`)
    return data
  },
  async approveLearnerGuardian(linkId) {
    const { data } = await http.post(`/me/guardians/${linkId}/approve`)
    return data
  },
  async rejectLearnerGuardian(linkId) {
    const { data } = await http.post(`/me/guardians/${linkId}/reject`)
    return data
  },
  async getOrganisationMemberships() {
    const { data } = await http.get('/organisations/memberships')
    return data
  },
  async joinOrganisation(payload) {
    const { data } = await http.post('/organisations/memberships', payload)
    return data
  },
  async switchOrganisation(organisationId) {
    const { data } = await http.post(`/organisations/${organisationId}/switch`)
    return data
  },
  async getPendingOrganisationMemberships() {
    const { data } = await http.get('/organisations/memberships/pending')
    return data
  },
  async reviewOrganisationMembership(membershipId, action) {
    const { data } = await http.post(`/organisations/memberships/${membershipId}/${action}`)
    return data
  },
  async getInstitutionDashboard() {
    const { data } = await http.get('/organisations/active/institution')
    return data
  },
  async updateInstitutionProfile(payload) {
    const { data } = await http.patch('/organisations/active/institution', payload)
    return data
  },
  async inviteInstitutionTeacher(email) {
    const { data } = await http.post('/organisations/active/teacher-invitations', { email })
    return data
  },
  async revokeInstitutionStaff(membershipId) {
    const { data } = await http.post(`/organisations/active/staff/${membershipId}/revoke`)
    return data
  },
  async setInstitutionStaffAdmin(membershipId, admin) {
    const { data } = await http.post(`/organisations/active/staff/${membershipId}/admin`, { admin })
    return data
  },
  async acceptInstitutionTeacherInvite(token) {
    const { data } = await http.post('/organisations/teacher-invitations/accept', { token })
    return data
  },
  async createTeacherClassInvite(groupId, email = '') {
    const { data } = await http.post(`/teacher/groups/${groupId}/invitations`, { email: email || null })
    return data
  },
  async transferTeacherMembership(membershipId, learningGroupId) {
    const { data } = await http.post(`/teacher/memberships/${membershipId}/transfer`, {
      learning_group_id: learningGroupId,
    })
    return data
  },
  async startLearnerAssignment(recipientId) {
    const { data } = await http.post(`/me/assignments/${recipientId}/start`)
    return data
  },
  async completeLearnerAssignment(recipientId, reflection = null) {
    const { data } = await http.post(`/me/assignments/${recipientId}/complete`, reflection ? { self_assessment: reflection } : {})
    return data
  },
  async sendLearnerAssignmentMessage(recipientId, body, recording = null, clientMessageId = null) {
    const form = new FormData()
    const text = String(body || '').trim()
    if (text) form.append('body', text)
    form.append('client_message_id', clientMessageId || createClientMessageId())
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.post(`/me/assignments/${recipientId}/notes`, form)
    return data
  },
  async getLearnerAssignmentMessages(recipientId) {
    const { data } = await http.get(`/me/assignments/${recipientId}/messages`, { headers: { 'Cache-Control': 'no-cache' } })
    return {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      threadUnreadCount: Number(data?.thread_unread_count ?? 0),
    }
  },
  async sendLearnerTeacherMessage(teacherId, body) {
    const { data } = await http.post(`/me/teachers/${teacherId}/messages`, { body, client_message_id: createClientMessageId() })
    return data
  },
  async getLearnerTeacherMessages(teacherId, params = {}) {
    const { data } = await http.get(`/me/teachers/${teacherId}/messages`, { headers: { 'Cache-Control': 'no-cache' } })
    return data
  },
  async getTeacherOverview(days = 30) {
    const { data } = await http.get('/teacher/overview', { params: { days } })
    return data
  },
  async getTeacherStudents(params = {}) {
    const { data } = await http.get('/teacher/students', { params })
    return data
  },
  async getTeacherAttendance(params = {}) {
    const { data } = await http.get('/teacher/attendance', { params })
    return data
  },
  async scheduleTeacherLesson(groupId, date, title = '') {
    const { data } = await http.post(`/teacher/attendance/groups/${groupId}/lessons`, { date, title: title || null })
    return data
  },
  async setTeacherAttendance(groupId, studentId, date, status, notes = undefined) {
    const payload = { date, status }
    if (notes !== undefined) payload.notes = notes
    const { data } = await http.put(`/teacher/attendance/groups/${groupId}/students/${studentId}`, payload)
    return data
  },
  async bulkTeacherAttendance(groupId, date, status, studentIds) {
    const { data } = await http.post(`/teacher/attendance/groups/${groupId}/bulk`, {
      date,
      status,
      student_ids: studentIds,
    })
    return data
  },
  async getTeacherStudent(studentId, section = 'overview') {
    const { data } = await http.get(`/teacher/students/${studentId}`, { params: { section } })
    return data
  },
  async getTeacherGuardians(studentId) {
    const { data } = await http.get(`/teacher/students/${studentId}/guardians`)
    return data
  },
  async inviteTeacherGuardian(studentId, email, relationship = '') {
    const { data } = await http.post(`/teacher/students/${studentId}/guardians/invitations`, {
      email,
      relationship: relationship || null,
    })
    return data
  },
  async resendTeacherGuardianInvitation(invitationId) {
    const { data } = await http.post(`/teacher/guardian-invitations/${invitationId}/resend`)
    return data
  },
  async revokeTeacherGuardianInvitation(invitationId) {
    const { data } = await http.post(`/teacher/guardian-invitations/${invitationId}/revoke`)
    return data
  },
  async revokeTeacherGuardianLink(studentId, linkId) {
    const { data } = await http.post(`/teacher/students/${studentId}/guardians/links/${linkId}/revoke`)
    return data
  },
  async getTeacherStudentReport(studentId, params = {}) {
    const { data } = await http.get(`/teacher/students/${studentId}/report`, { params })
    return data
  },
  async getTeacherStudentProgressReports(studentId) {
    const { data } = await http.get(`/teacher/students/${studentId}/progress-reports`)
    return data
  },
  async getTeacherStudentProgressReport(reportId) {
    const { data } = await http.get(`/teacher/progress-reports/${reportId}`)
    return data
  },
  async createTeacherStudentProgressReport(studentId, body = {}) {
    const { data } = await http.post(`/teacher/students/${studentId}/progress-reports`, body)
    return data
  },
  async updateTeacherStudentProgressReport(reportId, body = {}) {
    const { data } = await http.patch(`/teacher/progress-reports/${reportId}`, body)
    return data
  },
  async refreshTeacherStudentProgressReport(reportId) {
    const { data } = await http.post(`/teacher/progress-reports/${reportId}/refresh`)
    return data
  },
  async approveTeacherStudentProgressReport(reportId, body = {}) {
    const { data } = await http.post(`/teacher/progress-reports/${reportId}/approve`, body)
    return data
  },
  async downloadTeacherStudentProgressReport(reportId) {
    return http.get(`/teacher/progress-reports/${reportId}/download`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    })
  },
  async sendTeacherStudentMessage(studentId, body, recording = null, clientMessageId = null) {
    const form = new FormData()
    if (String(body || '').trim()) form.append('body', String(body).trim())
    form.append('client_message_id', clientMessageId || createClientMessageId())
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.post(`/teacher/students/${studentId}/messages`, form)
    return data
  },
  async getTeacherStudentMessages(studentId) {
    const { data } = await http.get(`/teacher/students/${studentId}/messages`, { headers: { 'Cache-Control': 'no-cache' } })
    return data
  },
  async deleteTeacherStudentMessage(studentId, messageId) {
    const { data } = await http.delete(`/teacher/students/${studentId}/messages/${messageId}`)
    return data
  },
  async getTeacherGuardianThreads(studentId) {
    const { data } = await http.get(`/teacher/students/${studentId}/guardian-messages`, { headers: { 'Cache-Control': 'no-cache' } })
    return data
  },
  async getTeacherGuardianThread(studentId, parentId, before = null) {
    const { data } = await http.get(`/teacher/students/${studentId}/guardian-messages`, {
      params: { parent: parentId, ...(before ? { before } : {}) },
      headers: { 'Cache-Control': 'no-cache' },
    })
    return data
  },
  async sendTeacherGuardianMessage(studentId, parentId, body) {
    const { data } = await http.post(`/teacher/students/${studentId}/guardian-messages`, {
      parent_id: parentId,
      body,
    })
    return data
  },
  async getParentReports({ cadence = 'week', childId = null } = {}) {
    const { data } = await http.get('/parent/reports', {
      params: { cadence, child_id: childId || undefined },
      headers: { 'Cache-Control': 'no-cache' },
    })
    return data
  },
  async getParentProgressReports(childId) {
    const { data } = await http.get('/parent/progress-reports', {
      params: { child_id: childId },
      headers: { 'Cache-Control': 'no-cache' },
    })
    return data
  },
  async getParentProgressReport(reportId) {
    const { data } = await http.get(`/parent/progress-reports/${reportId}`, {
      headers: { 'Cache-Control': 'no-cache' },
    })
    return data
  },
  async askParentAssistant({ prompt = null, question = null, childId = null } = {}) {
    const { data } = await http.post('/parent/assistant', {
      prompt,
      question,
      child_id: childId || null,
    })
    return data
  },
  async getParentMessages() {
    const { data } = await http.get('/parent/messages', { headers: { 'Cache-Control': 'no-cache' } })
    return data
  },
  async getParentMessageThread(teacherId, studentId, before = null) {
    const { data } = await http.get(`/parent/messages/${teacherId}/${studentId}`, {
      params: before ? { before } : {},
      headers: { 'Cache-Control': 'no-cache' },
    })
    return data
  },
  async sendParentMessage(teacherId, studentId, body) {
    const { data } = await http.post(`/parent/messages/${teacherId}/${studentId}`, { body })
    return data
  },
  async reportParentMessage(messageId, reason) {
    const { data } = await http.post(`/parent/messages/${messageId}/report`, { reason })
    return data
  },
  async getParentNoticePreferences() {
    const { data } = await http.get('/parent/notification-preferences')
    return data
  },
  async updateParentNoticePreferences(preferences) {
    const { data } = await http.put('/parent/notification-preferences', preferences)
    return data
  },
  async getParentNotifications(params = {}) {
    const { data } = await http.get('/parent/notifications', { params })
    return data
  },
  async markParentNotificationRead(notificationId) {
    const { data } = await http.post(`/parent/notifications/${notificationId}/read`)
    return data
  },
  async markAllParentNotificationsRead() {
    const { data } = await http.post('/parent/notifications/read-all')
    return data
  },
  async getStudentNotifications(params = {}) {
    const { data } = await http.get('/me/notifications', { params })
    return data
  },
  async markStudentNotificationRead(notificationId) {
    const { data } = await http.post(`/me/notifications/${notificationId}/read`)
    return data
  },
  async markAllStudentNotificationsRead() {
    const { data } = await http.post('/me/notifications/read-all')
    return data
  },
  async saveTeacherRecitationAssessment(studentId, attemptId, payload, annotation) {
    const body = payload && typeof payload === 'object'
      ? payload
      : { tajweed_score: payload, annotation }
    const { data } = await http.put(`/teacher/students/${studentId}/attempts/${attemptId}/assessment`, body)
    return data
  },
  async deleteTeacherStudent(studentId, confirmation) {
    const { data } = await http.delete(`/teacher/students/${studentId}`, { data: { confirmation } })
    return data
  },
  async completeTeacherReview(studentId, planId) {
    const { data } = await http.post(`/teacher/students/${studentId}/reviews/${planId}/complete`)
    return data
  },
  async getTeacherPrivateNotes(studentId, params = {}) {
    const { data } = await http.get(`/teacher/students/${studentId}/private-notes`, {
      params,
      headers: { 'Cache-Control': 'no-cache' },
    })
    return data
  },
  async createTeacherPrivateNote(studentId, payload = {}) {
    const { data } = await http.post(`/teacher/students/${studentId}/private-notes`, payload)
    return data
  },
  async updateTeacherPrivateNote(studentId, noteId, payload = {}) {
    const { data } = await http.patch(`/teacher/students/${studentId}/private-notes/${noteId}`, payload)
    return data
  },
  async deleteTeacherPrivateNote(studentId, noteId) {
    const { data } = await http.delete(`/teacher/students/${studentId}/private-notes/${noteId}`)
    return data
  },
  async archiveTeacherPrivateNote(studentId, noteId) {
    const { data } = await http.post(`/teacher/students/${studentId}/private-notes/${noteId}/archive`)
    return data
  },
  async unarchiveTeacherPrivateNote(studentId, noteId) {
    const { data } = await http.post(`/teacher/students/${studentId}/private-notes/${noteId}/unarchive`)
    return data
  },
  async shareTeacherPrivateNote(studentId, noteId, payload = {}) {
    const { data } = await http.post(`/teacher/students/${studentId}/private-notes/${noteId}/share`, payload)
    return data
  },
  async getTeacherRecitationPlayback(studentId, attemptId) {
    const { data } = await http.get(`/teacher/students/${studentId}/attempts/${attemptId}/playback`)
    return data
  },
  async markTeacherRecitationReviewed(studentId, attemptId) {
    const { data } = await http.post(`/teacher/students/${studentId}/attempts/${attemptId}/playback/review`)
    return data
  },
  async saveTeacherRecitationFeedback(studentId, attemptId, payload = {}, recording = null) {
    const form = new FormData()
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      form.append(key, String(value))
    })
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.post(`/teacher/students/${studentId}/attempts/${attemptId}/playback/feedback`, form)
    return data
  },
  async saveTeacherRecitationPrivateNote(studentId, attemptId, body) {
    const { data } = await http.post(`/teacher/students/${studentId}/attempts/${attemptId}/playback/private-note`, { body })
    return data
  },
  async assignTeacherRecitationRevision(studentId, attemptId, payload) {
    const { data } = await http.post(`/teacher/students/${studentId}/attempts/${attemptId}/playback/revision`, payload)
    return data
  },
  async saveTeacherWordCoaching(studentId, attemptId, payload = {}, recording = null) {
    const form = new FormData()
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      form.append(key, String(value))
    })
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.post(`/teacher/students/${studentId}/attempts/${attemptId}/playback/words`, form)
    return data
  },
  async deleteTeacherWordCoachingAudio(studentId, attemptId, correctionId) {
    const { data } = await http.delete(`/teacher/students/${studentId}/attempts/${attemptId}/playback/corrections/${correctionId}/audio`)
    return data
  },
  async deleteTeacherWordCoaching(studentId, attemptId, correctionId) {
    const { data } = await http.delete(`/teacher/students/${studentId}/attempts/${attemptId}/playback/corrections/${correctionId}`)
    return data
  },
  async listTeacherMushafAnnotations(studentId, params = {}) {
    const { data } = await http.get(`/teacher/students/${studentId}/mushaf-annotations`, { params })
    return data
  },
  async saveTeacherMushafAnnotation(studentId, payload = {}, recording = null) {
    const form = new FormData()
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      form.append(key, String(value))
    })
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.post(`/teacher/students/${studentId}/mushaf-annotations`, form)
    return data
  },
  async deleteTeacherMushafAnnotation(studentId, annotationId) {
    const { data } = await http.delete(`/teacher/students/${studentId}/mushaf-annotations/${annotationId}`)
    return data
  },
  async saveTeacherFeedbackSegment(studentId, attemptId, payload = {}, recording = null) {
    const form = new FormData()
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      form.append(key, String(value))
    })
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.post(`/teacher/students/${studentId}/attempts/${attemptId}/playback/segments`, form)
    return data
  },
  async updateTeacherFeedbackSegment(studentId, attemptId, segmentId, payload = {}, recording = null) {
    const form = new FormData()
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      form.append(key, String(value))
    })
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.patch(`/teacher/students/${studentId}/attempts/${attemptId}/playback/segments/${segmentId}`, form)
    return data
  },
  async deleteTeacherFeedbackSegment(studentId, attemptId, segmentId) {
    const { data } = await http.delete(`/teacher/students/${studentId}/attempts/${attemptId}/playback/segments/${segmentId}`)
    return data
  },
  async deleteTeacherFeedbackSegmentAudio(studentId, attemptId, segmentId) {
    const { data } = await http.delete(`/teacher/students/${studentId}/attempts/${attemptId}/playback/segments/${segmentId}/audio`)
    return data
  },
  async saveTeacherNote(studentId, payload = {}, recording = null) {
    const hasRecording = Boolean(recording?.blob)
    if (hasRecording || payload instanceof FormData) {
      const form = payload instanceof FormData ? payload : new FormData()
      if (!(payload instanceof FormData)) {
        Object.entries(payload || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return
          form.append(key, String(value))
        })
      }
      if (!form.has('kind')) form.append('kind', 'feedback')
      if (recording?.blob) {
        form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
        if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
      }
      const { data } = await http.post(`/teacher/students/${studentId}/notes`, form)
      return data
    }
    const { data } = await http.post(`/teacher/students/${studentId}/notes`, payload)
    return data
  },
  async deleteTeacherNote(noteId) {
    const { data } = await http.delete(`/teacher/notes/${noteId}`)
    return data
  },
  async getTeacherGroups() {
    const { data } = await http.get('/teacher/groups')
    return data
  },
  async createTeacherGroup(name) {
    const { data } = await http.post('/teacher/groups', { name })
    return data
  },
  async getTeacherGroup(groupId) {
    const { data } = await http.get(`/teacher/groups/${groupId}`)
    return data
  },
  async joinTeacherGroup(groupId) {
    const { data } = await http.post(`/teacher/groups/${groupId}/join`)
    return data
  },
  async reviewTeacherMembership(membershipId, action) {
    const { data } = await http.post(`/teacher/memberships/${membershipId}/${action}`)
    return data
  },
  async getTeacherAssignments() {
    const { data } = await http.get('/teacher/assignments')
    return data
  },
  async createTeacherAssignment(payload, recordings = {}) {
    const body = buildTeacherAssignmentRequestBody(payload, recordings)
    const { data } = await http.post('/teacher/assignments', body)
    return data
  },
  async updateTeacherAssignment(id, payload, recordings = {}) {
    const body = buildTeacherAssignmentRequestBody(payload, recordings)
    const { data } = await http.put(`/teacher/assignments/${id}`, body)
    return data
  },
  async deleteTeacherAssignment(id) {
    const { data } = await http.delete(`/teacher/assignments/${id}`)
    return data
  },
  async sendTeacherAssignmentMessage(recipientId, body, recording = null, clientMessageId = null) {
    const form = new FormData()
    if (String(body || '').trim()) form.append('body', String(body).trim())
    form.append('client_message_id', clientMessageId || createClientMessageId())
    if (recording?.blob) {
      form.append('audio', recording.blob, recording.filename || 'voice-note.webm')
      if (recording.durationMs) form.append('duration_ms', String(Math.round(recording.durationMs)))
    }
    const { data } = await http.post(`/teacher/assignment-recipients/${recipientId}/notes`, form)
    return data
  },
  async approveTeacherAssignmentRecipient(recipientId) {
    const { data } = await http.post(`/teacher/assignment-recipients/${recipientId}/approve`)
    return data
  },
  async requestTeacherAssignmentCorrection(recipientId, note = '') {
    const { data } = await http.post(`/teacher/assignment-recipients/${recipientId}/correction`, { note })
    return data
  },
  async cancelTeacherAssignmentRecipient(recipientId, note = '') {
    const { data } = await http.post(`/teacher/assignment-recipients/${recipientId}/cancel`, { note: note || undefined })
    return data
  },
  async reassignTeacherAssignmentRecipient(recipientId, payload = {}) {
    const { data } = await http.post(`/teacher/assignment-recipients/${recipientId}/reassign`, payload)
    return data
  },
  async duplicateTeacherAssignment(assignmentId, payload = {}) {
    const { data } = await http.post(`/teacher/assignments/${assignmentId}/duplicate`, payload)
    return data
  },
  async getParentChildAttendance(studentId, params = {}) {
    const { data } = await http.get(`/parent/children/${studentId}/attendance`, { params })
    return data
  },
  async acknowledgeParentHomeworkSupervision(studentId, recipientId) {
    const { data } = await http.post(`/parent/children/${studentId}/assignments/${recipientId}/supervision`)
    return data
  },
  async getTeacherLearningPlans(studentId = null) {
    const { data } = await http.get('/teacher/learning-plans', {
      params: studentId ? { student_id: studentId } : {},
    })
    return data
  },
  async createTeacherLearningPlan(payload, itemVoices = []) {
    const body = buildTeacherLearningPlanRequestBody(payload, itemVoices)
    const { data } = await http.post('/teacher/learning-plans', body)
    return data
  },
  async updateTeacherLearningPlan(planId, payload, itemVoices = []) {
    const body = buildTeacherLearningPlanRequestBody(payload, itemVoices)
    const { data } = await http.put(`/teacher/learning-plans/${planId}`, body)
    return data
  },
  async setTeacherLearningPlanStatus(planId, status) {
    const { data } = await http.post(`/teacher/learning-plans/${planId}/status`, { status })
    return data
  },
  async approveTeacherLearningPlanItem(itemId) {
    const { data } = await http.post(`/teacher/learning-plan-items/${itemId}/approve`)
    return data
  },
  async skipTeacherLearningPlanItem(itemId) {
    const { data } = await http.post(`/teacher/learning-plan-items/${itemId}/skip`)
    return data
  },
  async getTeacherLearningPlanSuggestions(studentId) {
    const { data } = await http.get(`/teacher/students/${studentId}/learning-plan-suggestions`)
    return data
  },
  async getTeacherLearningPlanTemplates() {
    const { data } = await http.get('/teacher/learning-plan-templates')
    return data
  },
  async createTeacherLearningPlanTemplate(payload) {
    const { data } = await http.post('/teacher/learning-plan-templates', payload)
    return data
  },
  async applyTeacherLearningPlanTemplate(templateId, payload) {
    const { data } = await http.post(`/teacher/learning-plan-templates/${templateId}/apply`, payload)
    return data
  },
  async rescheduleTeacherLearningPlanItem(itemId, dueOn) {
    const { data } = await http.post(`/teacher/learning-plan-items/${itemId}/reschedule`, { due_on: dueOn })
    return data
  },
  async syncTeacherRevisionRecommendations(studentId) {
    const { data } = await http.post(`/teacher/students/${studentId}/revision-recommendations`)
    return data
  },
  async updateTeacherRevisionRecommendation(id, payload) {
    const { data } = await http.patch(`/teacher/revision-recommendations/${id}`, payload)
    return data
  },
  async acceptTeacherRevisionRecommendation(id) {
    const { data } = await http.post(`/teacher/revision-recommendations/${id}/accept`)
    return data
  },
  async dismissTeacherRevisionRecommendation(id) {
    const { data } = await http.post(`/teacher/revision-recommendations/${id}/dismiss`)
    return data
  },
  async assignTeacherRevisionRecommendation(id) {
    const { data } = await http.post(`/teacher/revision-recommendations/${id}/assign`)
    return data
  },
  async saveLearnerSelfAssessment(payload) {
    const { data } = await http.post('/me/self-assessments', payload)
    return data
  },
  async getTeacherRecitationDifficultyQueue(limit = 12) {
    const { data } = await http.get('/teacher/recitation-difficulties', { params: { limit } })
    return data
  },
  async getTeacherStudentRecitationDifficulties(studentId, params = {}) {
    const { data } = await http.get(`/teacher/students/${studentId}/recitation-difficulties`, { params })
    return data
  },
  async getTeacherStudentRecitationDifficulty(studentId, spotId) {
    const { data } = await http.get(`/teacher/students/${studentId}/recitation-difficulties/${spotId}`)
    return data
  },
  async reviewTeacherStudentRecitationDifficulty(studentId, spotId, payload) {
    const { data } = await http.post(`/teacher/students/${studentId}/recitation-difficulties/${spotId}/review`, payload)
    return data
  },
  async getTeacherStudentImportFormats() {
    const { data } = await http.get('/teacher/imports/formats')
    return data
  },
  async createTeacherStudentImport(groupId, { files = [], pastedText = '' } = {}) {
    const form = new FormData()
    files.forEach((file) => form.append('files[]', file))
    if (String(pastedText || '').trim()) form.append('pasted_text', String(pastedText).trim())
    const { data } = await http.post(`/teacher/groups/${groupId}/imports`, form, {
      timeout: 120000,
    })
    return data
  },
  async processTeacherStudentImport(batchId) {
    const { data } = await http.post(`/teacher/imports/${batchId}/process`)
    return data
  },
  async getTeacherStudentImport(batchId) {
    const { data } = await http.get(`/teacher/imports/${batchId}`, { headers: { 'Cache-Control': 'no-cache' } })
    return data
  },
  async updateTeacherStudentImportRow(batchId, rowId, payload) {
    const { data } = await http.patch(`/teacher/imports/${batchId}/rows/${rowId}`, payload)
    return data
  },
  async skipTeacherStudentImportRow(batchId, rowId) {
    const { data } = await http.post(`/teacher/imports/${batchId}/rows/${rowId}/skip`)
    return data
  },
  async commitTeacherStudentImport(batchId, options = {}) {
    const runAsync = Boolean(options && options.runAsync)
    const { data } = await http.post(`/teacher/imports/${batchId}/commit`, { async: runAsync })
    return data
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
  if (settings.repetitions_per_ayah && typeof settings.repetitions_per_ayah === 'object') {
    const perAyah = {}
    Object.entries(settings.repetitions_per_ayah).forEach(([ayah, count]) => {
      const ayahNum = Number(ayah)
      const reps = Number(count)
      if (!Number.isFinite(ayahNum) || ayahNum < 1 || ayahNum > 300) return
      if (!Number.isFinite(reps) || reps <= 0) return
      perAyah[Math.round(ayahNum)] = Math.max(1, Math.min(8, Math.round(reps)))
    })
    if (Object.keys(perAyah).length) clean.repetitions_per_ayah = perAyah
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
