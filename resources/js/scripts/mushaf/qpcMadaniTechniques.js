import { ayahKeyFromWord } from './qpcMadaniSelection.js'
import { resolveQpcWordAudioIndex } from './qpcMadaniAudioDom.js'
import { isWordHidden } from '../memorisationDetection/hiddenWords.js'
import { resolveAnchorIndices } from '../techniques/anchorWords.js'

export const QPC_MADANI_DOM_MANAGED_CLASSES = Object.freeze([
  'highlighted',
  'phrase-highlighted',
  'is-playing-ayah',
  'practice-focus-word',
  'practice-focus-word--active',
  'practice-focus-word--emphasis',
  'word-error-flash',
  'word-reveal-animate',
  'tajweed-needs-review',
  'is-tajweed-active',
])

export function isQpcMadaniDomManagedClass(className = '') {
  const name = String(className || '')
  if (!name) return false
  if (QPC_MADANI_DOM_MANAGED_CLASSES.includes(name)) return true
  return name.startsWith('recitation-word-') || name.startsWith('amd-word-')
}

export function collectQpcMadaniDomManagedClasses(classList) {
  if (!classList) return []
  return [...classList].filter(isQpcMadaniDomManagedClass)
}

export function restoreQpcMadaniDomManagedClasses(el, classes = []) {
  if (!el?.classList || !Array.isArray(classes) || !classes.length) return
  classes.forEach((name) => {
    if (name) el.classList.add(name)
  })
}

export function buildQpcMadaniAnchorIndexesByAyah({
  verses = [],
  anchorModeEnabled = false,
  anchorCount = 1,
  wordCountForAyah,
} = {}) {
  if (!anchorModeEnabled) return {}
  const map = {}
  for (const verse of Array.isArray(verses) ? verses : []) {
    const key = String(verse?.key || '')
    if (!key) continue
    const total = typeof wordCountForAyah === 'function'
      ? Number(wordCountForAyah(key, verse))
      : 0
    map[key] = resolveAnchorIndices(total, anchorCount)
  }
  return map
}

export function resolveAnchorWordState(wordAudioIndex, ayahKey, snapshot = {}) {
  if (!snapshot.anchorModeEnabled) return false
  const key = String(ayahKey || '')
  const indexes = snapshot.anchorIndexesByAyah?.[key]
  if (!Array.isArray(indexes) || !indexes.length) return false
  const index = Number(wordAudioIndex)
  return Number.isFinite(index) && indexes.includes(index)
}

function ayahMatchesSnapshotKey(ayahKey, snapshotKey) {
  const key = String(ayahKey || '')
  return !!key && key === String(snapshotKey || '')
}

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
  if (ayahMatchesSnapshotKey(ayahKey, snapshot.playbackAyahKey)) return false
  if (ayahMatchesSnapshotKey(ayahKey, snapshot.highlightedAyahKey)) return false
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
  if (ayahMatchesSnapshotKey(key, snapshot.playbackAyahKey)) return false
  if (ayahMatchesSnapshotKey(key, snapshot.highlightedAyahKey)) return false
  return true
}

function chainAyahKeySet(snapshot = {}) {
  return new Set(
    (Array.isArray(snapshot.chainAyahKeys) ? snapshot.chainAyahKeys : [])
      .map((key) => String(key || ''))
      .filter(Boolean)
  )
}

export function isAyahInActiveChain(ayahKey, snapshot = {}) {
  if (!snapshot.chainingEnabled) return false
  const keys = chainAyahKeySet(snapshot)
  if (!keys.size) return false
  return keys.has(String(ayahKey || ''))
}

export function isAyahChainDimmed(ayahKey, snapshot = {}) {
  if (!snapshot.chainingEnabled) return false
  const keys = chainAyahKeySet(snapshot)
  if (!keys.size) return false
  return !keys.has(String(ayahKey || ''))
}

export function isAyahTalqinListen(ayahKey, snapshot = {}) {
  if (!snapshot.talqinModeEnabled || snapshot.talqinRepeatPhase) return false
  return ayahMatchesSnapshotKey(ayahKey, snapshot.effectiveActiveAyah)
    || ayahMatchesSnapshotKey(ayahKey, snapshot.playbackAyahKey)
}

export function isAyahTalqinRepeat(ayahKey, snapshot = {}) {
  if (!snapshot.talqinModeEnabled || !snapshot.talqinRepeatPhase) return false
  return ayahMatchesSnapshotKey(ayahKey, snapshot.effectiveActiveAyah)
    || ayahMatchesSnapshotKey(ayahKey, snapshot.playbackAyahKey)
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
  // Canonical spoken-word identity: verseKey + wordPosition (shared Madani/IndoPak).
  const wordPosition = Number(word?.wordPosition ?? word?.word_position ?? word?.word)
  const wordAudioIndex = word?.isEnd
    ? null
    : resolveQpcWordAudioIndex(wordPosition, ayahKey, audioIndexMap)
  const isAnchor = resolveAnchorWordState(wordAudioIndex, ayahKey, snapshot)
  const blur = isAyahBlurred(ayahKey, snapshot)
  const peek = blur && isAyahPeekRevealed(ayahKey, snapshot)
  const hiddenReveal = resolveHiddenRevealWordState(wordAudioIndex, ayahKey, snapshot)
  const checker = resolveCheckerHiddenWordState(wordAudioIndex, ayahKey, snapshot)
  // Ornaments keep layout space but are never Progressive-Hide targets.
  const masked = !word?.isEnd && (
    (hiddenReveal.masked && !hiddenReveal.revealedProgress)
    || (checker.masked && !checker.peeked)
  )

  return {
    ayahKey,
    wordAudioIndex,
    locationKey: qpcWordLocationKey(word),
    isAnchor,
    blurUpcoming: blur,
    peekRevealed: peek,
    focusDimmed: isAyahFocusDimmed(ayahKey, snapshot) && !peek,
    isChainMember: isAyahInActiveChain(ayahKey, snapshot),
    isChainDimmed: isAyahChainDimmed(ayahKey, snapshot),
    isTalqinListen: isAyahTalqinListen(ayahKey, snapshot),
    isTalqinRepeat: isAyahTalqinRepeat(ayahKey, snapshot),
    masked,
    hiddenRevealCurrent: hiddenReveal.current,
    hiddenRevealRevealed: hiddenReveal.revealedProgress,
    checkerMasked: !word?.isEnd && checker.masked && !checker.peeked,
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
    'anchor-highlight': !!state.isAnchor,
    'anchor-pulse': !!state.isAnchor,
    'is-chain-member': !!state.isChainMember,
    'is-chain-dim': !!state.isChainDimmed,
    'is-talqin-listen': !!state.isTalqinListen,
    'is-talqin-repeat': !!state.isTalqinRepeat,
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
