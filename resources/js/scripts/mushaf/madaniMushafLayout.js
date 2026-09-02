import { surahNameGlyphText } from './madaniPageLayout.js'
import { qcfFontFamily } from './qcfFontLoader.js'

export const MADANI_MUSHAF_LINES_PER_PAGE = 15

/** Map backend line_type to frontend line.type */
export function normalizeQulLineType(lineType = '') {
  const t = String(lineType || '').toLowerCase()
  if (t === 'surah_name') return 'surah_name'
  if (t === 'basmala' || t === 'basmallah' || t === 'bismillah') return 'basmala'
  return 'ayah'
}

/**
 * Build render-ready page model from Mutqin API payload (QUL-authoritative lines).
 */
export function buildMadaniMushafPageModel(apiPage = {}, { tajweed = false } = {}) {
  const pageNumber = Number(apiPage.pageNumber) || 1
  const fontFamily = qcfFontFamily(pageNumber, { tajweed })

  const lines = (apiPage.lines || []).map((line, index) => {
    const type = normalizeQulLineType(line.lineType || line.type)
    const lineNumber = Number(line.lineNumber) || index + 1
    const words = (line.words || []).map(word => normalizeMadaniMushafWord(word))

    return {
      lineNumber,
      type,
      isCentered: !!(line.isCentered ?? line.is_centered),
      surahNumber: line.surahNumber ?? line.surah_number ?? null,
      chapterId: line.surahNumber ?? line.surah_number ?? null,
      glyphText: type === 'surah_name'
        ? surahNameGlyphText(line.surahNumber ?? line.surah_number ?? apiPage.primarySurahNumber)
        : '',
      words,
      key: `qul-${pageNumber}-${lineNumber}-${type}-${index}`,
      fontFamily,
    }
  })

  return {
    pageNumber,
    juzNumber: apiPage.juzNumber ?? null,
    hizbNumber: apiPage.hizbNumber ?? null,
    primaryChapterId: apiPage.primarySurahNumber ?? null,
    fontFamily,
    tajweed: !!tajweed,
    lines,
    verseKeys: [...new Set(
      lines.flatMap(l => l.words.map(w => w.verseKey).filter(Boolean))
    )],
  }
}

export function normalizeMadaniMushafWord(word = {}) {
  const verseKey = String(word.verseKey || word.verse_key || '')
  const charType = String(word.charType || word.char_type || 'word')
  const textUthmani = String(word.textUthmani || word.text_uthmani || '').trim()
  const glyph = String(word.glyph || word.codeV2 || word.code_v2 || '')
  const textQpc = String(word.textQpc || word.text_qpc_hafs || word.text || '')
  return {
    id: word.id ?? null,
    wordKey: word.wordKey || word.word_key || '',
    verseKey,
    position: Number(word.position) || 0,
    charType,
    isEnd: charType === 'end',
    codeV2: glyph,
    textQpc: textUthmani || textQpc || glyph,
    textUthmani,
    surahNumber: Number(word.surahNumber || word.surah_number) || 0,
    ayahNumber: Number(word.ayahNumber || word.ayah_number) || 0,
  }
}

/** True when text is QCF PUA / presentation slot (not readable without page font). */
export function isQcfSlotText(text = '') {
  const value = String(text || '').trim()
  if (!value) return false
  for (const char of value) {
    const cp = char.codePointAt(0) || 0
    if (cp >= 0xE000 && cp <= 0xF8FF) return true
    if (cp >= 0xFB50 && cp <= 0xFDFF) return true
    if (cp >= 0xFE70 && cp <= 0xFEFF) return true
  }
  return false
}

/**
 * Merge readable Uthmani text from Quran.com page verses into a QUL page payload.
 */
export function enrichMadaniMushafPageWithUnicode(apiPage = {}, verses = []) {
  const uthmaniByKey = new Map()
  for (const verse of verses || []) {
    const verseKey = String(verse?.verse_key || verse?.key || '').trim()
    for (const word of verse?.words || []) {
      const text = String(word?.text_uthmani || word?.text || '').trim()
      if (!text) continue
      const wordKey = String(word?.word_key || word?.wordKey || '').trim()
      if (wordKey) uthmaniByKey.set(wordKey, text)
      const position = Number(word?.position) || 0
      if (verseKey && position > 0) {
        uthmaniByKey.set(`${verseKey}:${position}`, text)
      }
    }
  }

  const lines = (apiPage.lines || []).map((line) => ({
    ...line,
    words: (line.words || []).map((word) => {
      const wordKey = String(word?.wordKey || word?.word_key || '').trim()
      const verseKey = String(word?.verseKey || word?.verse_key || '').trim()
      const position = Number(word?.position) || 0
      const fromKey = (wordKey && uthmaniByKey.get(wordKey))
        || (verseKey && position > 0 ? uthmaniByKey.get(`${verseKey}:${position}`) : '')
      if (!fromKey) return word
      return {
        ...word,
        textUthmani: fromKey,
        textQpc: fromKey,
      }
    }),
  }))

  return { ...apiPage, lines }
}

