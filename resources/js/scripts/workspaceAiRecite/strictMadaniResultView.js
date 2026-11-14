import { applyMadaniGlyphsToParts } from '../mushaf/madaniSnippetGlyphs.js'
import { isQcfPageGlyphText } from '../mushaf/qpcMadaniReadingTools.js'

/**
 * Analysis cards need readable joined Arabic. QCF page codepoints only look
 * correct inside the mushaf page face — outside it they often paint as
 * disconnected ornaments when a Unicode font wins the cascade.
 *
 * Strategy: keep Unicode `plainText` as the display source of truth. Never
 * wipe focus or weak-area rows when Madani glyphs are missing or partial.
 */
function unicodeText(part) {
  const plain = String(part?.plainText || '').trim()
  if (plain && !isQcfPageGlyphText(plain)) return plain
  const text = String(part?.text || '').trim()
  if (text && !isQcfPageGlyphText(text)) return text
  return plain || text
}

function asUnicodeParts(parts) {
  return (Array.isArray(parts) ? parts : []).map((part) => {
    const plain = unicodeText(part)
    return {
      ...part,
      plainText: plain,
      text: plain,
      madaniGlyph: false,
      fontFamily: part?.fontFamily && part?.madaniGlyph ? part.fontFamily : '',
    }
  }).filter((part) => part.text)
}

function madaniParts(parts, glyphs, options = {}) {
  if (!Array.isArray(parts) || !parts.length) return []
  const unicode = asUnicodeParts(parts)
  if (!unicode.length) return []
  if (!Array.isArray(glyphs) || !glyphs.length) return unicode

  const painted = applyMadaniGlyphsToParts(parts, glyphs, options)
  // Keep every original word. Madani metadata is optional enrichment only —
  // never drop a weak/focus entry because a page glyph failed to verify.
  return unicode.map((base, index) => {
    const paintedPart = painted[index] || parts[index] || base
    const glyphOk = paintedPart?.madaniGlyph === true
      && /^QCF2\d{3}$/.test(String(paintedPart.fontFamily || ''))
      && isQcfPageGlyphText(paintedPart.text)
    const plain = unicodeText({
      plainText: paintedPart?.plainText || base.plainText,
      text: base.text,
    }) || base.text
    if (!glyphOk) {
      return {
        ...base,
        plainText: plain,
        text: plain,
        madaniGlyph: false,
        fontFamily: '',
      }
    }
    return {
      ...base,
      ...paintedPart,
      plainText: plain,
      text: plain,
      glyphText: paintedPart.text,
      madaniGlyph: false,
      displayPreferUnicode: true,
    }
  }).filter((part) => part.text)
}

function paintWeakRow(row, glyphsByAyah = {}) {
  const sourceEntries = Array.isArray(row?.wordEntries)
    ? row.wordEntries
    : (Array.isArray(row?.words) ? row.words : [])
  const wordEntries = madaniParts(sourceEntries, glyphsByAyah[Number(row?.ayah)] || [])
  const fallbackLabel = String(row?.wordsLabel || '').trim()
  const wordsLabel = wordEntries.map((entry) => entry.plainText || entry.text).filter(Boolean).join(' · ')
    || fallbackLabel
  return {
    ...row,
    wordEntries,
    wordsLabel,
  }
}

function ensureWeakAreaItems(view) {
  const existing = Array.isArray(view?.infoArchitecture?.weakAreas?.items)
    ? view.infoArchitecture.weakAreas.items
    : []
  const withWords = existing.filter((row) => {
    const entries = Array.isArray(row?.wordEntries) ? row.wordEntries : []
    return entries.some((entry) => unicodeText(entry)) || String(row?.wordsLabel || '').trim()
  })
  if (withWords.length) return existing

  // If weak-area items were blanked, rebuild from focus ayah rows / weak spots
  // so the Weak Areas section never disappears after Madani hydration.
  const focusRows = Array.isArray(view?.focusAyahRows) ? view.focusAyahRows : []
  const weakSpotRows = Array.isArray(view?.weakSpotRows) ? view.weakSpotRows : []
  const recovered = []
  const seen = new Set()

  for (const row of [...weakSpotRows, ...focusRows]) {
    const ayah = Number(row?.ayah)
    if (!(ayah > 0) || seen.has(ayah)) continue
    const parts = Array.isArray(row?.wordEntries)
      ? row.wordEntries
      : (Array.isArray(row?.parts) ? row.parts.filter((part) => part?.weak || ['incorrect', 'partial', 'omitted', 'uncertain'].includes(String(part?.tone || ''))) : [])
    const wordEntries = asUnicodeParts(parts)
    if (!wordEntries.length && !String(row?.wordsLabel || '').trim()) continue
    seen.add(ayah)
    recovered.push({
      ayah,
      ayahLabel: row.ayahLabel || `Ayah ${ayah}`,
      wordsLabel: row.wordsLabel || wordEntries.map((entry) => entry.text).join(' · '),
      wordEntries: wordEntries.length
        ? wordEntries
        : asUnicodeParts([{ text: row.wordsLabel, tone: 'incorrect' }]),
    })
  }
  return recovered.length ? recovered : existing
}

export function withStrictMadaniResultGlyphs(view, glyphsByAyah = {}) {
  const focusAyahRows = (view?.focusAyahRows || []).map((row) => ({
    ...row,
    parts: madaniParts(row.parts, glyphsByAyah[Number(row.ayah)] || [], { contiguous: true }),
  }))
  const weakSpotRows = (view?.weakSpotRows || []).map((row) => paintWeakRow(row, glyphsByAyah))
  const weakItems = (view?.infoArchitecture?.weakAreas?.items || []).map((row) => paintWeakRow(row, glyphsByAyah))

  const nextView = {
    ...view,
    focusAyahRows,
    weakSpotRows,
    infoArchitecture: {
      ...(view?.infoArchitecture || {}),
      weakAreas: {
        ...(view?.infoArchitecture?.weakAreas || {}),
        items: weakItems,
        lead: view?.infoArchitecture?.weakAreas?.lead
          || (weakItems.length ? 'Words to review before moving on.' : ''),
      },
    },
  }

  const ensuredItems = ensureWeakAreaItems(nextView)
  if (ensuredItems !== nextView.infoArchitecture.weakAreas.items) {
    nextView.infoArchitecture = {
      ...nextView.infoArchitecture,
      weakAreas: {
        ...nextView.infoArchitecture.weakAreas,
        items: ensuredItems,
        lead: nextView.infoArchitecture.weakAreas.lead
          || (ensuredItems.length ? 'Words to review before moving on.' : ''),
      },
    }
  }

  return nextView
}
