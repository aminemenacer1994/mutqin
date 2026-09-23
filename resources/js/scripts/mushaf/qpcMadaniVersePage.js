import { clampMadaniPage } from './madaniPagePair.js'

const VERSE_PAGES_STATIC = '/quran/madani-v2/verse-pages.json'

let versePageIndexPromise = null

export async function loadQpcMadaniVersePageIndex() {
  if (versePageIndexPromise) {
    return versePageIndexPromise
  }

  versePageIndexPromise = fetch(VERSE_PAGES_STATIC, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
    .then(async (response) => {
      if (response.ok) {
        return response.json()
      }
      const fallback = await fetch('/madani/verse-pages', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      if (!fallback.ok) {
        throw new Error(`QPC verse-page index failed (${fallback.status})`)
      }
      return fallback.json()
    })
    .then((payload) => (payload && typeof payload === 'object' ? payload : {}))

  return versePageIndexPromise
}

export function verseKeyFromCoordinates(surah, ayah) {
  const chapter = Number(surah)
  const verse = Number(ayah)
  if (!Number.isFinite(chapter) || !Number.isFinite(verse) || chapter < 1 || verse < 1) {
    return ''
  }
  return `${Math.trunc(chapter)}:${Math.trunc(verse)}`
}

export function resolveQpcMadaniPageForVerseKey(verseKey, index = {}) {
  const raw = String(verseKey || '').trim()
  if (!raw || !index || typeof index !== 'object') {
    return null
  }
  const key = raw.split(':').slice(0, 2).join(':')
  const page = Number(index[key])
  if (!Number.isFinite(page) || page < 1) {
    return null
  }
  return clampMadaniPage(page)
}

/**
 * Canonical ayah → KFGQPC V2 page resolver.
 * Uses the verified QUL/QPC verse-page index. Does not hardcode mappings.
 */
export function resolveMadaniPage(surah, ayah, index = {}) {
  return resolveQpcMadaniPageForVerseKey(verseKeyFromCoordinates(surah, ayah), index)
}

export function verseKeyFromQpcLocation(location) {
  const parts = String(location || '').trim().split(':')
  if (parts.length < 2) {
    return ''
  }
  return `${parts[0]}:${parts[1]}`
}
