/**
 * Fetch authoritative KFGQPC V2 Madani Mushaf page payloads from Mutqin backend.
 */

import { captureHttpFailure, currentRequestId } from '../observability/errorTracking'

const pageCache = new Map()
const inflight = new Map()

export function madaniMushafPageUrl(pageNumber) {
  const page = Math.max(1, Math.min(604, Number(pageNumber) || 1))
  return `/memorisation/madani-mushaf/pages/${page}`
}

export function madaniMushafResolveUrl({ verseKey, surah, ayah } = {}) {
  const params = new URLSearchParams()
  if (verseKey) params.set('verse_key', String(verseKey))
  if (surah) params.set('surah', String(surah))
  if (ayah) params.set('ayah', String(ayah))
  const qs = params.toString()
  return `/memorisation/madani-mushaf/resolve${qs ? `?${qs}` : ''}`
}

export async function fetchMadaniMushafPage(pageNumber, { signal, force = false } = {}) {
  const page = Math.max(1, Math.min(604, Number(pageNumber) || 1))
  if (!force && pageCache.has(page)) return pageCache.get(page)
  if (!force && inflight.has(page)) return inflight.get(page)

  const startedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const headers = { 'X-Request-Id': currentRequestId() }
  const promise = fetch(madaniMushafPageUrl(page), { signal, credentials: 'same-origin', headers })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const err = new Error(body?.message || `Madani Mushaf page ${page} failed (${res.status})`)
        err.status = res.status
        err.code = body?.error || 'fetch_failed'
        err.url = madaniMushafPageUrl(page)
        throw err
      }
      return res.json()
    })
    .then((payload) => {
      pageCache.set(page, payload)
      inflight.delete(page)
      return payload
    })
    .catch((err) => {
      inflight.delete(page)
      captureHttpFailure(err, {
        feature: 'mushaf',
        url: madaniMushafPageUrl(page),
        method: 'GET',
        startedAt,
      })
      throw err
    })

  inflight.set(page, promise)
  return promise
}

export async function resolveMadaniMushafPage({ verseKey, surah, ayah } = {}, options = {}) {
  const res = await fetch(madaniMushafResolveUrl({ verseKey, surah, ayah }), {
    signal: options.signal,
    credentials: 'same-origin',
  })
  if (!res.ok) return null
  const body = await res.json()
  return Number(body?.pageNumber) || null
}

export async function prefetchMadaniMushafPages(pageNumbers = [], options = {}) {
  const unique = [...new Set(pageNumbers.map(n => Number(n)).filter(n => n >= 1 && n <= 604))]
  await Promise.all(unique.map(page => fetchMadaniMushafPage(page, options).catch(() => null)))
  return unique
}

export function clearMadaniMushafPageCache() {
  pageCache.clear()
  inflight.clear()
}

export function getCachedMadaniMushafPage(pageNumber) {
  return pageCache.get(Number(pageNumber)) || null
}
