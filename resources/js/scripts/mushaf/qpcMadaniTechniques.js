import { ayahKeyFromWord } from './qpcMadaniSelection.js'
import { resolveQpcWordAudioIndex } from './qpcMadaniAudioDom.js'
import { isWordHidden } from '../memorisationDetection/hiddenWords.js'

export function qpcWordLocationKey(word = {}) {
  const location = String(word?.location || '').trim()
  if (location) return location
  const surah = Number(word?.surah)
  const ayah = Number(word?.ayah)
  const position = Number(word?.word)
  if (Number.isFinite(surah) && Number.isFinite(ayah) && Number.isFinite(position)) {
    return `${Math.trunc(surah)}:${Math.trunc(ayah)}:${Math.trunc(position)}`
  }
  return ''
}

export function parseAyahNumberFromKey(ayahKey) {
  const parts = String(ayahKey || '').trim().split(':')
  const ayah = Number(parts[1])
  return Number.isFinite(ayah) ? Math.trunc(ayah) : null
}

export function isAyahBlurred(ayahKey, snapshot = {}) {
  if (!snapshot.blurModeEnabled) return false
  const activeNumber = parseAyahNumberFromKey(snapshot.effectiveActiveAyah)
  const verseNumber = parseAyahNumberFromKey(ayahKey)
  if (activeNumber === null || verseNumber === null) return false
  return verseNumber > activeNumber
}

export function isAyahPeekRevealed(ayahKey, snapshot = {}) {
  if (!isAyahBlurred(ayahKey, snapshot)) return false
  const key = String(ayahKey || '')
  if (snapshot.blurPeekHoldingSpace) return true
  return key === String(snapshot.hoverPeekAyah || '') || key === String(snapshot.touchPeekAyah || '')
}

export function isAyahFocusDimmed(ayahKey, snapshot = {}) {
  if (!snapshot.focusModeEnabled || !snapshot.hasSessionStarted) return false
  const key = String(ayahKey || '')
  if (!key) return false
  if (key === String(snapshot.effectiveActiveAyah || '')) return false
  return true
}

export function resolveHiddenRevealWordState(wordAudioIndex, ayahKey, snapshot = {}) {
  if (!snapshot.hiddenRevealModeEnabled) {
    return { masked: false, revealed: true, current: false, revealedProgress: false }
  }
  const key = String(ayahKey || '')
  if (key !== String(snapshot.hiddenRevealVerseKey || '')) {
    return { masked: false, revealed: true, current: false, revealedProgress: false }
  }
  const index = Number(wordAudioIndex)
  if (!Number.isFinite(index) || index < 0) {
    return { masked: false, revealed: true, current: false, revealedProgress: false }
  }
  const revealedSet = snapshot.hiddenRevealRevealed instanceof Set
    ? snapshot.hiddenRevealRevealed
    : new Set(Array.isArray(snapshot.hiddenRevealRevealed) ? snapshot.hiddenRevealRevealed : [])
  const revealed = revealedSet.has(index)
  const current = index === Number(snapshot.hiddenRevealCurrentIndex)
  return {
    masked: !revealed,
    revealed,
    current,
    revealedProgress: revealed,
  }
}

export function resolveCheckerHiddenWordState(wordAudioIndex, ayahKey, snapshot = {}) {
  const key = String(ayahKey || '')
  const indexes = snapshot.checkerHiddenIndexesByAyah?.[key]
  if (!Array.isArray(indexes) || !indexes.length) {
    return { masked: false, peeked: false }
  }
  const index = Number(wordAudioIndex)
  if (!Number.isFinite(index) || index < 0) return { masked: false, peeked: false }
  const masked = isWordHidden(indexes, index)
  if (!masked) return { masked: false, peeked: false }
  const peeked = !!snapshot.checkerPeekActive
    && key === String(snapshot.checkerPeekAyah || snapshot.effectiveActiveAyah || '')
  return { masked: !peeked, peeked }
}

