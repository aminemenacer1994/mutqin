import { normaliseMadaniRecitationVisualStatus } from '../mushaf/qpcMadaniRecitationDom.js'
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

function statusMapFromWords(words = []) {
  const map = new Map()
  for (const word of words) {
    const ayah = Number(word?.ayah)
    const index = Number(word?.word_index)
    if (!Number.isInteger(ayah) || ayah < 1 || !Number.isInteger(index) || index < 0) continue
    map.set(`${ayah}:${index}`, word)
  }
  return map
}

function wordIndexFromMushafWord(rawWord = {}) {
  const location = String(rawWord?.location || '')
  const parts = location.split(':')
  if (parts.length >= 3) {
    const position = Number(parts[2])
    if (Number.isInteger(position) && position > 0) return position - 1
  }
  const position = Number(rawWord?.word)
  return Number.isInteger(position) && position > 0 ? position - 1 : 0
}

function recitationClass(statusEntry) {
  const visual = normaliseMadaniRecitationVisualStatus(statusEntry || {}, false)
  if (visual === 'notAttempted') return 'recitation-word-pending'
  if (visual === 'omitted') return 'recitation-word-omitted'
  return `recitation-word-${visual}`
}

function fallbackPartsForAyah(ayah, canonicalWords) {
  return (canonicalWords || [])
    .filter((word) => Number(word.ayah) === ayah)
    .map((word) => ({
      text: word.text,
      fontFamily: '',
      className: `teacher-recite-mushaf__word ${recitationClass(word)}`,
      title: word.detected || '',
    }))
}

function buildAyahRowsFromCanonical(verses, canonicalWords) {
  return verses.map((verse) => ({
    ayah: verse.number,
    parts: fallbackPartsForAyah(verse.number, canonicalWords),
  }))
}

/**
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

  const performanceStatuses = statusMapFromWords(performanceCanonical)
  const assignedStatuses = statusMapFromWords(assignedCanonical)

  let ayahs = buildAyahRowsFromCanonical(performanceVerses, performanceCanonical)
  let assignedAyahs = buildAyahRowsFromCanonical(assignedVerses, assignedCanonical)

  try {
    const index = await loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2)
    if (performanceVerses.length) {
      ayahs = await paintMadaniAyahs(performanceVerses, index, performanceStatuses, performanceCanonical)
    }
    if (assignedVerses.length) {
      assignedAyahs = await paintMadaniAyahs(assignedVerses, index, assignedStatuses, assignedCanonical, true)
    }
  } catch {
    /* canonical fallback already set */
  }

  return { ayahs, assignedAyahs }
}

async function paintMadaniAyahs(verses, index, statusMap, canonicalFallback, neutral = false) {
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
      const wordIndex = wordIndexFromMushafWord(rawWord)
      const status = statusMap.get(`${verse.number}:${wordIndex}`)
      const ink = resolveStackedQpcWordInk(rawWord)
      const visual = neutral || !status
        ? 'recitation-word-correct'
        : recitationClass(status)
      return {
        text: ink.text,
        fontFamily: ink.fontFamily,
        className: `qpc-madani-word teacher-recite-mushaf__word ${visual}`,
        title: status?.detected || '',
      }
    })
    return { ayah: verse.number, parts }
  })
}
