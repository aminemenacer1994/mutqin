/**
 * User-selected memory-word highlights.
 * Keyed by ayah (verse key) and spoken-word index so marks survive
 * navigation and re-renders without touching Quranic text.
 */

export function normaliseWordHighlightMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const next = {}
  for (const [verseKey, indexes] of Object.entries(raw)) {
    const key = String(verseKey || '').trim()
    if (!key || !key.includes(':')) continue
    const list = [...new Set(
      (Array.isArray(indexes) ? indexes : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value < 400),
    )].sort((left, right) => left - right)
    if (list.length) next[key] = list
  }
  return next
}

export function toggleWordHighlight(map, verseKey, wordIndex) {
  const current = normaliseWordHighlightMap(map)
  const key = String(verseKey || '').trim()
  const index = Number(wordIndex)
  if (!key || !key.includes(':') || !Number.isInteger(index) || index < 0 || index >= 400) {
    return current
  }
  const existing = current[key] ? [...current[key]] : []
  const at = existing.indexOf(index)
  if (at >= 0) existing.splice(at, 1)
  else existing.push(index)
  existing.sort((left, right) => left - right)
  if (existing.length) current[key] = existing
  else delete current[key]
  return current
}

export function isUserHighlightedWord(map, verseKey, wordIndex) {
  const key = String(verseKey || '').trim()
  const index = Number(wordIndex)
  if (!key || !Number.isInteger(index)) return false
  const list = normaliseWordHighlightMap(map)[key]
  return Array.isArray(list) && list.includes(index)
}

export function wordHighlightSignature(map, verseKey = '') {
  const current = normaliseWordHighlightMap(map)
  const key = String(verseKey || '').trim()
  if (key) return (current[key] || []).join(',')
  return Object.keys(current)
    .sort()
    .map((ayah) => `${ayah}:${current[ayah].join('.')}`)
    .join('|')
}

export function userHighlightIndexesByAyah(map, verses = []) {
  const current = normaliseWordHighlightMap(map)
  const allowed = new Set(
    (Array.isArray(verses) ? verses : [])
      .map((verse) => String(verse?.key || '').trim())
      .filter(Boolean),
  )
  if (!allowed.size) return current
  const next = {}
  for (const [key, indexes] of Object.entries(current)) {
    if (allowed.has(key)) next[key] = indexes
  }
  return next
}

export function hasUserWordHighlights(map) {
  return Object.keys(normaliseWordHighlightMap(map)).length > 0
}
