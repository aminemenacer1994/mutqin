import axios from 'axios'

function readCsrfMeta() {
  if (typeof document === 'undefined') return ''
  return document.head?.querySelector('meta[name="csrf-token"]')?.content || ''
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

/**
 * Fresh CSRF headers for each request. Prefer the XSRF cookie after Sanctum refresh;
 * keep the Blade meta token as a fallback for first paint.
 */
export function buildCsrfHeaders(extra = {}) {
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...extra,
  }
  const meta = readCsrfMeta()
  const xsrf = readXsrfCookie()
  if (meta) headers['X-CSRF-TOKEN'] = meta
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
  return headers
}

let csrfCookiePromise = null

export async function ensureCsrfCookie({ force = false } = {}) {
  if (!force && readXsrfCookie()) return readXsrfCookie()
  if (!csrfCookiePromise) {
    csrfCookiePromise = axios
      .get('/sanctum/csrf-cookie', { withCredentials: true })
      .catch(() => null)
      .finally(() => {
        csrfCookiePromise = null
      })
  }
  await csrfCookiePromise
  return readXsrfCookie()
}

/**
 * Run a request factory that rebuilds auth headers on each attempt.
 * On Laravel 419, refresh Sanctum CSRF cookie once and retry with new headers.
 */
export async function withCsrfRetry(requestFactory) {
  try {
    return await requestFactory()
  } catch (firstError) {
    if (Number(firstError?.response?.status) !== 419) throw firstError
    await ensureCsrfCookie({ force: true })
    return requestFactory()
  }
}