export function resolveQpcMadaniWordTechniqueState(word = {}, snapshot = {}, audioIndexMap = null) {
  const ayahKey = ayahKeyFromWord(word)
  const wordAudioIndex = resolveQpcWordAudioIndex(Number(word?.word), ayahKey, audioIndexMap)
  const blur = isAyahBlurred(ayahKey, snapshot)
  const peek = blur && isAyahPeekRevealed(ayahKey, snapshot)
  const hiddenReveal = resolveHiddenRevealWordState(wordAudioIndex, ayahKey, snapshot)
  const checker = resolveCheckerHiddenWordState(wordAudioIndex, ayahKey, snapshot)
  const masked = (hiddenReveal.masked && !hiddenReveal.revealedProgress)
    || (checker.masked && !checker.peeked)

  return {
    ayahKey,
    wordAudioIndex,
    locationKey: qpcWordLocationKey(word),
    blurUpcoming: blur,
    peekRevealed: peek,
    focusDimmed: isAyahFocusDimmed(ayahKey, snapshot) && !peek,
    masked,
    hiddenRevealCurrent: hiddenReveal.current,
    hiddenRevealRevealed: hiddenReveal.revealedProgress,
    checkerMasked: checker.masked && !checker.peeked,
  }
}

export function madaniQpcWordTechniqueClass(state = {}) {
  return {
    'blur-upcoming': !!state.blurUpcoming,
    'peek-revealed': !!state.peekRevealed,
    'is-focus-dim': !!state.focusDimmed,
    'is-word-masked': !!state.masked,
    'word-hidden': !!state.masked,
    'word-revealed': !!state.hiddenRevealRevealed && !state.hiddenRevealCurrent,
    'word-current': !!state.hiddenRevealCurrent,
    'memory-word-hidden': !!state.checkerMasked,
  }
}

function isAmdSettledWordAttempt(status = '') {
  const raw = String(status || '').toLowerCase()
  return raw === 'correct'
    || raw === 'partial'
    || raw === 'incorrect'
    || raw === 'omitted'
}

/**
 * Map AMD global hidden indexes to per-ayah audio indexes for QPC Madani masking.
 * Reuses the same hide/reveal rules as buildAmdMushafHtml without mutating page data.
 */
export function buildMadaniAmdHiddenIndexesByAyah({
  ayahKeys = [],
  ayahBounds = [],
  globalHiddenIndexes = [],
  hideAllWords = false,
  liveWords = [],
} = {}) {
  const hiddenSet = new Set(
    (Array.isArray(globalHiddenIndexes) ? globalHiddenIndexes : [])
      .map((index) => Number(index))
      .filter((index) => Number.isFinite(index))
  )
  const words = Array.isArray(liveWords) ? liveWords : []
  const byAyah = {}

  for (let ayahIndex = 0; ayahIndex < ayahBounds.length; ayahIndex += 1) {
    const bound = ayahBounds[ayahIndex]
    const ayahKey = String(ayahKeys[ayahIndex] || '').trim()
    if (!bound || !ayahKey) continue

    const localIndexes = []
    for (let globalIndex = bound.start; globalIndex < bound.end; globalIndex += 1) {
      const isHiddenTarget = hideAllWords || hiddenSet.has(globalIndex)
      if (!isHiddenTarget) continue
      const status = words[globalIndex]?.status
      if (isAmdSettledWordAttempt(status)) continue
      localIndexes.push(globalIndex - bound.start)
    }
    if (localIndexes.length) byAyah[ayahKey] = localIndexes
  }

  return byAyah
}

export function resolveMadaniAmdPeekAyahKey({
  ayahKeys = [],
  ayahBounds = [],
  peekAyahBound = null,
} = {}) {
  if (!peekAyahBound || !Array.isArray(ayahBounds) || !ayahBounds.length) return ''
  const start = Number(peekAyahBound.start)
  if (!Number.isFinite(start)) return ''
  const ayahIndex = ayahBounds.findIndex((bound) => start >= bound.start && start < bound.end)
  if (ayahIndex < 0) return ''
  return String(ayahKeys[ayahIndex] || '').trim()
}
