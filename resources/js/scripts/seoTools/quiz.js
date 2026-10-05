import { tokenizeForMatch } from '../memorisationDetection/speechMatch.js'

const ARABIC_LETTER = /[\u0621-\u064A\u0671-\u06D3]/

function cleanArabic(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function contentWords(text) {
  return tokenizeForMatch(cleanArabic(text)).filter((word) => ARABIC_LETTER.test(word))
}

function shuffle(list) {
  const next = list.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

export function versesFromEditionAyahs(surah, ayahs = [], from = 1, to = 7) {
  const chapter = Number(surah) || 1
  const start = Math.max(1, Number(from) || 1)
  const end = Math.max(start, Number(to) || start)
  return (Array.isArray(ayahs) ? ayahs : [])
    .map((ayah) => ({
      key: `${chapter}:${Number(ayah?.numberInSurah || ayah?.number || 0)}`,
      surah: chapter,
      number: Number(ayah?.numberInSurah || ayah?.number || 0),
      arabic: cleanArabic(ayah?.text || ''),
    }))
    .filter((verse) => verse.number >= start && verse.number <= end && verse.arabic)
}

/**
 * Public recall check: same MCQ / blank / flashcard idea as “Check what you kept”,
 * without live microphone or account history.
 */
export function buildPublicQuizCards(verses = [], { questionCount = 6 } = {}) {
  const pool = Array.isArray(verses) ? verses.filter((v) => v?.arabic && v?.key) : []
  if (pool.length < 1) return []
  const count = Math.max(1, Math.min(8, Number(questionCount) || 6, pool.length))
  const selected = shuffle(pool).slice(0, count)
  const types = pool.length >= 3 ? ['mcq', 'blank', 'flashcard'] : ['flashcard']

  return selected.map((verse, index) => {
    const type = types[index % types.length]
    if (type === 'mcq' && pool.length >= 3) {
      const distractors = shuffle(pool.filter((item) => item.key !== verse.key)).slice(0, 3)
      const options = shuffle([verse, ...distractors]).map((item) => ({
        key: item.key,
        label: `${item.key} · ${item.arabic.slice(0, 42)}`,
      }))
      return { type: 'mcq', verse, prompt: 'Which ayah is this?', stem: verse.arabic, options, answerKey: verse.key }
    }
    if (type === 'blank') {
      const words = contentWords(verse.arabic)
      if (words.length >= 3) {
        const hideAt = Math.min(words.length - 2, Math.max(1, Math.floor(words.length / 2)))
        const hidden = words[hideAt]
        const display = words.map((word, i) => (i === hideAt ? '______' : word)).join(' ')
        return { type: 'blank', verse, prompt: 'Fill the missing word', stem: display, answerKey: hidden }
      }
    }
    return {
      type: 'flashcard',
      verse,
      prompt: 'Recall this ayah, then reveal',
      stem: `${verse.key}`,
      reveal: verse.arabic,
      answerKey: verse.key,
    }
  })
}

export function gradePublicQuizAnswer(card, value) {
  if (!card) return false
  if (card.type === 'flashcard') return String(value || '') === 'recalled'
  const expected = String(card.answerKey || '').trim()
  const given = String(value || '').trim()
  if (!expected || !given) return false
  if (card.type === 'blank') {
    const a = contentWords(expected)[0] || expected
    const b = contentWords(given)[0] || given
    return a === b
  }
  return expected === given
}
