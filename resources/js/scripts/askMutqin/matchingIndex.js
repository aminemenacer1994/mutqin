import { getQuranEdition } from '../lib/quranApis.js'
import { SURAH_NAMES } from '../engine/hifz_session_engine.js'
import { tokenizeForMatch } from '../memorisationDetection/speechMatch.js'
import { stripLeadingBasmalaTokens } from './matchAyah.js'

let indexPromise = null

function surahDisplayName(surah, englishName) {
  const id = Number(surah || 0)
  return englishName || SURAH_NAMES[id - 1] || `Surah ${id}`
}

function ayahWordsForMatch(surah, text) {
  const words = tokenizeForMatch(text)
  if (Number(surah) === 1) return words
  return stripLeadingBasmalaTokens(words)
}

export function buildAskMutqinMatchingIndex(surahs = []) {
  const index = []
  for (const surah of Array.isArray(surahs) ? surahs : []) {
    const chapter = Number(surah?.number || 0)
    if (chapter < 1 || chapter > 114) continue
    const name = surahDisplayName(chapter, surah?.englishName)
    for (const ayah of surah?.ayahs || []) {
      const number = Number(ayah?.numberInSurah || 0)
      if (number < 1) continue
      const arabic = String(ayah?.text || '')
      const words = ayahWordsForMatch(chapter, arabic)
      if (!words.length) continue
      index.push({
        key: `${chapter}:${number}`,
        surah: chapter,
        ayah: number,
        surahName: name,
        arabic,
        words,
      })
    }
  }
  return index
}

export function resetAskMutqinMatchingIndexCache() {
  indexPromise = null
}

/** Cache one AlQuran uthmani edition for matching. Canonical text stays API-sourced. */
export function parseQuranEditionSurahs(response) {
  return response?.data?.data?.surahs
    || response?.data?.surahs
    || response?.surahs
    || []
}

export function buildAskMutqinMatchingIndexFromEntries(entries = []) {
  const grouped = new Map()
  for (const entry of Array.isArray(entries) ? entries : []) {
    const chapter = Number(entry?.surah || entry?.number || 0)
    const ayah = Number(entry?.ayah || entry?.numberInSurah || 0)
    const arabic = String(entry?.arabic || entry?.text || '')
    if (chapter < 1 || ayah < 1 || !arabic) continue
    if (!grouped.has(chapter)) {
      grouped.set(chapter, {
        number: chapter,
        englishName: entry.surahName || entry.englishName || '',
        ayahs: [],
      })
    }
    grouped.get(chapter).ayahs.push({ numberInSurah: ayah, text: arabic })
  }
  return buildAskMutqinMatchingIndex([...grouped.values()])
}

export function loadAskMutqinMatchingIndex(seedEntries = []) {
  const seeded = buildAskMutqinMatchingIndexFromEntries(seedEntries)
  if (seeded.length) return Promise.resolve(seeded)
  if (indexPromise) return indexPromise
  indexPromise = getQuranEdition('quran-uthmani')
    .then((response) => buildAskMutqinMatchingIndex(parseQuranEditionSurahs(response)))
    .catch((error) => {
      indexPromise = null
      throw error
    })
  return indexPromise
}
