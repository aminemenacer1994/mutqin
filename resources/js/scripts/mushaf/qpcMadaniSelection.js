import { verseKeyFromQpcLocation } from './qpcMadaniVersePage.js'

export function parseAyahKey(key) {
  const parts = String(key || '').trim().split(':')
  const surah = Number(parts[0])
  const ayah = Number(parts[1])
  if (!Number.isFinite(surah) || !Number.isFinite(ayah) || surah < 1 || ayah < 1) {
    return null
  }
  return { surah: Math.trunc(surah), ayah: Math.trunc(ayah), key: `${Math.trunc(surah)}:${Math.trunc(ayah)}` }
}

export function ayahKeyFromWord(word = {}) {
  if (word?.surah && word?.ayah) {
    const parsed = parseAyahKey(`${word.surah}:${word.ayah}`)
    return parsed?.key || ''
  }
  return verseKeyFromQpcLocation(word?.location)
}

export function compareAyahKeys(left, right) {
  const a = parseAyahKey(left)
  const b = parseAyahKey(right)
  if (!a || !b) return 0
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.ayah - b.ayah
}

export function isAyahInCanonicalRange(key, startKey, endKey) {
  const current = parseAyahKey(key)
  const start = parseAyahKey(startKey)
  const end = parseAyahKey(endKey)
  if (!current || !start || !end) return false
  const lo = compareAyahKeys(start.key, end.key) <= 0 ? start : end
  const hi = lo === start ? end : start
  return compareAyahKeys(current.key, lo.key) >= 0 && compareAyahKeys(current.key, hi.key) <= 0
}

/**
 * Keep surah header, opening basmala, and ayah words that fall inside the session.
 * Neighbouring ayahs on the same printed page are dropped.
 */
export function filterQpcPageLinesToSession(lines = [], startKey = '', endKey = '') {
  const source = Array.isArray(lines) ? lines : []
  const start = parseAyahKey(startKey)
  const end = parseAyahKey(endKey) || start
  if (!start || !end) return source

  const sessionSurahs = new Set()
  const surahsOpeningAtOne = new Set()
  for (const line of source) {
    const type = String(line?.line_type || line?.type || '')
    if (type !== 'ayah') continue
    for (const word of line.words || []) {
      const key = ayahKeyFromWord(word)
      if (!key || !isAyahInCanonicalRange(key, start.key, end.key)) continue
      const parsed = parseAyahKey(key)
      if (!parsed) continue
      sessionSurahs.add(parsed.surah)
      if (parsed.ayah === 1) surahsOpeningAtOne.add(parsed.surah)
    }
  }
  if (!sessionSurahs.size) return []

  const kept = []
  for (const line of source) {
    const type = String(line?.line_type || line?.type || '')
    if (type === 'surah_name') {
      if (sessionSurahs.has(Number(line.surah_number))) kept.push(line)
      continue
    }
    if (type === 'basmallah' || type === 'basmala') {
      const surah = Number(line.surah_number)
      const opening = Number.isFinite(surah) && surah > 0
        ? surahsOpeningAtOne.has(surah)
        : surahsOpeningAtOne.size > 0
      if (opening) kept.push(line)
      continue
    }
    if (type !== 'ayah') continue
    const words = (line.words || []).filter((word) => {
      const key = ayahKeyFromWord(word)
      return key && isAyahInCanonicalRange(key, start.key, end.key)
    })
    if (words.length) {
      const originalCount = (line.words || []).length
      kept.push({
        ...line,
        words,
        session_partial_line: originalCount > 0 && words.length < originalCount ? 1 : 0,
      })
    }
  }
  return kept
}

/** Merge a trailing fragment line (page break) into the following ayah row. */
export function compactQpcMadaniSessionAyahLines(lines = []) {
  const source = Array.isArray(lines) ? lines : []
  const compacted = []
  let index = 0
  while (index < source.length) {
    const current = source[index]
    const type = String(current?.line_type || current?.type || '')
    const next = source[index + 1]
    const nextType = String(next?.line_type || next?.type || '')
    if (
      type === 'ayah'
      && Number(current?.session_partial_line) === 1
      && next
      && nextType === 'ayah'
    ) {
      compacted.push({
        ...next,
        words: [...(current.words || []), ...(next.words || [])],
        session_partial_line: 0,
        line_number: current.line_number ?? next.line_number,
      })
      index += 2
      continue
    }
    compacted.push(current)
    index += 1
  }
  return compacted
}

function firstSessionAyahLineNumber(lines, surah, startKey, endKey) {
  let min = Number.POSITIVE_INFINITY
  for (const line of lines) {
    const type = String(line?.line_type || line?.type || '')
    if (type !== 'ayah') continue
    const lineNumber = Number(line?.line_number)
    for (const word of line.words || []) {
      const key = ayahKeyFromWord(word)
      if (!key || !isAyahInCanonicalRange(key, startKey, endKey)) continue
      const parsed = parseAyahKey(key)
      if (!parsed || parsed.surah !== surah) continue
      if (Number.isFinite(lineNumber)) min = Math.min(min, lineNumber)
    }
  }
  return Number.isFinite(min) ? min : null
}

