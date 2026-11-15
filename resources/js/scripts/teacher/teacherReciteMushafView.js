import { MUSHAF_LAYOUT_MADANI_V2 } from '../mushaf/mushafLayouts.js'
import { loadMushafVersePageIndex } from '../mushaf/qpcMadaniVersePage.js'
import { getCachedMadaniPageLeaf } from '../mushaf/qpcMadaniPageData.js'
import { isQcfPageGlyphText } from '../mushaf/qpcMadaniReadingTools.js'
import {
  ensureStackedQpcMadaniPageFonts,
  loadStackedQpcWordsForVerses,
  resolveStackedQpcPageFontFamily,
} from '../mushaf/stackedQpcMadaniDisplay.js'
import { madaniPartsFromMushafWords } from './madaniGlyphParts.js'
import { teacherCanonicalEvidenceWords } from './quranContent.js'
import { wordReviewClass } from './wordReviewClass.js'

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

function statusByAyahIndex(canonicalWords = []) {
  const map = new Map()
  for (const word of canonicalWords) {
    const ayah = Number(word?.ayah)
    const index = Number(word?.word_index)
    if (!Number.isInteger(ayah) || ayah < 1 || !Number.isInteger(index) || index < 0) continue
    map.set(`${ayah}:${index}`, word)
  }
  return map
}

/**
 * Build mushaf ayah rows for teacher evidence.
 * Performance ayahs paint persisted AI word statuses; assigned reference text stays uncoloured.
 * Only Mushaf Madani v2 page glyphs are returned.
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
  const rangesMatch = performanceRange
    && assignedRange
    && performanceRange.surah === assignedRange.surah
    && performanceRange.from === assignedRange.from
    && Number(performanceRange.to || performanceRange.from) === Number(assignedRange.to || assignedRange.from)

  const performanceVerses = performanceRange ? versesForRange(performanceRange) : []
  const assignedVerses = assignedRange && !rangesMatch ? versesForRange(assignedRange) : []

  const [performanceCanonical, assignedCanonical] = await Promise.all([
    performanceRange
      ? teacherCanonicalEvidenceWords({ range: performanceRange, words: row?.words })
      : Promise.resolve([]),
    assignedVerses.length
      ? teacherCanonicalEvidenceWords({ range: assignedRange, words: [] })
      : Promise.resolve([]),
  ])

  let ayahs = []
  let assignedAyahs = []

  try {
    const index = await loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2)
    if (performanceVerses.length) {
      ayahs = await paintMadaniAyahs(performanceVerses, index, performanceCanonical, true)
    }
    if (assignedVerses.length) {
      assignedAyahs = await paintMadaniAyahs(assignedVerses, index, assignedCanonical, false)
    }
  } catch {
    ayahs = []
    assignedAyahs = []
  }

  return { ayahs, assignedAyahs }
}

async function paintMadaniAyahs(verses, index, canonicalFallback, paintStatus = true) {
  const wordsByKey = await loadStackedQpcWordsForVerses(verses, index)
  const statusMap = paintStatus ? statusByAyahIndex(canonicalFallback) : null
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
    const parts = madaniPartsFromMushafWords(mushafWords, {
      ayah: verse.number,
      statusMap,
      paintStatus,
      classNameFor(word, statusWord) {
        const statusClass = paintStatus ? wordReviewClass(statusWord) : ''
        return ['qpc-madani-word', 'teacher-recite-mushaf__word', statusClass].filter(Boolean).join(' ')
      },
    }).map((word) => ({
      text: word.text,
      fontFamily: word.fontFamily,
      madaniGlyph: true,
      className: word.className,
      title: '',
      ayah: word.ayah,
      word_index: word.word_index,
      start: Number.isFinite(word.start) ? word.start : null,
      end: Number.isFinite(word.end) ? word.end : null,
    }))
    return parts.length ? { ayah: verse.number, parts } : null
  }).filter(Boolean)
}

function assessedReviewClass(statusWord = {}) {
  const status = String(
    statusWord?.status
    || statusWord?.visual_status
    || statusWord?.visualStatus
    || 'unknown'
  ).toLowerCase()
  if (!status || ['unknown', 'pending', 'unassessed', 'gray', 'grey', 'notattempted', 'not_attempted'].includes(status)) {
    return ''
  }
  return wordReviewClass(statusWord)
}

/**
 * Playback lines for one range. Mushaf Madani v2 page glyphs only, in printed
 * line order, including the verse-end glyph that carries the ayah number.
 * Uthmani text is never returned.
 *
 * @param {object} row
 * @returns {Promise<Array<{ id: string, centered: boolean, parts: object[] }>>}
 */
