import { getAudioWordCount } from './madaniWordSync.js'
import { escapeDomAttr } from './qpcMadaniAudioDom.js'
import { clearLiveWordPresentationStyles } from '../formatting/liveWordPresentation.js'

const RECITATION_WORD_STATUS_CLASSES = [
  'recitation-word-pending',
  'recitation-word-correct',
  'recitation-word-partial',
  'recitation-word-incorrect',
  'recitation-word-skipped',
  'recitation-word-notAttempted',
  'recitation-word-extra',
]

const AMD_RECITATION_STATUS_CLASSES = [
  'amd-word-hidden',
  'amd-word-revealed',
  'amd-word-current',
  'amd-word-peeked',
  'tajweed-needs-review',
  'is-tajweed-active',
]

/**
 * Normalise pipeline status to recitation-word-* class suffix (existing Mutqin vocabulary).
 * @param {unknown} statusEntry
 * @param {boolean} live
 */
export function normaliseMadaniRecitationVisualStatus(statusEntry = {}, live = true) {
  if (String(statusEntry?.type || '').toUpperCase() === 'DELETION') return 'omitted'
  const raw = String(
    statusEntry?.status
    || statusEntry?.visual_status
    || statusEntry?.visualStatus
    || 'pending'
  ).toLowerCase()
  if (raw === 'wrong' || raw === 'incorrect' || raw === 'red') return 'incorrect'
  if (raw === 'partial' || raw === 'minor_mistake' || raw === 'amber') return 'partial'
  if (raw === 'correct' || raw === 'green') return 'correct'
  if (raw === 'omitted' || raw === 'missing' || raw === 'omission' || raw === 'black') return 'omitted'
  if (raw === 'skipped') return 'skipped'
  if (raw === 'extra') return 'extra'
  if (raw === 'notattempted' || raw === 'not_attempted' || raw === 'pending' || raw === 'gray' || raw === 'grey') {
    return live ? 'notAttempted' : 'omitted'
  }
  if (['correct', 'partial', 'incorrect', 'omitted', 'skipped', 'extra', 'notattempted'].includes(raw)) {
    return raw === 'notattempted' ? 'notAttempted' : raw
  }
  return live ? 'notAttempted' : 'omitted'
}

export function resolveWordPositionForAudioIndex(verse = {}, audioIndex = 0) {
  const index = Number(audioIndex)
  if (!Number.isFinite(index) || index < 0 || !Array.isArray(verse?.words)) return null
  let cursor = 0
  for (const sourceWord of verse.words) {
    const arabic = String(sourceWord?.ar || sourceWord?.text || '').trim()
    if (!arabic) continue
    if (cursor === index) {
      const position = Number(sourceWord?.position)
      return Number.isFinite(position) && position > 0 ? Math.trunc(position) : cursor + 1
    }
    cursor += 1
  }
  return null
}

/**
 * Exact canonical mapping only — returns null when session tokens and QPC word counts diverge.
 */
export function resolveMadaniRecitationWordTarget(globalIndex = 0, context = {}) {
  const gi = Number(globalIndex)
  if (!Number.isFinite(gi) || gi < 0) return null

  const verses = Array.isArray(context.verses) ? context.verses : []
  const audioIndexMap = context.audioIndexMap instanceof Map ? context.audioIndexMap : null
  const evaluationEntries = Object.values(context.evaluationMap || {})
    .filter((entry) => Number.isFinite(Number(entry?.wordOffset)) && Number.isFinite(Number(entry?.wordCount)) && Number(entry.wordCount) > 0)
    .sort((left, right) => Number(left?.wordOffset || 0) - Number(right?.wordOffset || 0))

  for (const entry of evaluationEntries) {
    const wordOffset = Number(entry.wordOffset || 0)
    const wordCount = Number(entry.wordCount || 0)
    if (gi < wordOffset || gi >= wordOffset + wordCount) continue
    const verseKey = String(entry.ayahKey || '').trim()
    const localIndex = gi - wordOffset
    return buildTarget(verseKey, localIndex, wordCount, verses, audioIndexMap)
  }

  const ayahBounds = Array.isArray(context.ayahBounds) ? context.ayahBounds : []
  const ayahKeys = Array.isArray(context.ayahKeys) ? context.ayahKeys : []
  for (let ayahIndex = 0; ayahIndex < ayahBounds.length; ayahIndex += 1) {
    const bound = ayahBounds[ayahIndex]
    if (!bound || gi < bound.start || gi >= bound.end) continue
    const verseKey = String(ayahKeys[ayahIndex] || '').trim()
    const localIndex = gi - bound.start
    const sessionWordCount = bound.end - bound.start
    return buildTarget(verseKey, localIndex, sessionWordCount, verses, audioIndexMap)
  }

  return null
}

