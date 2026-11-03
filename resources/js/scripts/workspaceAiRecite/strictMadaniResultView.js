import { applyMadaniGlyphsToParts } from '../mushaf/madaniSnippetGlyphs.js'
import { isQcfPageGlyphText } from '../mushaf/qpcMadaniReadingTools.js'

function madaniParts(parts, glyphs, options = {}) {
  if (!Array.isArray(parts) || !parts.length) return []
  const painted = applyMadaniGlyphsToParts(parts, glyphs, options)
  // A partial row could silently mix Madani glyphs with Unicode Uthmani text.
  // Keep the ayah label, but hide its Arabic until every word has page glyphs.
  return painted.every((part) => part.madaniGlyph === true
    && /^QCF2\d{3}$/.test(String(part.fontFamily || ''))
    && isQcfPageGlyphText(part.text)) ? painted : []
}

export function withStrictMadaniResultGlyphs(view, glyphsByAyah = {}) {
  const focusAyahRows = (view?.focusAyahRows || []).map((row) => ({
    ...row,
    parts: madaniParts(row.parts, glyphsByAyah[Number(row.ayah)] || [], { contiguous: true }),
  }))
  const paintWeakRow = (row) => {
    const wordEntries = madaniParts(row.wordEntries, glyphsByAyah[Number(row.ayah)] || [])
    return {
      ...row,
      wordEntries,
      wordsLabel: '',
    }
  }

  return {
    ...view,
    focusAyahRows,
    weakSpotRows: (view?.weakSpotRows || []).map(paintWeakRow),
    infoArchitecture: {
      ...(view?.infoArchitecture || {}),
      weakAreas: {
        ...(view?.infoArchitecture?.weakAreas || {}),
        items: (view?.infoArchitecture?.weakAreas?.items || []).map(paintWeakRow),
      },
    },
  }
}