export function madaniMushafPagesToPrefetch(pageNumber, { spread = false } = {}) {
  const page = Math.max(1, Math.min(604, Number(pageNumber) || 1))
  const pages = new Set([page])
  if (spread) {
    const right = page % 2 === 1 ? page : page - 1
    const left = right + 1
    if (right >= 1) pages.add(right)
    if (left <= 604) pages.add(left)
    if (right - 2 >= 1) pages.add(right - 2)
    if (left + 1 <= 604) pages.add(left + 1)
  } else {
    if (page > 1) pages.add(page - 1)
    if (page < 604) pages.add(page + 1)
  }
  return [...pages].sort((a, b) => a - b)
}

const DECORATIVE_LINE_TYPES = new Set(['surah_name', 'basmala'])

function decorativeLineSort(a, b) {
  const order = { surah_name: 0, basmala: 1, basmala_ayah: 2, ayah: 3, empty: 4 }
  const diff = (order[a?.type] ?? 5) - (order[b?.type] ?? 5)
  if (diff !== 0) return diff
  return (Number(a?.lineNumber) || 0) - (Number(b?.lineNumber) || 0)
}

/** Merge surah header / basmala rows from Quran.com layout when QUL rows omit them. */
export function mergeMadaniMushafDecorativeLines(qulLines = [], decorativeLines = []) {
  const merged = [...(Array.isArray(qulLines) ? qulLines : [])]
  const occupied = new Set(
    merged.map(line => `${Number(line?.lineNumber) || 0}:${String(line?.type || '')}`)
  )
  for (const line of Array.isArray(decorativeLines) ? decorativeLines : []) {
    if (!DECORATIVE_LINE_TYPES.has(line?.type)) continue
    const slot = `${Number(line.lineNumber) || 0}:${String(line.type || '')}`
    if (occupied.has(slot)) continue
    const lineNumber = Number(line.lineNumber) || 0
    const ayahOnRow = merged.some(other => (
      Number(other?.lineNumber) === lineNumber
      && (other?.type === 'ayah' || other?.type === 'basmala_ayah')
      && Array.isArray(other?.words)
      && other.words.length > 0
    ))
    if (ayahOnRow && line.type === 'basmala') continue
    merged.push({
      ...line,
      key: line.key || `dec-${lineNumber}-${line.type}`,
    })
    occupied.add(slot)
  }
  return merged.sort(decorativeLineSort)
}

/** Collapse to exactly 15 printable rows (one DOM node per Madani line slot). */
export function consolidateMadaniMushafLinesToGrid(lines = [], linesPerPage = MADANI_MUSHAF_LINES_PER_PAGE) {
  const rows = new Map()
  for (const line of Array.isArray(lines) ? lines : []) {
    const lineNumber = Math.max(1, Math.min(linesPerPage, Number(line?.lineNumber) || 0))
    if (!lineNumber) continue
    const existing = rows.get(lineNumber)
    if (!existing) {
      rows.set(lineNumber, {
        ...line,
        lineNumber,
        words: [...(line.words || [])],
        key: line.key || `mm-row-${lineNumber}-${line.type || 'ayah'}`,
      })
      continue
    }
    if (DECORATIVE_LINE_TYPES.has(line.type)) {
      rows.set(lineNumber, {
        ...existing,
        ...line,
        lineNumber,
        words: existing.words?.length ? existing.words : [...(line.words || [])],
        key: existing.key || line.key || `mm-row-${lineNumber}-${line.type}`,
      })
      continue
    }
    existing.words = [...(existing.words || []), ...(line.words || [])]
    if (existing.type === 'empty' && line.type !== 'empty') {
      existing.type = line.type
    }
  }

  const result = []
  for (let lineNumber = 1; lineNumber <= linesPerPage; lineNumber += 1) {
    result.push(rows.get(lineNumber) || {
      lineNumber,
      type: 'empty',
      words: [],
      key: `mm-empty-${lineNumber}`,
    })
  }
  return result
}
