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
  async saveSession(payload) {
    const { data } = await http.post('/session', payload)
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
}

export default learningApi
