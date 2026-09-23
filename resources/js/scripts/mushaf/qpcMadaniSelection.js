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
