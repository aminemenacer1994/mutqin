import { MUSHAF_LAYOUT_MADANI_V2 } from '../mushaf/mushafLayouts.js'
import { loadMushafVersePageIndex } from '../mushaf/qpcMadaniVersePage.js'
import {
  ensureStackedQpcMadaniPageFonts,
  loadStackedQpcWordsForVerses,
  resolveStackedQpcWordInk,
} from '../mushaf/stackedQpcMadaniDisplay.js'
import { teacherCanonicalEvidenceWords } from './quranContent.js'

function versesForRange(range) {
  const surah = Number(range?.surah)
  const from = Number(range?.from)
  const to = Math.max(from, Number(range?.to || from))
  if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(from) || from < 1) return []
  const verses = []
  for (let ayah = from; ayah <= to; ayah++) {
    verses.push({ key: `${surah}:${ayah}`, number: ayah })
  }
  return verses
}

function fallbackPartsForAyah(ayah, canonicalWords) {
  return (canonicalWords || [])
    .filter((word) => Number(word.ayah) === ayah)
    .map((word) => ({
      text: word.text,
      fontFamily: '',
      className: 'teacher-recite-mushaf__word recitation-word-correct',
      title: '',
    }))
}

function buildAyahRowsFromCanonical(verses, canonicalWords) {
  return verses.map((verse) => ({
    ayah: verse.number,
    parts: fallbackPartsForAyah(verse.number, canonicalWords),
  }))
}

/**
 * Build mushaf ayah rows for teacher evidence.
 * Miss/status highlighting is intentionally not painted — passages render as clean mushaf text.
 *
 * @param {object} row Teacher evidence row (range, words, assignedRange, …)
 * @returns {Promise<{ ayahs: Array<{ ayah: number, parts: object[] }>, assignedAyahs: Array<{ ayah: number, parts: object[] }> }>}
 */
export async function buildTeacherReciteMushafView(row) {
  const performanceRange = row?.range?.surah && row?.range?.from
    ? row.range
    : null
  const assignedRange = row?.assignedRange?.surah && row?.assignedRange?.from
    ? row.assignedRange
    : null

  const performanceVerses = performanceRange ? versesForRange(performanceRange) : []
  const assignedVerses = assignedRange ? versesForRange(assignedRange) : []

  const [performanceCanonical, assignedCanonical] = await Promise.all([
    performanceRange
      ? teacherCanonicalEvidenceWords({ range: performanceRange, words: row?.words })
      : Promise.resolve([]),
    assignedRange
      ? teacherCanonicalEvidenceWords({ range: assignedRange, words: [] })
      : Promise.resolve([]),
  ])

  let ayahs = buildAyahRowsFromCanonical(performanceVerses, performanceCanonical)
  let assignedAyahs = buildAyahRowsFromCanonical(assignedVerses, assignedCanonical)

  try {
    const index = await loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2)
    if (performanceVerses.length) {
      ayahs = await paintMadaniAyahs(performanceVerses, index, performanceCanonical)
    }
    if (assignedVerses.length) {
      assignedAyahs = await paintMadaniAyahs(assignedVerses, index, assignedCanonical)
    }
  } catch {
    /* canonical fallback already set */
  }

  return { ayahs, assignedAyahs }
}

async function paintMadaniAyahs(verses, index, canonicalFallback) {
  const wordsByKey = await loadStackedQpcWordsForVerses(verses, index)
  const pages = new Set()
  for (const verse of verses) {
    for (const word of wordsByKey.get(verse.key) || []) {
      const page = Number(word?.page || word?.page_number)
      if (page > 0) pages.add(page)
    }
  }
  if (pages.size) await ensureStackedQpcMadaniPageFonts([...pages])

  return verses.map((verse) => {
    const mushafWords = wordsByKey.get(verse.key) || []
    if (!mushafWords.length) {
      return { ayah: verse.number, parts: fallbackPartsForAyah(verse.number, canonicalFallback) }
    }
    const parts = mushafWords.map((rawWord) => {
      const ink = resolveStackedQpcWordInk(rawWord)
      return {
        text: ink.text,
        fontFamily: ink.fontFamily,
        className: 'qpc-madani-word teacher-recite-mushaf__word recitation-word-correct',
        title: '',
      }
    })
    return { ayah: verse.number, parts }
  })
}
