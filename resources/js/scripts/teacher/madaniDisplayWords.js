/**
 * Teacher and learner ayah snippets paint Mushaf Madani v2 page glyphs only.
 * Unicode Uthmani text is a different script and must not be substituted.
 */
import { MUSHAF_LAYOUT_MADANI_V2 } from '../mushaf/mushafLayouts.js'
import { loadMushafVersePageIndex } from '../mushaf/qpcMadaniVersePage.js'
import {
  ensureStackedQpcMadaniPageFonts,
  loadStackedQpcWordsForVerses,
} from '../mushaf/stackedQpcMadaniDisplay.js'
import { teacherCanonicalEvidenceWords } from './quranContent.js'
import { madaniPartsFromMushafWords } from './madaniGlyphParts.js'

export { madaniPartsFromMushafWords, overlayMadaniGlyphs } from './madaniGlyphParts.js'

function versesForRange(range) {
  const surah = Number(range?.surah)
  const from = Number(range?.from)
  const to = Math.max(from, Number(range?.to || from))
  if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(from) || from < 1) return []
  const verses = []
  for (let ayah = from; ayah <= to; ayah += 1) {
    verses.push({ key: `${surah}:${ayah}`, number: ayah })
  }
  return verses
}

function statusKey(ayah, index) {
  return `${Number(ayah)}:${Number(index)}`
}

function statusMapFromCanonical(words, enabled) {
  if (!enabled) return null
  const map = new Map()
  for (const word of words || []) {
    const ayah = Number(word?.ayah)
    const index = Number(word?.word_index)
    if (!Number.isInteger(ayah) || ayah < 1 || !Number.isInteger(index) || index < 0) continue
    map.set(statusKey(ayah, index), word)
  }
  return map
}

async function paintRange(range, statusMap, paintStatus) {
  const verses = versesForRange(range)
  if (!verses.length) return []
  const index = await loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2)
  const wordsByKey = await loadStackedQpcWordsForVerses(verses, index)
  const pages = new Set()
  for (const verse of verses) {
    for (const word of wordsByKey.get(verse.key) || []) {
      const page = Number(word?.page || word?.page_number)
      if (page > 0) pages.add(page)
    }
  }
  if (pages.size) await ensureStackedQpcMadaniPageFonts([...pages])

  return verses.flatMap((verse) => madaniPartsFromMushafWords(wordsByKey.get(verse.key) || [], {
    ayah: verse.number,
    statusMap,
    paintStatus,
  }))
}

/**
 * Load Mushaf Madani v2 glyphs for a surah/ayah range.
 * Returns [] when the page glyphs cannot be painted — never Uthmani stand-ins.
 *
 * @param {{ range?: object, words?: object[] }} evidence
 * @param {{ paintStatus?: boolean }} [options]
 */
export async function loadTeacherMadaniWords(evidence = {}, options = {}) {
  const paintStatus = options.paintStatus !== false
  const range = evidence?.range || {}
  let statusMap = null
  if (paintStatus) {
    try {
      const canonical = await teacherCanonicalEvidenceWords(evidence)
      statusMap = statusMapFromCanonical(canonical, true)
    } catch {
      statusMap = new Map()
    }
  }
  try {
    return await paintRange(range, statusMap, paintStatus)
  } catch {
    return []
  }
}

/**
 * One ayah, for difficulty rows and short callouts.
 * @param {number|string} surah
 * @param {number|string} ayah
 */
export async function loadTeacherMadaniAyah(surah, ayah) {
  return loadTeacherMadaniWords({
    range: { surah: Number(surah), from: Number(ayah), to: Number(ayah) },
    words: [],
  }, { paintStatus: false })
}
