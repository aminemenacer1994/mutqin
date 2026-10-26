import {
  normalizeComparisonText,
  tokenizeDisplayText,
} from '../memorisation/quranTextNormalizer.js'
import { sanitizeMutashabihatAyahText } from './displayText.js'

/**
 * @typedef {{ kind: 'shared'|'different'|'inserted'|'omitted', text: string }} CompareSegment
 */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Display tokens keep Mushaf spelling and harakat. Alignment uses normalised text.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeDisplayWords(text) {
  return tokenizeDisplayText(text)
}

/**
 * @param {string[]} leftNorm
 * @param {string[]} rightNorm
 * @returns {Array<{ kind: string, i?: number, j?: number }>}
 */
function alignNormalizedTokens(leftNorm, rightNorm) {
  const n = leftNorm.length
  const m = rightNorm.length
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (leftNorm[i] && leftNorm[i] === rightNorm[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1]
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (leftNorm[i] && leftNorm[i] === rightNorm[j]) {
      ops.push({ kind: 'equal', i, j })
      i += 1
      j += 1
    } else if (dp[i + 1][j] > dp[i][j + 1]) {
      ops.push({ kind: 'delete', i })
      i += 1
    } else if (dp[i][j + 1] > dp[i + 1][j]) {
      ops.push({ kind: 'insert', j })
      j += 1
    } else {
      ops.push({ kind: 'replace', i, j })
      i += 1
      j += 1
    }
  }
  while (i < n) {
    ops.push({ kind: 'delete', i })
    i += 1
  }
  while (j < m) {
    ops.push({ kind: 'insert', j })
    j += 1
  }

  return ops
}

/**
 * Compare two canonical ayah strings; display tokens are never rewritten.
 *
 * @param {string} leftText
 * @param {string} rightText
 * @returns {{ left: CompareSegment[], right: CompareSegment[], stats: Record<string, number> }}
 */
export function compareAyahTexts(leftText, rightText) {
  const leftTokens = tokenizeDisplayWords(leftText)
  const rightTokens = tokenizeDisplayWords(rightText)
  const leftNorm = leftTokens.map((t) => normalizeComparisonText(t))
  const rightNorm = rightTokens.map((t) => normalizeComparisonText(t))
  const ops = alignNormalizedTokens(leftNorm, rightNorm)

  /** @type {CompareSegment[]} */
  const left = []
  /** @type {CompareSegment[]} */
  const right = []
  const stats = { shared: 0, different: 0, inserted: 0, omitted: 0 }

  for (const op of ops) {
    if (op.kind === 'equal') {
      left.push({ kind: 'shared', text: leftTokens[op.i] || '' })
      right.push({ kind: 'shared', text: rightTokens[op.j] || '' })
      stats.shared += 1
    } else if (op.kind === 'replace') {
      left.push({ kind: 'different', text: leftTokens[op.i] || '' })
      right.push({ kind: 'different', text: rightTokens[op.j] || '' })
      stats.different += 1
    } else if (op.kind === 'delete') {
      left.push({ kind: 'omitted', text: leftTokens[op.i] || '' })
      right.push({ kind: 'inserted', text: '' })
      stats.omitted += 1
    } else if (op.kind === 'insert') {
      left.push({ kind: 'omitted', text: '' })
      right.push({ kind: 'inserted', text: rightTokens[op.j] || '' })
      stats.inserted += 1
    }
  }

  return { left, right, stats }
}

/**
 * @param {CompareSegment} seg
 */
function isShared(seg) {
  return seg?.kind === 'shared'
}

/**
 * First contiguous run that is not shared on both sides.
 *
 * @param {CompareSegment[]} left
 * @param {CompareSegment[]} right
 * @returns {{ start: number, end: number } | null}
 */
