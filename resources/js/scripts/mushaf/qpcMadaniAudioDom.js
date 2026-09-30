/**
 * DOM helpers for shared mushaf audio highlighting (Madani + IndoPak).
 * Canonical identity: verseKey + wordPosition — never layout page numbers.
 */

export function resolveQpcWordAudioIndex(wordPosition, verseKey, audioIndexMap) {
  const position = Number(wordPosition)
  if (!Number.isFinite(position) || position < 1 || !verseKey) return null
  const mapKey = `${verseKey}:${position}`
  if (audioIndexMap instanceof Map) {
    if (audioIndexMap.has(mapKey)) {
      return audioIndexMap.get(mapKey)
    }
    // Map present but position absent (ayah-end / pause ornaments): do not
    // fall back to position-1 — that skews hide/highlight onto the wrong word.
    if (audioIndexMap.size > 0) {
      return null
    }
  }
  return position - 1
}

export function matchesQpcWordAudioIndex(node, verseKey, activeIndex, audioIndexMap) {
  if (!node || !verseKey || activeIndex < 0) return false
  if (String(node.getAttribute?.('data-ayah-key') || '') !== String(verseKey)) return false
  const position = Number(node.getAttribute?.('data-word'))
  const idx = resolveQpcWordAudioIndex(position, verseKey, audioIndexMap)
  return idx === activeIndex
}

export function escapeDomAttr(value) {
  const raw = String(value || '')
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(raw)
  }
  return raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function collectQpcMadaniWordHighlightNodes(documentRoot, verseKey, activeIndex, audioIndexMap) {
  if (!documentRoot || !verseKey || activeIndex < 0) return []
  const escaped = escapeDomAttr(verseKey)
  const nodes = []
  documentRoot.querySelectorAll(`.qpc-madani-word[data-ayah-key="${escaped}"]`).forEach((node) => {
    if (matchesQpcWordAudioIndex(node, verseKey, activeIndex, audioIndexMap)) {
      nodes.push(node)
    }
  })
  return nodes
}

export function collectQpcMadaniPlayingAyahNodes(documentRoot, verseKey) {
  if (!documentRoot || !verseKey) return []
  const escaped = escapeDomAttr(verseKey)
  return Array.from(
    documentRoot.querySelectorAll(`.qpc-madani-word[data-ayah-key="${escaped}"]`)
  )
}