export async function buildTeacherPlaybackMushafLines(row) {
  const range = row?.range?.surah && row?.range?.from ? row.range : null
  const verses = range ? versesForRange(range) : []
  if (!verses.length) return []

  const [index, canonical] = await Promise.all([
    loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2),
    teacherCanonicalEvidenceWords({ range, words: row?.words || [] }),
  ])
  const wordsByKey = await loadStackedQpcWordsForVerses(verses, index)
  const pages = new Set()
  const maxPosition = new Map()
  for (const words of wordsByKey.values()) {
    for (const word of words) {
      const page = Number(word?.page || word?.page_number)
      if (page > 0) pages.add(page)
      const ayah = Number(word?.ayah)
      const position = Number(word?.word ?? word?.position)
      if (ayah > 0 && position > (maxPosition.get(ayah) || 0)) maxPosition.set(ayah, position)
    }
  }
  if (pages.size) await ensureStackedQpcMadaniPageFonts([...pages])

  const statusMap = statusByAyahIndex(canonical)
  const lines = new Map()
  for (const verse of verses) {
    const words = [...(wordsByKey.get(verse.key) || [])].sort((left, right) => {
      return Number(left?.word ?? left?.position) - Number(right?.word ?? right?.position)
    })
    for (const raw of words) {
      const text = String(raw?.text || '').replace(/<br\s*\/?>/gi, '').trim()
      if (!isQcfPageGlyphText(text)) continue
      const page = Number(raw?.page || raw?.page_number)
      const lineNumber = Number(raw?.line || raw?.line_number)
      const fontFamily = resolveStackedQpcPageFontFamily(page, raw)
      if (!fontFamily || !Number.isFinite(lineNumber) || lineNumber < 1) continue
      const ayah = Number(raw?.ayah || verse.number)
      const position = Number(raw?.word ?? raw?.position)
      const isEnd = position > 0 && position === maxPosition.get(ayah)
      const wordIndex = position > 0 ? position - 1 : 0
      const statusWord = isEnd ? {} : (statusMap.get(`${ayah}:${wordIndex}`) || {})
      const leaf = getCachedMadaniPageLeaf(page)
      const meta = (leaf?.page?.lines || []).find((line) => Number(line?.line_number) === lineNumber)
      const id = `${page}:${lineNumber}`
      if (!lines.has(id)) {
        lines.set(id, {
          id,
          centered: Number(meta?.is_centered) === 1 || meta?.centered === true,
          parts: [],
        })
      }
      const start = Number(statusWord.start ?? statusWord.start_time)
      const end = Number(statusWord.end ?? statusWord.end_time)
      lines.get(id).parts.push({
        text,
        fontFamily,
        ayah,
        position,
        word_index: isEnd ? null : wordIndex,
        isEnd,
        className: [
          'qpc-madani-word',
          'teacher-recite-mushaf__word',
          isEnd ? 'is-ayah-end' : assessedReviewClass(statusWord),
        ].filter(Boolean).join(' '),
        start: Number.isFinite(start) && start >= 0 ? start : null,
        end: Number.isFinite(end) && end >= (Number.isFinite(start) ? start : 0) ? end : null,
      })
    }
  }

  return [...lines.values()].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }))
}
