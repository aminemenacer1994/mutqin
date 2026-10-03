import { normalizeQuranText, tokenizeVerifiedText } from '../assessment/QuestionValidationService.js'

/**
 * @typedef {{ kind: 'shared'|'different'|'inserted'|'omitted', text: string }} CompareSegment
 */

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
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: 'delete', i })
      i += 1
    } else if (dp[i][j + 1] >= dp[i + 1][j]) {
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
  const leftTokens = tokenizeVerifiedText(leftText)
  const rightTokens = tokenizeVerifiedText(rightText)
  const leftNorm = leftTokens.map((t) => normalizeQuranText(t))
  const rightNorm = rightTokens.map((t) => normalizeQuranText(t))
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
 * @param {CompareSegment[]} segments
 * @returns {string}
 */
export function renderComparedAyahHtml(segments) {
  return (segments || [])
    .map((seg) => {
      const text = String(seg.text || '').trim()
      if (!text) return ''
      if (seg.kind === 'shared') return `<span class="mutashabihat-token">${text}</span>`
      return `<span class="mutashabihat-token is-diff">${text}</span>`
    })
    .filter(Boolean)
    .join(' ')
}

export default compareAyahTexts
