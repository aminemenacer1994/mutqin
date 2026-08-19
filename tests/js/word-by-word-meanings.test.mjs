import assert from 'node:assert/strict'
import {
  buildVerseWordsFromWbw,
  normalizeWordForMeaningLookup,
  resolveWordGlossFromVerse,
  versesHaveWordMeanings,
  applyWordByWordMeaningsToVerses,
} from '../../resources/js/scripts/wordByWordMeanings.js'

// Al-Baqarah 2:2 — alquran.cloud splits pause marks (ۛ) into separate tokens; Quran.com attaches them.
const wbwWords = [
  { ar: 'ذَٰلِكَ', en: 'That' },
  { ar: 'ٱلْكِتَـٰبُ', en: 'the Book' },
  { ar: 'لَا', en: 'no' },
  { ar: 'رَيْبَ ۛ', en: 'doubt' },
  { ar: 'فِيهِ ۛ', en: 'in it' },
  { ar: 'هُدًۭى', en: 'Guidance' },
  { ar: 'لِّلْمُتَّقِينَ', en: 'for the God-fearing' },
]

const legacyWords = wbwWords.flatMap((word) => {
  const parts = String(word.ar).split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return [{ ar: word.ar, en: word.en }]
  }
  return parts.map((part, index) => ({
    ar: part,
    en: index === 0 ? word.en : '',
  }))
})

// Surah 2 ayah 1 before basmala strip — index alignment leaves most glosses empty.
const basmalaMisaligned = [
  { ar: 'بِسْمِ', en: 'Alif Laam Meem' },
  { ar: 'ٱللَّهِ', en: '' },
  { ar: 'ٱلرَّحْمَٰنِ', en: '' },
  { ar: 'ٱلرَّحِيمِ', en: '' },
  { ar: 'الٓمٓ', en: '' },
]
assert.equal(versesHaveWordMeanings([{ words: basmalaMisaligned }]), false)

const tajweedTokens = ['ذَٰلِكَ', 'ٱلْكِتَٰبُ', 'لَا', 'رَيْبَ', 'ۛ', 'فِيهِ', 'ۛ', 'هُدًۭى', 'لِّلْمُتَّقِينَ']
const indexMisaligned = tajweedTokens.map((ar, index) => ({
  ar,
  en: wbwWords[index]?.en || '',
}))
assert.equal(versesHaveWordMeanings([{ words: indexMisaligned }]), false)
assert.equal(versesHaveWordMeanings([{ words: wbwWords }]), true)

const merged = buildVerseWordsFromWbw(wbwWords, [])
assert.equal(merged.length, 7)
assert.equal(merged[3].en, 'doubt')

const verse = { key: '2:2', words: wbwWords }
assert.equal(resolveWordGlossFromVerse(verse, 'رَيْبَ', 3), 'doubt')
assert.equal(resolveWordGlossFromVerse(verse, 'فِيهِ', 5), 'in it')
assert.equal(normalizeWordForMeaningLookup('رَيْبَ ۛ'), normalizeWordForMeaningLookup('رَيْبَ'))

const wbwMap = new Map([[2, wbwWords]])
const applied = applyWordByWordMeaningsToVerses(
  [{ key: '2:2', numberInSurah: 2, words: legacyWords }],
  wbwMap
)
assert.equal(applied[0].words.length, 7)
assert.equal(applied[0].words[6].en, 'for the God-fearing')

console.log('word-by-word-meanings tests passed')
