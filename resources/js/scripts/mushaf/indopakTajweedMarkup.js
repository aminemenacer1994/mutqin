/**
 * IndoPak mushaf tajweed: paint Unicode Nastaleeq text with stacked-style
 * `.tajweed-*` CSS classes derived from Madani `arabic_tajweed` word tokens.
 * Never swaps IndoPak glyphs for QCF COLRv1 (Madani-only).
 *
 * Class names stay as markup suffixes (`ghn`, `qlq`, …) so Memorisation.css
 * `.tajweed-ghn` selectors apply — do not remap through practice-check rule keys.
 */

const ARABIC_BASE_LETTER_RE = /[\u0621-\u064A\u0671]/

function escapeHtml(text = '') {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isArabicBaseLetter(char) {
  return ARABIC_BASE_LETTER_RE.test(String(char || ''))
}

/**
 * Extract display class suffixes from a tajweed span class attribute.
 * e.g. "tajweed-mark tajweed-ghn" → ["ghn"]
 * @param {string} classAttr
 * @returns {string[]}
 */
export function tajweedDisplayClassesFromAttr(classAttr = '') {
  const matches = String(classAttr || '').match(/\btajweed-([a-zA-Z0-9_]+)\b/g) || []
  return [...new Set(
    matches
      .map((token) => token.replace(/^tajweed-/, ''))
      .filter((name) => name && name !== 'mark'),
  )]
}

/**
 * Lightweight span walker: per-character display class lists (markup suffixes).
 * @param {string} markup
 * @returns {Array<{ text: string, classes: string[] }>}
 */
export function extractTajweedDisplayUnits(markup = '') {
  const html = String(markup || '')
  /** @type {Array<{ text: string, classes: string[] }>} */
  const units = []
  /** @type {string[][]} */
  const stack = [[]]
  const tagRe = /<\/?span\b[^>]*>|[^<]+/gi
  let match
  while ((match = tagRe.exec(html)) !== null) {
    const token = match[0]
    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop()
      continue
    }
    if (token.startsWith('<')) {
      const classMatch = token.match(/class=['"]([^'"]+)['"]/i)
      const own = tajweedDisplayClassesFromAttr(classMatch?.[1] || '')
      const inherited = stack[stack.length - 1] || []
      stack.push([...new Set([...inherited, ...own])])
      continue
    }
    const classes = [...(stack[stack.length - 1] || [])]
    for (const char of Array.from(token)) {
      units.push({ text: char, classes })
    }
  }
  return units
}

/**
 * Collect display class stacks for each Arabic base letter in a tajweed HTML token.
 * @param {string} tajweedTokenHtml
 * @returns {string[][]}
 */
export function collectTajweedBaseLetterRules(tajweedTokenHtml = '') {
  const units = extractTajweedDisplayUnits(tajweedTokenHtml)
  /** @type {string[][]} */
  const rules = []
  for (const unit of units) {
    if (isArabicBaseLetter(unit?.text)) {
      rules.push(Array.isArray(unit.classes) ? unit.classes.filter(Boolean) : [])
    }
  }
  return rules
}

/**
 * Wrap IndoPak Unicode text with tajweed spans, aligning rules by Arabic base letter.
 * Diacritics inherit the preceding base letter's rules.
 *
 * @param {string} unicodeText IndoPak (or any Unicode) word text
 * @param {string} tajweedTokenHtml Sanitized Madani tajweed word token HTML
 * @returns {string} Safe HTML (escaped text + span wrappers only)
 */
export function paintUnicodeTextWithTajweedToken(unicodeText = '', tajweedTokenHtml = '') {
  const text = String(unicodeText || '')
  if (!text) return ''
  const token = String(tajweedTokenHtml || '').trim()
  if (!token) return escapeHtml(text)

  const baseRules = collectTajweedBaseLetterRules(token)
  if (!baseRules.some((rules) => rules.length)) {
    return escapeHtml(text)
  }

  const chars = Array.from(text)
  /** @type {string[]} */
  const parts = []
  let buffer = ''
  /** @type {string} */
  let openKey = ''
  let baseIdx = 0
  /** @type {string[]} */
  let lastRules = []

  const flush = () => {
    if (!buffer) return
    if (openKey) {
      const classNames = openKey
        .split(/\s+/)
        .filter(Boolean)
        .map((rule) => `tajweed-${rule}`)
        .join(' ')
      parts.push(`<span class="tajweed-mark ${classNames}">${escapeHtml(buffer)}</span>`)
    } else {
      parts.push(escapeHtml(buffer))
    }
    buffer = ''
  }

  for (const char of chars) {
    /** @type {string[]} */
    let rules = []
    if (isArabicBaseLetter(char)) {
      rules = baseRules[baseIdx] || []
      lastRules = rules
      baseIdx += 1
    } else {
      // Marks / tatweel / punctuation inherit the current base letter's colour.
      rules = lastRules
    }
    const key = rules.join(' ')
    if (key !== openKey) {
      flush()
      openKey = key
    }
    buffer += char
  }
  flush()
  return parts.join('')
}

/**
 * Build location → tajweed token HTML from session verses.
 * Tokens are Madani markup; MadaniWord paints them onto IndoPak Unicode text.
 *
 * @param {Array<{ key?: string, verse_key?: string, arabic_tajweed?: string, words?: Array<{ position?: number, word?: number, location?: string }> }>} verses
 * @param {{ normalizeMarkup?: (text: string) => string, splitIntoWordHtml?: (markup: string) => string[], sanitizeHtml?: (html: string) => string }} helpers
 * @returns {Record<string, string>}
 */
export function buildIndopakTajweedTokenByLocation(verses = [], helpers = {}) {
  const normalizeMarkup = helpers.normalizeMarkup || ((text) => String(text || ''))
  const splitIntoWordHtml = helpers.splitIntoWordHtml || (() => [])
  const sanitizeHtml = helpers.sanitizeHtml || ((html) => String(html || ''))

  /** @type {Record<string, string>} */
  const map = Object.create(null)
  for (const verse of verses) {
    const verseKey = String(verse?.key || verse?.verse_key || '').trim()
    const markup = String(verse?.arabic_tajweed || '').trim()
    if (!verseKey || !markup) continue
    const normalized = normalizeMarkup(markup)
    if (!normalized) continue
    const tokens = splitIntoWordHtml(normalized)
    if (!Array.isArray(tokens) || !tokens.length) continue
    const words = Array.isArray(verse?.words) ? verse.words : []
    tokens.forEach((token, idx) => {
      const word = words[idx] || {}
      const position = Number(word?.position ?? word?.word ?? idx + 1)
      if (!Number.isFinite(position) || position < 1) return
      const location = String(word?.location || `${verseKey}:${position}`).trim()
      const html = sanitizeHtml(token)
      if (location && html) {
        map[location] = html
      }
    })
  }
  return map
}