export function firstDifferenceSpan(left = [], right = []) {
  const len = Math.max(left.length, right.length)
  let start = 0
  while (start < len && isShared(left[start]) && isShared(right[start])) start += 1
  if (start >= len) return null
  let end = start + 1
  while (end < len && !(isShared(left[end]) && isShared(right[end]))) end += 1
  return { start, end }
}

/**
 * @param {CompareSegment[]} left
 * @param {CompareSegment[]} right
 * @returns {Array<{ start: number, end: number }>}
 */
export function differenceSpans(left = [], right = []) {
  const len = Math.max(left.length, right.length)
  const spans = []
  let i = 0
  while (i < len) {
    if (isShared(left[i]) && isShared(right[i])) {
      i += 1
      continue
    }
    const start = i
    i += 1
    while (i < len && !(isShared(left[i]) && isShared(right[i]))) i += 1
    spans.push({ start, end: i })
  }
  return spans
}

/**
 * @param {CompareSegment[]} segments
 * @param {{ start: number, end: number }} span
 */
export function phraseFromSpan(segments, span) {
  if (!span) return ''
  return (segments || [])
    .slice(span.start, span.end)
    .map((seg) => String(seg?.text || '').trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * Compact card preview around the first difference, with leading/trailing ellipsis.
 *
 * @param {CompareSegment[]} segments
 * @param {{ start: number, end: number } | null} span
 * @param {{ before?: number, after?: number }} [opts]
 * @returns {CompareSegment[]}
 */
export function previewSegmentsAroundSpan(segments = [], span, opts = {}) {
  const all = segments || []
  const wordPositions = []
  for (let i = 0; i < all.length; i += 1) {
    if (String(all[i]?.text || '').trim()) wordPositions.push(i)
  }
  if (!wordPositions.length) return []

  const shortAyahMax = Number.isFinite(opts.shortAyahMax) ? opts.shortAyahMax : 16
  if (wordPositions.length <= shortAyahMax) {
    return wordPositions.map((index) => all[index])
  }

  const minVisible = Math.max(
    Math.ceil(wordPositions.length / 2),
    Number.isFinite(opts.minVisible) ? opts.minVisible : 8,
  )
  let anchorPos = Math.floor(wordPositions.length / 2)
  if (span) {
    const hit = wordPositions.findIndex((index) => index >= span.start && index < span.end)
    if (hit >= 0) anchorPos = hit
  }
  let startPos = Math.max(0, anchorPos - Math.floor(minVisible / 2))
  let endPos = Math.min(wordPositions.length, startPos + minVisible)
  if (endPos - startPos < minVisible) startPos = Math.max(0, endPos - minVisible)

  const slice = wordPositions.slice(startPos, endPos).map((index) => ({
    ...all[index],
    segmentIndex: index,
  }))
  if (startPos > 0) slice.unshift({ kind: 'ellipsis', text: '…' })
  if (endPos < wordPositions.length) slice.push({ kind: 'ellipsis', text: '…' })
  return slice
}

function isDiffSegment(seg) {
  const kind = String(seg?.kind || '')
  return kind === 'different' || kind === 'inserted' || kind === 'omitted'
}

/**
 * @param {CompareSegment[]} segments
 * @returns {string}
 */
/**
 * Word-level HTML for compare modal audio highlighting (data-verse-key / data-word-index).
 *
 * @param {CompareSegment[]} segments
 * @param {string} verseKey
 * @returns {string}
 */
export function renderComparedAyahWordHtml(segments, verseKey = '') {
  const key = String(verseKey || '').trim()
  const parts = []
  let wordIndex = 0

  for (const seg of segments || []) {
    const text = String(seg?.text || '').trim()
    if (!text) continue
    if (seg.kind === 'ellipsis') {
      parts.push(`<span class="mutashabihat-ellipsis" aria-hidden="true">${escapeHtml(text)}</span>`)
      continue
    }
    const idx = wordIndex
    wordIndex += 1
    const inner = escapeHtml(text)
    const tokenInner = isDiffSegment(seg)
      ? `<span class="mutashabihat-diff">${inner}</span>`
      : inner
    const keyAttr = key ? ` data-verse-key="${escapeHtml(key)}"` : ''
    parts.push(
      `<word class="wbw-word mutashabihat-compare-word"${keyAttr} data-word-index="${idx}"><span class="word-arabic-text">${tokenInner}</span></word>`,
    )
  }

  return parts.join(' ')
}

/**
 * @param {CompareSegment[]} segments
 * @param {{ highlightSpan?: { start: number, end: number } | null, highlightOnlySpan?: boolean }} [options]
 */
export function renderComparedAyahHtml(segments, options = {}) {
  const highlightSpan = options.highlightSpan || null
  const highlightOnlySpan = options.highlightOnlySpan === true
  const parts = []
  let sharedRun = []

  const flushShared = () => {
    if (!sharedRun.length) return
    parts.push(escapeHtml(sharedRun.join(' ')))
    sharedRun = []
  }

  const shouldHighlightDiff = (seg) => {
    if (!highlightOnlySpan || !highlightSpan) return true
    const idx = Number(seg?.segmentIndex)
    if (!Number.isFinite(idx)) return true
    return idx >= highlightSpan.start && idx < highlightSpan.end
  }

  for (const seg of segments || []) {
    const text = String(seg?.text || '').trim()
    if (!text) continue
    if (seg.kind === 'ellipsis') {
      flushShared()
      parts.push(`<span class="mutashabihat-ellipsis" aria-hidden="true">${escapeHtml(text)}</span>`)
      continue
    }
    if (isDiffSegment(seg)) {
      if (shouldHighlightDiff(seg)) {
        flushShared()
        parts.push(`<span class="mutashabihat-diff">${escapeHtml(text)}</span>`)
      } else {
        sharedRun.push(text)
      }
      continue
    }
    sharedRun.push(text)
  }
  flushShared()
  return parts.join(' ')
}

/**
 * Render an ayah with the first distinguishing run replaced by a blank.
 *
 * @param {CompareSegment[]} segments
 * @param {{ start: number, end: number } | null} span
 * @returns {string}
 */
export function renderRecallBlankHtml(segments, span) {
  const parts = []
  ;(segments || []).forEach((seg, index) => {
    if (span && index >= span.start && index < span.end) {
      if (index === span.start) {
        parts.push('<span class="mutashabihat-blank" aria-hidden="true">____</span>')
      }
      return
    }
    const text = String(seg?.text || '').trim()
    if (!text) return
    parts.push(`<span class="mutashabihat-token">${escapeHtml(text)}</span>`)
  })
  return parts.join(' ')
}

/**
 * @param {string} leftText
 * @param {string} rightText
 */
export function buildAyahComparison(leftText, rightText) {
  const left = sanitizeMutashabihatAyahText(leftText)
  const right = sanitizeMutashabihatAyahText(rightText)
  const diff = compareAyahTexts(left, right)
  const span = firstDifferenceSpan(diff.left, diff.right)
  const spans = differenceSpans(diff.left, diff.right)
  return {
    ...diff,
    span,
    spans,
    leftPhrase: phraseFromSpan(diff.left, span),
    rightPhrase: phraseFromSpan(diff.right, span),
    leftPreviewHtml: renderComparedAyahHtml(previewSegmentsAroundSpan(diff.left, span), {
      highlightSpan: span,
      highlightOnlySpan: true,
    }),
    rightPreviewHtml: renderComparedAyahHtml(previewSegmentsAroundSpan(diff.right, span), {
      highlightSpan: span,
      highlightOnlySpan: true,
    }),
    leftHtml: renderComparedAyahHtml(diff.left),
    rightHtml: renderComparedAyahHtml(diff.right),
    leftBlankHtml: renderRecallBlankHtml(diff.left, span),
    rightBlankHtml: renderRecallBlankHtml(diff.right, span),
  }
}

export default compareAyahTexts
