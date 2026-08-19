/** Word-by-word gloss helpers (Quran.com boundaries vs display tokenization). */

export function normalizeWordForMeaningLookup(text) {
  return String(text || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u06DF\u06E0\u06E3\u06DD\u06DE\u06E9\u25CC]/g, '')
    .replace(/[\u06D4\u06DB\u061F\u061B\uFD3E\uFD3F\uFEFF]/g, '')
    .replace(/[ٱ]/g, 'ا')
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildVerseWordsFromWbw(wbwWords = [], fallbackArabicWords = []) {
  if (!Array.isArray(wbwWords) || !wbwWords.length) {
    return (fallbackArabicWords || []).map((ar) => ({
      ar,
      en: '',
      transliteration: '',
      audio: null,
    }))
  }
  return wbwWords.map((wbw, index) => ({
    ar: wbw.ar || fallbackArabicWords[index] || '',
    en: wbw.en || '',
    transliteration: wbw.transliteration || '',
    audio: wbw.audio || null,
  }))
}

export function resolveWordGlossFromVerse(verse, wordText, index = 0) {
  const words = Array.isArray(verse?.words) ? verse.words : []
  const key = normalizeWordForMeaningLookup(wordText)

  if (key) {
    for (const word of words) {
      const candidate = normalizeWordForMeaningLookup(word?.ar)
      if (candidate && candidate === key) {
        return String(word.en || '').trim()
      }
    }
  }

  return String(words[index]?.en || '').trim()
}

export function versesHaveWordMeanings(verses = []) {
  let total = 0
  let withEn = 0
  for (const verse of verses) {
    for (const word of verse?.words || []) {
      if (!String(word?.ar || '').trim()) continue
      total += 1
      if (String(word?.en || '').trim()) withEn += 1
    }
  }
  return total > 0 && withEn === total
}

export function applyWordByWordMeaningsToVerses(verses = [], wbwByNumber = new Map()) {
  if (!(wbwByNumber instanceof Map) || !wbwByNumber.size) return verses
  return verses.map((verse) => {
    const verseNumber = Number(verse?.numberInSurah ?? verse?.number ?? 0)
    const wbwWords = wbwByNumber.get(verseNumber) || []
    if (!wbwWords.length) return verse
    return {
      ...verse,
      words: wbwWords.map((wbw) => ({
        ar: wbw.ar || '',
        en: wbw.en || '',
        transliteration: wbw.transliteration || '',
        audio: wbw.audio || null,
      })),
    }
  })
}