function buildTarget(verseKey, localIndex, sessionWordCount, verses, audioIndexMap) {
  if (!verseKey || !Number.isFinite(localIndex) || localIndex < 0) return null
  const verse = verses.find((candidate) => String(candidate?.key || '') === verseKey) || null
  if (!verse) return null
  const audioCount = getAudioWordCount(verse, audioIndexMap || new Map())
  const tokenCount = Number(sessionWordCount)
  if (!Number.isFinite(tokenCount) || tokenCount < 1 || audioCount !== tokenCount) return null
  if (localIndex >= audioCount) return null
  const wordPosition = resolveWordPositionForAudioIndex(verse, localIndex)
  if (!Number.isFinite(wordPosition) || wordPosition < 1) return null
  const parts = verseKey.split(':')
  if (parts.length < 2) return null
  return {
    verseKey,
    wordAudioIndex: localIndex,
    wordPosition: Math.trunc(wordPosition),
    locationKey: `${parts[0]}:${parts[1]}:${Math.trunc(wordPosition)}`,
  }
}

export function findQpcMadaniRecitationNode(documentRoot, target = {}) {
  if (!documentRoot?.querySelectorAll || !target?.verseKey) return null
  const verseKey = escapeDomAttr(target.verseKey)
  const wordAudioIndex = Number(target.wordAudioIndex)
  if (!Number.isFinite(wordAudioIndex)) return null
  const nodes = documentRoot.querySelectorAll(
    `.qpc-madani-word[data-verse-key="${verseKey}"][data-word-index="${wordAudioIndex}"]`
  )
  const locationKey = String(target.locationKey || '').trim()
  for (const node of nodes) {
    if (!locationKey) return node
    if (String(node.getAttribute?.('data-location') || '') === locationKey) return node
  }
  return null
}

export function applyQpcMadaniRecitationPatchToNode(node, patch = {}, options = {}) {
  if (!node?.classList) return false
  const status = normaliseMadaniRecitationVisualStatus(
    { status: patch.status },
    patch.live !== false
  )
  RECITATION_WORD_STATUS_CLASSES.forEach((className) => node.classList.remove(className))
  AMD_RECITATION_STATUS_CLASSES.forEach((className) => node.classList.remove(className))
  node.classList.add(`recitation-word-${status}`)
  node.dataset.liveWordStatus = status

  const shouldMask = patch.masked === true || patch.hidden === true
  if (shouldMask) {
    node.classList.add('amd-word-hidden')
    node.setAttribute('aria-hidden', 'true')
    node.setAttribute('data-masked', '1')
  } else {
    node.classList.remove('amd-word-hidden')
    node.removeAttribute('aria-hidden')
    node.removeAttribute('data-masked')
  }
  node.classList.toggle('amd-word-revealed', !!patch.revealed)
  node.classList.toggle('amd-word-current', !!patch.current)
  node.classList.toggle('amd-word-peeked', !!patch.peeked)
  node.classList.toggle('tajweed-needs-review', status === 'incorrect' || status === 'partial')
  node.classList.toggle('is-tajweed-active', !!patch.current || !!patch.tajweedActive)

  if (typeof options.applyPresentation === 'function') {
    options.applyPresentation(node, status)
  }
  return true
}

export function clearQpcMadaniRecitationDom(documentRoot) {
  if (!documentRoot?.querySelectorAll) return
  documentRoot.querySelectorAll('.qpc-madani-word').forEach((node) => {
    RECITATION_WORD_STATUS_CLASSES.forEach((className) => node.classList.remove(className))
    AMD_RECITATION_STATUS_CLASSES.forEach((className) => node.classList.remove(className))
    node.classList.remove('recitation-word-notAttempted')
    node.removeAttribute('data-live-word-status')
    node.removeAttribute('data-masked')
    node.removeAttribute('aria-hidden')
    delete node.dataset.liveWordStatus
    clearLiveWordPresentationStyles(node)
  })
}

/**
 * @param {ParentNode|null} documentRoot
 * @param {Array<{ index: number, status?: string, current?: boolean, hidden?: boolean, masked?: boolean, revealed?: boolean, peeked?: boolean, tajweedActive?: boolean, live?: boolean }>} patches
 * @param {object} context
 * @param {{ applyPresentation?: (node: Element, status: string) => void }} options
 * @returns {{ changed: boolean, currentAyahKey: string }}
 */
export function patchQpcMadaniRecitationDom(documentRoot, patches = [], context = {}, options = {}) {
  if (!documentRoot || !Array.isArray(patches) || !patches.length) {
    return { changed: false, currentAyahKey: '' }
  }
  let changed = false
  let currentAyahKey = ''
  for (const patch of patches) {
    const target = resolveMadaniRecitationWordTarget(patch.index, context)
    if (!target) continue
    const node = findQpcMadaniRecitationNode(documentRoot, target)
    if (!node) continue
    if (applyQpcMadaniRecitationPatchToNode(node, patch, options)) {
      changed = true
      if (patch.current || patch.tajweedActive) currentAyahKey = target.verseKey
    }
  }
  return { changed, currentAyahKey }
}

export function resolveAyahKeyForMadaniRecitationIndex(globalIndex = 0, context = {}) {
  const target = resolveMadaniRecitationWordTarget(globalIndex, context)
  return target?.verseKey || ''
}
