/**
 * Pure Mushaf Madani v2 glyph mapping. No network and no Unicode fallback.
 */
import { isQcfPageGlyphText } from '../mushaf/qpcMadaniReadingTools.js'
import { qcfFontFamily } from '../mushaf/qcfFontLoader.js'

export function stripMadaniGlyphBreaks(text) {
  return String(text || '').replace(/<br\s*\/?>/gi, '').replace(/[\r\n]+/g, '')
}

function pageFontFamily(raw) {
  const fromWord = String(raw?.fontFamily || '').trim()
  if (fromWord) return fromWord
  const page = Number(raw?.page || raw?.page_number)
  if (Number.isFinite(page) && page > 0) return qcfFontFamily(page)
  return ''
}

/**
 * Replace a painted Unicode word list with Madani page glyphs in the same order.
 * Returns [] when there are no page glyphs, so Uthmani text is never shown instead.
 *
 * @param {object[]} paintedWords
 * @param {object[]} glyphs
 */
export function overlayMadaniGlyphs(paintedWords, glyphs) {
  const ink = (Array.isArray(glyphs) ? glyphs : []).filter((glyph) => (
    glyph?.madaniGlyph && glyph.fontFamily && glyph.text
  ))
  if (!ink.length) return []
  return ink.map((glyph, index) => {
    const painted = paintedWords?.[index] || {}
    return {
      ...painted,
      text: glyph.text,
      fontFamily: glyph.fontFamily,
      madaniGlyph: true,
      state: painted.state || 'unassessed',
      labelKey: painted.labelKey || 'dashboard.word_unassessed',
    }
  })
}

/**
 * Turn one ayah's Madani page words into display parts.
 * Words that are not QCF page glyphs are dropped.
 *
 * @param {object[]} mushafWords
 * @param {{ ayah: number, statusMap?: Map<string, object>|null, paintStatus?: boolean, classNameFor?: Function }} options
 */
export function madaniPartsFromMushafWords(mushafWords, options = {}) {
  const ayah = Number(options.ayah)
  const paintStatus = options.paintStatus !== false
  const statusMap = options.statusMap || null
  const ordered = [...(mushafWords || [])].sort((left, right) => {
    const leftPos = Number(left?.word ?? left?.position ?? 0)
    const rightPos = Number(right?.word ?? right?.position ?? 0)
    return leftPos - rightPos
  })

  const parts = []
  let glyphIndex = 0
  for (const raw of ordered) {
    const text = stripMadaniGlyphBreaks(raw?.text)
    if (!isQcfPageGlyphText(text)) continue
    const page = Number(raw?.page || raw?.page_number)
    const fontFamily = pageFontFamily(raw)
    if (!fontFamily) continue
    const statusWord = statusMap?.get(`${ayah}:${glyphIndex}`) || {}
    const word = {
      text,
      fontFamily,
      madaniGlyph: true,
      ayah,
      word_index: glyphIndex,
      page: Number.isFinite(page) && page > 0 ? page : null,
      status: paintStatus ? (statusWord.status || 'unknown') : 'unknown',
      type: statusWord.type || null,
      detected: statusWord.detected || null,
    }
    const start = Number(statusWord.start ?? statusWord.start_time)
    const end = Number(statusWord.end ?? statusWord.end_time)
    if (Number.isFinite(start) && start >= 0) word.start = start
    if (Number.isFinite(end) && end >= (word.start ?? 0)) word.end = end
    if (typeof options.classNameFor === 'function') {
      word.className = options.classNameFor(word, statusWord)
    }
    parts.push(word)
    glyphIndex += 1
  }
  return parts
}
