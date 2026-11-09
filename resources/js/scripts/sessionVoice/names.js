const EXTRA = [
  { kind: 'surah', content: 'الكافرون', sounds: ['cafrune', 'kafiroun', 'kafirun', 'kafiroon', 'al kafirun'] },
  { kind: 'reciter', content: 'عبد الرحمن السديس', sounds: ['sudice', 'sudaisi', 'sudais', 'sudays', 'al sudais'] },
]

const NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  once: 1, twice: 2, first: 1,
}

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[ʿʾ''`\-–.,]/g, ' ')
    .replace(/[^a-z0-9\u0600-\u06ff\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compact(value) {
  return fold(value).replace(/\s+/g, '')
}

function withNumbers(value) {
  return fold(value).replace(/\b(once|twice|first|one|two|three|four|five|six|seven|eight|nine|ten)\b/g, (word) => (
    String(NUMBERS[word] || word)
  ))
}

function lastMatch(text, pattern, pick) {
  const matches = [...String(text || '').matchAll(pattern)]
  if (!matches.length) return null
  return pick(matches[matches.length - 1])
}

function hit(haystack, haystackCompact, sound) {
  const needle = fold(sound)
  if (needle.length < 3) return false
  if (` ${haystack} `.includes(` ${needle} `)) return true
  const tight = needle.replace(/\s+/g, '')
  return tight.length >= 4 && haystackCompact.includes(tight)
}

function kindOf(row) {
  if (row?.kind === 'reciter' || row?.kind === 'surah') return row.kind
  return /السديس|العفاسي|الحصري|المنشاوي|المعيقلي|الرفاعي|الشاطري|الحذيفي/.test(String(row?.content || ''))
    ? 'reciter'
    : 'surah'
}

function matchNames(transcript, phraseHints) {
  const haystack = fold(transcript)
  if (haystack.length < 3) return { surah: '', reciter: '' }

  const haystackCompact = compact(haystack)
  let surah = ''
  let reciter = ''
  let surahAt = -1
  let reciterAt = -1

  ;[...EXTRA, ...(Array.isArray(phraseHints) ? phraseHints : [])].forEach((row) => {
    const content = String(row?.content || '').trim()
    if (!content) return
    const sounds = [
      content,
      ...(Array.isArray(row.sounds_like) ? row.sounds_like : []),
      ...(Array.isArray(row.sounds) ? row.sounds : []),
    ]
    const matched = sounds.find((sound) => hit(haystack, haystackCompact, sound))
    if (!matched) return
    const at = Math.max(0, haystack.indexOf(fold(matched)))
    if (kindOf(row) === 'reciter') {
      if (at >= reciterAt) {
        reciter = content
        reciterAt = at
      }
      return
    }
    if (at >= surahAt) {
      surah = content
      surahAt = at
    }
  })

  return { surah, reciter }
}

function matchMode(latin) {
  if (/\btest\b|اختبر|اختبار/.test(latin)) return 'test'
  if (/\b(?:revise|review|murajaah|muraajaah)\b|راجع/.test(latin)) return 'revise'
  if (/\b(?:memorise|memorize|memorisation|memorization|hifz)\b|احفظ|تحفيظ|حفظ/.test(latin)) return 'memorise'
  if (/\b(?:recite|play|listen)\b|اقرا|شغل|سمع/.test(latin)) return 'recite'
  return ''
}

function softenRange(value) {
  const ordinals = { second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7', eighth: '8', ninth: '9', tenth: '10' }
  return withNumbers(value)
    .replace(/\b(?:airs?|ayas?|ayat|verses?)\b/g, 'ayah')
    .replace(/\bin to\b/g, 'to')
    .replace(/\b(second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b(?=\s+ayah\b)/g, (word) => ordinals[word] || word)
    .replace(/\b(between|from|to|and)\s+(?:the|a)\s+/g, '$1 ')
    .replace(/\ba\s+(?=\d)/g, '')
}

function matchRange(latin) {
  const spoken = softenRange(latin)
  const fromTo = lastMatch(
    spoken,
    /\b(?:from|starting(?:\s+at)?|between)\s+(?:ayah\s+)?(\d{1,3})(?:\s+ayah)?\s+(?:to|through|until|and|-)\s+(?:ayah\s+)?(\d{1,3})\b/g,
    (match) => ({ start: Number(match[1]), end: Number(match[2]) }),
  )
  if (fromTo) return fromTo

  const verses = lastMatch(
    spoken,
    /\b(?:ayah|verse|ayat)s?\s+(\d{1,3})\s+(?:to|through|-)\s+(?:ayah|verse|ayat)?\s*(\d{1,3})\b/g,
    (match) => ({ start: Number(match[1]), end: Number(match[2]) }),
  )
  if (verses) return verses

  const onwards = lastMatch(
    spoken,
    /\b(?:from\s+)?(?:ayah|verse|ayat)\s+(\d{1,3})\s+(?:onwards|onward|and\s+on|to\s+the\s+end)\b/g,
    (match) => ({ start: Number(match[1]), end: null, onwards: true }),
  )
  if (onwards) return onwards

  const first = lastMatch(
    spoken,
    /\bfirst\s+(\d{1,3})\s+(?:ayahs?|verses?|ayat)\b|\b(\d{1,3})\s+(?:ayahs?|verses?|ayat)\b/g,
    (match) => ({ start: 1, end: Number(match[1] || match[2]) }),
  )
  if (first) return first

  if (/\b(?:whole|entire|full|complete)\b|\ball of\b|كامل|كلها|كامله/.test(spoken)) {
    return { start: 1, end: null, full: true }
  }

  const single = lastMatch(
    spoken,
    /\b(?:ayah|verse|ayat)\s+(\d{1,3})\b/g,
    (match) => ({ start: Number(match[1]), end: Number(match[1]) }),
  )
  return single || { start: null, end: null }
}

function matchSpeed(latin) {
  const found = []
  const push = (at, value) => found.push({ at, value })
  for (const match of latin.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*(?:x|speed)\b/g)) {
    push(match.index || 0, Number(match[1]))
  }
  for (const match of latin.matchAll(/\b(?:very\s+fast|fastest)\b/g)) push(match.index || 0, 2)
  for (const match of latin.matchAll(/\b(?:half(?:\s+|-)?speed|slow|slowly)\b|بطيء|بطيئ|ببطء/g)) push(match.index || 0, 0.5)
  for (const match of latin.matchAll(/\b(?:normal|regular)\b|عادي/g)) push(match.index || 0, 1)
  for (const match of latin.matchAll(/(?<!very\s)\b(?:fast|quickly)\b|سريع/g)) push(match.index || 0, 1.5)
  if (!found.length) return null
  found.sort((left, right) => left.at - right.at)
  const value = found[found.length - 1].value
  return [0.5, 0.75, 1, 1.25, 1.5, 2].find((option) => Math.abs(option - value) < 0.001) ?? null
}

function matchRepetitions(latin) {
  const found = []
  const push = (at, value) => found.push({ at, value })
  for (const match of latin.matchAll(/\b(\d{1,2})\s+times\b|\brepeat(?:ed|ing)?\s+(\d{1,2})\b|\b(\d{1,2})\s+repetitions?\b|كرر\s+(\d{1,2})|(\d{1,2})\s+مرات/g)) {
    push(match.index || 0, Number(match[1] || match[2] || match[3] || match[4] || match[5]))
  }
  for (const match of latin.matchAll(/\btwice\b|مرتين/g)) push(match.index || 0, 2)
  for (const match of latin.matchAll(/\bonce\b/g)) push(match.index || 0, 1)
  for (const match of latin.matchAll(/\b(?:actually|make it)\s+(\d{1,2})\b/g)) {
    if (found.length) push(match.index || 0, Number(match[1]))
  }
  if (!found.length) return null
  found.sort((left, right) => left.at - right.at)
  const value = found[found.length - 1].value
  if (!Number.isFinite(value)) return null
  return Math.min(10, Math.max(1, value))
}

/**
 * Map live speech onto canonical Arabic names and the other session settings.
 */
export function matchSpokenRequest(transcript, phraseHints = []) {
  const latin = withNumbers(transcript)
  const names = matchNames(transcript, phraseHints)
  const range = matchRange(latin)
  return {
    surah: names.surah,
    reciter: names.reciter,
    mode: matchMode(latin),
    start: range.start,
    end: range.end,
    full: !!range.full,
    onwards: !!range.onwards,
    speed: matchSpeed(latin),
    repetitions: matchRepetitions(latin),
  }
}

export function matchSpokenNames(transcript, phraseHints = []) {
  const request = matchSpokenRequest(transcript, phraseHints)
  return { surah: request.surah, reciter: request.reciter }
}
