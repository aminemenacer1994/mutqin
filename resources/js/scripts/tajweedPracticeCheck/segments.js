import { getPracticeRule, getRuleKeyFromClass } from './catalog.js'

const MARKER_MAP = {
  '[h': 'ham_wasl',
  '[s': 'slnt',
  '[l': 'slnt',
  '[n': 'madda_normal',
  '[p': 'madda_permissible',
  '[m': 'madda_necessary',
  '[q': 'qlq',
  '[o': 'madda_obligatory',
  '[c': 'ikhf_shfw',
  '[f': 'ikhf',
  '[w': 'idghm_shfw',
  '[i': 'iqlb',
  '[a': 'idgh_ghn',
  '[u': 'idgh_w_ghn',
  '[d': 'idgh_mus',
  '[b': 'idgh_mus',
  '[g': 'ghn',
}

export function splitArabicGraphemes(text = '') {
  return Array.from(String(text || ''))
}

export function isArabicBaseLetter(char) {
  return /[\u0621-\u064A\u0671]/.test(String(char || ''))
}

export function stripTajweedMarkup(text) {
  if (!text) return ''
  return String(text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<\s*\/?\s*tajweed[^>]*>/gi, '')
    .replace(/<[^>]*>/g, '')
    // AlQuran bracket markers: [h:1[ٱ] or [n[ـٰ]
    .replace(/\[[a-z](?::[^\[]*)?\[/gi, '')
    .replace(/\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeTajweedMarkupToSpans(text) {
  if (!text) return ''
  let normalized = String(text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<\s*tajweed\b([^>]*)class=['"]?([a-zA-Z0-9_-]+)['"]?([^>]*)>/gi, '<span class="tajweed-mark tajweed-$2"$1$3>')
    .replace(/<\s*\/\s*tajweed\s*>/gi, '</span>')

  Object.entries(MARKER_MAP).forEach(([marker, className]) => {
    const escapedMarker = marker.replace('[', '\\[')
    // AlQuran form: [g:1[text] or [g[text] → open span; closing ] ends the rule.
    normalized = normalized.replace(
      new RegExp(`${escapedMarker}(?::[^\\[]*)?\\[`, 'g'),
      `<span class="tajweed-mark tajweed-${className}">`,
    )
  })

  return normalized
    .replace(/\[/g, '')
    .replace(/\]/g, '</span>')
    .replace(/<\/?tajweed[^>]*>/gi, '')
}

/**
 * Lightweight span parser for Node + browser (no DOM dependency).
 * @returns {Array<{ text: string, rules: string[] }>}
 */
export function extractTajweedRuleUnitsFromMarkup(markup) {
  const html = normalizeTajweedMarkupToSpans(markup)
  const units = []
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
      const classes = classMatch ? classMatch[1].split(/\s+/) : []
      const ownRules = classes.map(getRuleKeyFromClass).filter(Boolean)
      const inherited = stack[stack.length - 1] || []
      stack.push([...new Set([...inherited, ...ownRules])])
      continue
    }
    const rules = [...(stack[stack.length - 1] || [])]
    for (const char of splitArabicGraphemes(token)) {
      units.push({ text: char, rules })
    }
  }
  return units
}

export function tokenizeDisplayWords(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function getFirstArabicBaseLetter(word) {
  const match = String(word || '').match(/[\u0621-\u064A\u0671]/u)
  return match ? match[0] : ''
}

export function getNoonTanweenRuleKey(word, nextWord) {
  const current = String(word || '')
  const hasNoonSakinah = /ن[\u0652ْ]/u.test(current)
  const hasTanween = /[\u064B-\u064D]/u.test(current)
  if (!hasNoonSakinah && !hasTanween) return ''
  const sameWordNext = current.match(/ن[\u0652ْ][\u0610-\u061A\u064B-\u065F\u0670]*([\u0621-\u064A\u0671])/u)?.[1] || ''
  const nextLetter = sameWordNext || getFirstArabicBaseLetter(nextWord)
  if (!nextLetter) return ''
  if (/[ءأإآؤئههعحغخ]/u.test(nextLetter)) return 'noon_idhaar'
  if (/ب/u.test(nextLetter)) return 'noon_iqlaab'
  if (/[يرملون]/u.test(nextLetter)) return 'noon_idghaam'
  if (/[تثجدذزسشصضطظفقك]/u.test(nextLetter)) return 'noon_ikhfaa'
  return ''
}

export function getMeemSakinahRuleKey(word, nextWord) {
  const current = String(word || '')
  if (!/م[\u0652ْ]/u.test(current)) return ''
  const sameWordNext = current.match(/م[\u0652ْ][\u0610-\u061A\u064B-\u065F\u0670]*([\u0621-\u064A\u0671])/u)?.[1] || ''
  const nextLetter = sameWordNext || getFirstArabicBaseLetter(nextWord)
  if (!nextLetter) return ''
  if (/ب/u.test(nextLetter)) return 'meem_ikhfaa_shafawy'
  if (/م/u.test(nextLetter)) return 'meem_idghaam_shafawy'
  return 'meem_izhaar_shafawy'
}

export function extractMarkedOccurrencesForVerse(verse, wordOffset = 0) {
  const markup = verse?.arabic_tajweed || ''
  if (!markup) return []
  const units = extractTajweedRuleUnitsFromMarkup(markup)
  const plain = stripTajweedMarkup(markup) || stripTajweedMarkup(verse?.arabic || verse?.text || '')
  const words = tokenizeDisplayWords(plain)
  const occurrences = []
  let cursor = 0

  words.forEach((word, wordIndex) => {
    while (cursor < units.length && /^\s$/.test(units[cursor].text || '')) cursor += 1
    const targetChars = splitArabicGraphemes(word).filter(isArabicBaseLetter)
    const ruleKeys = new Set()
    let collected = 0
    while (cursor < units.length && collected < targetChars.length) {
      const unit = units[cursor]
      cursor += 1
      if (/^\s$/.test(unit.text || '')) continue
      ;(unit.rules || []).forEach((rule) => ruleKeys.add(rule))
      if (isArabicBaseLetter(unit.text)) collected += 1
    }
    ruleKeys.forEach((ruleKey) => {
      occurrences.push({
        ruleKey,
        verseKey: verse.key || '',
        wordIndex,
        globalWordIndex: wordOffset + wordIndex,
        word,
      })
    })
  })
  return occurrences
}

export function extractHeuristicOccurrencesForVerse(verse, wordOffset = 0) {
  const rawText = stripTajweedMarkup(verse?.arabic_tajweed || verse?.arabic || verse?.text || '')
  const rawWords = rawText ? rawText.split(/\s+/).filter(Boolean) : []
  const displayWords = tokenizeDisplayWords(rawText)
  const count = Math.max(rawWords.length, displayWords.length)
  const occurrences = []
  const addRule = (ruleKey, index) => {
    if (!ruleKey) return
    occurrences.push({
      ruleKey,
      verseKey: verse.key || '',
      wordIndex: index,
      globalWordIndex: wordOffset + index,
      word: displayWords[index] || rawWords[index] || '',
    })
  }

  for (let index = 0; index < count; index += 1) {
    const word = rawWords[index] || displayWords[index] || ''
    const nextWord = rawWords[index + 1] || displayWords[index + 1] || ''
    addRule(getNoonTanweenRuleKey(word, nextWord), index)
    addRule(getMeemSakinahRuleKey(word, nextWord), index)
    if (/[نم][\u0610-\u061A\u064B-\u065F\u0670]*[\u0651ّ]/u.test(word)) addRule('ghunnah', index)
    if (/[قطبجد][\u0610-\u061A\u064B-\u065F\u0670]*[\u0652ْ]/u.test(word)) addRule('qalqalah', index)
    if (/[\u0670\u06D6-\u06EDٱۥۦ]/u.test(word)) addRule('quranic_symbols', index)
  }
  return occurrences
}

export function extractOccurrencesForVerse(verse, wordOffset = 0) {
  const occurrences = [
    ...extractMarkedOccurrencesForVerse(verse, wordOffset),
    ...extractHeuristicOccurrencesForVerse(verse, wordOffset),
  ]
  const seen = new Set()
  return occurrences.filter((item) => {
    const signature = `${item.ruleKey}:${item.globalWordIndex}`
    if (seen.has(signature)) return false
    seen.add(signature)
    return true
  })
}

export function selectedRangeHasTajweedMetadata(verses = []) {
  return (Array.isArray(verses) ? verses : []).some((verse) => {
    if (verse?.arabic_tajweed && String(verse.arabic_tajweed).trim()) return true
    return extractOccurrencesForVerse(verse).length > 0
  })
}

/**
 * Build word-level expected Tajweed practice segments.
 */
export function buildExpectedTajweedSegments(verses = []) {
  const list = Array.isArray(verses) ? verses.filter(Boolean) : []
  const segments = []
  let wordOffset = 0

  list.forEach((verse) => {
    const plain = stripTajweedMarkup(verse?.arabic_tajweed || verse?.arabic || verse?.text || '')
    const words = tokenizeDisplayWords(plain)
    extractOccurrencesForVerse(verse, wordOffset).forEach((item) => {
      const meta = getPracticeRule(item.ruleKey)
      if (!meta) return
      segments.push({
        id: `${item.verseKey}:${item.wordIndex}:${item.ruleKey}`,
        verseKey: item.verseKey,
        wordIndex: item.wordIndex,
        globalWordIndex: item.globalWordIndex,
        word: item.word,
        ruleKey: item.ruleKey,
        label: meta.label,
        group: meta.group,
        colour: meta.colour,
        colourHex: meta.colourHex,
        expectedHoldBeats: meta.expectedHoldBeats,
        beginnerHint: meta.beginnerHint,
        holdHint: meta.holdHint,
        liveInstruction: meta.liveInstruction || meta.beginnerHint,
      })
    })
    wordOffset += words.length
  })

  return segments
}