/**
 * Inject a surah title row when the session starts mid-page (no printed surah_name line).
 */
export function injectQpcMadaniSessionSurahHeaders(lines = [], filtered = [], startKey = '', endKey = '') {
  const source = Array.isArray(lines) ? lines : []
  const kept = Array.isArray(filtered) ? [...filtered] : []
  const start = parseAyahKey(startKey)
  const end = parseAyahKey(endKey) || start
  if (!start || !end || !kept.length) return kept

  const sessionSurahs = new Set()
  for (const line of kept) {
    const type = String(line?.line_type || line?.type || '')
    if (type !== 'ayah') continue
    for (const word of line.words || []) {
      const key = ayahKeyFromWord(word)
      if (!key || !isAyahInCanonicalRange(key, start.key, end.key)) continue
      const parsed = parseAyahKey(key)
      if (parsed) sessionSurahs.add(parsed.surah)
    }
  }

  const headerSurahs = new Set()
  for (const line of kept) {
    if (String(line?.line_type || line?.type || '') === 'surah_name') {
      headerSurahs.add(Number(line.surah_number))
    }
  }

  const injected = []
  for (const surah of sessionSurahs) {
    if (headerSurahs.has(surah)) continue
    const anchor = firstSessionAyahLineNumber(source, surah, start.key, end.key)
      ?? firstSessionAyahLineNumber(kept, surah, start.key, end.key)
    injected.push({
      line_type: 'surah_name',
      type: 'surah_name',
      surah_number: surah,
      line_number: anchor != null ? anchor - 0.01 : 0,
      is_centered: 1,
      words: [],
    })
  }

  if (!injected.length) return kept
  return [...kept, ...injected].sort((left, right) => (
    Number(left?.line_number) - Number(right?.line_number)
  ))
}

export function prepareQpcMadaniSessionLines(lines = [], startKey = '', endKey = '') {
  const filtered = filterQpcPageLinesToSession(lines, startKey, endKey)
  const withHeaders = injectQpcMadaniSessionSurahHeaders(lines, filtered, startKey, endKey)
  return compactQpcMadaniSessionAyahLines(withHeaders)
}

export function pageHasQpcMadaniSessionLines(lines = [], startKey = '', endKey = '') {
  return prepareQpcMadaniSessionLines(lines, startKey, endKey).length > 0
}

export function buildMadaniSelection({
  activeAyah = '',
  rangeStartAyah = '',
  rangeEndAyah = '',
  sessionStartAyah = '',
  sessionEndAyah = '',
} = {}) {
  const active = parseAyahKey(activeAyah)?.key || ''
  const sessionStart = parseAyahKey(sessionStartAyah || rangeStartAyah)?.key || ''
  const sessionEnd = parseAyahKey(sessionEndAyah || rangeEndAyah || sessionStart)?.key || ''
  const start = parseAyahKey(rangeStartAyah || sessionStart)?.key || ''
  const end = parseAyahKey(rangeEndAyah || sessionEnd || start)?.key || ''
  const rangeLo = start && end && compareAyahKeys(start, end) <= 0 ? start : end
  const rangeHi = start && end && rangeLo === start ? end : start

  return Object.freeze({
    activeAyah: active,
    rangeStartAyah: rangeLo || '',
    rangeEndAyah: rangeHi || '',
    sessionStartAyah: sessionStart,
    sessionEndAyah: sessionEnd,
  })
}

export function resolveMadaniAyahVisualState(ayahKey, selection = {}) {
  const key = parseAyahKey(ayahKey)?.key || ''
  if (!key) {
    return { active: false, inRange: false, rangeRole: '' }
  }

  const active = key === String(selection.activeAyah || '')
  const inRange = isAyahInCanonicalRange(key, selection.rangeStartAyah, selection.rangeEndAyah)
  let rangeRole = ''
  if (inRange) {
    if (key === selection.rangeStartAyah && key === selection.rangeEndAyah) {
      rangeRole = 'single'
    } else if (key === selection.rangeStartAyah) {
      rangeRole = 'start'
    } else if (key === selection.rangeEndAyah) {
      rangeRole = 'end'
    } else {
      rangeRole = 'middle'
    }
  }

  return { active, inRange, rangeRole }
}

export function madaniWordVisualClass(state = {}) {
  return {
    'is-ayah-active': !!state.active,
    'is-range-ayah': !!state.inRange,
    'is-range-start': state.rangeRole === 'start' || state.rangeRole === 'single',
    'is-range-middle': state.rangeRole === 'middle',
    'is-range-end': state.rangeRole === 'end' || state.rangeRole === 'single',
  }
}
