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
    if (words.length) kept.push({ ...line, words })
  }
  return kept
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
