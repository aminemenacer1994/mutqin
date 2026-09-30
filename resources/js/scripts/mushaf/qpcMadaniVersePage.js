import {
  clampMushafPage,
  DEFAULT_MUSHAF_LAYOUT_ID,
  getMushafLayout,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
} from './mushafLayouts.js'

const MADANI_VERSE_PAGES_STATIC = '/quran/madani-v2/verse-pages.json'

/** @type {Map<string, Promise<Record<string, number>>>} */
const versePageIndexPromises = new Map()

/**
 * @param {string} [layoutId]
 * @returns {string}
 */
function versePageIndexUrl(layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(layoutId)
  if (layout.id === MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH) {
    return '/indopak/verse-pages'
  }
  return MADANI_VERSE_PAGES_STATIC
}

/**
 * @param {string} [layoutId]
 * @returns {string | null}
 */
function versePageIndexFallbackUrl(layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(layoutId)
  if (layout.id === MUSHAF_LAYOUT_MADANI_V2) {
    return '/madani/verse-pages'
  }
  return null
}

/**
 * Load ayah → page index for a mushaf layout.
 * Madani and IndoPak maps are independent; never reuse numeric pages across layouts.
 *
 * @param {string} [layoutId]
 * @returns {Promise<Record<string, number>>}
 */
export async function loadMushafVersePageIndex(layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(layoutId)
  const cached = versePageIndexPromises.get(layout.id)
  if (cached) {
    return cached
  }

  const primaryUrl = versePageIndexUrl(layout.id)
  const fallbackUrl = versePageIndexFallbackUrl(layout.id)

  const promise = fetch(primaryUrl, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
    .then(async (response) => {
      if (response.ok) {
        return response.json()
      }
      if (!fallbackUrl) {
        throw new Error(`Mushaf verse-page index failed (${response.status}) for ${layout.id}`)
      }
      const fallback = await fetch(fallbackUrl, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      if (!fallback.ok) {
        throw new Error(`Mushaf verse-page index failed (${fallback.status}) for ${layout.id}`)
      }
      return fallback.json()
    })
    .then((payload) => (payload && typeof payload === 'object' ? payload : {}))

  versePageIndexPromises.set(layout.id, promise)
  return promise
}

/** @deprecated Prefer loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2) */
export async function loadQpcMadaniVersePageIndex() {
  return loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2)
}

export function verseKeyFromCoordinates(surah, ayah) {
  const chapter = Number(surah)
  const verse = Number(ayah)
  if (!Number.isFinite(chapter) || !Number.isFinite(verse) || chapter < 1 || verse < 1) {
    return ''
  }
  return `${Math.trunc(chapter)}:${Math.trunc(verse)}`
}

/**
 * Resolve a printed page for a verse key using the active layout's map.
 *
 * @param {string} verseKey
 * @param {Record<string, number>} [index]
 * @param {string} [layoutId]
 * @returns {number | null}
 */
export function resolveMushafPageForVerseKey(
  verseKey,
  index = {},
  layoutId = DEFAULT_MUSHAF_LAYOUT_ID,
) {
  const raw = String(verseKey || '').trim()
  if (!raw || !index || typeof index !== 'object') {
    return null
  }
  const key = raw.split(':').slice(0, 2).join(':')
  const page = Number(index[key])
  if (!Number.isFinite(page) || page < 1) {
    return null
  }
  return clampMushafPage(page, layoutId)
}

/**
 * @param {string} verseKey
 * @param {Record<string, number>} [index]
 * @param {string} [layoutId]
 * @returns {number | null}
 */
export function resolveQpcMadaniPageForVerseKey(
  verseKey,
  index = {},
  layoutId = MUSHAF_LAYOUT_MADANI_V2,
) {
  return resolveMushafPageForVerseKey(verseKey, index, layoutId)
}

/**
 * Canonical ayah → printed page resolver for the given layout's verse-page index.
 */
export function resolveMadaniPage(surah, ayah, index = {}, layoutId = MUSHAF_LAYOUT_MADANI_V2) {
  return resolveMushafPageForVerseKey(verseKeyFromCoordinates(surah, ayah), index, layoutId)
}

export function verseKeyFromQpcLocation(location) {
  const parts = String(location || '').trim().split(':')
  if (parts.length < 2) {
    return ''
  }
  return `${parts[0]}:${parts[1]}`
}
