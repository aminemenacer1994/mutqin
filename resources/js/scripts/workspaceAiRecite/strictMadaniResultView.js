import { applyMadaniGlyphsToParts } from '../mushaf/madaniSnippetGlyphs.js'
import { isQcfPageGlyphText } from '../mushaf/qpcMadaniReadingTools.js'

function madaniParts(parts, glyphs, options = {}) {
  if (!Array.isArray(parts) || !parts.length) return []
  const painted = applyMadaniGlyphsToParts(parts, glyphs, options)
  return painted.map((part) => {
    const glyphOk = part.madaniGlyph === true
      && /^QCF2\d{3}$/.test(String(part.fontFamily || ''))
      && isQcfPageGlyphText(part.text)
    if (glyphOk) return part
    const plain = String(part.plainText || part.text || '').trim()
    return {
      ...part,
      text: plain,
      plainText: plain,
      madaniGlyph: false,
      fontFamily: '',
    }
  }).filter((part) => part.text)
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
