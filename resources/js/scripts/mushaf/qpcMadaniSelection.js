import { verseKeyFromQpcLocation } from './qpcMadaniVersePage.js'
import { chapterHasBismillahPre, MADANI_LINES_PER_PAGE } from './madaniPageLayout.js'

export { MADANI_LINES_PER_PAGE }

function emptyPrintedLine(lineNumber) {
  return {
    line_type: 'empty',
    type: 'empty',
    line_number: lineNumber,
    is_centered: 0,
    surah_number: '',
    words: [],
  }
}

function lineTypeOf(line) {
  return String(line?.line_type || line?.type || '')
}

function isBasmalaLineType(type) {
  return type === 'basmala' || type === 'basmallah'
}

function lineSurahNumber(line) {
  const n = Number(line?.surah_number ?? line?.surahNumber)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0
}

function lineNumberOf(line) {
  return Number(line?.line_number ?? line?.lineNumber)
}

function surahShowsOpeningBasmala(surah) {
  const chapter = Math.trunc(Number(surah) || 0)
  return chapter > 0 && chapter !== 9 && chapterHasBismillahPre(chapter)
}

function resolvePrintedLineSlot(line, original = []) {
  const type = lineTypeOf(line)
  if (type === 'surah_name') {
    const surah = Number(line.surah_number)
    const printed = original.find((row) => (
      lineTypeOf(row) === 'surah_name'
      && (!surah || !row.surah_number || Number(row.surah_number) === surah)
    ))
    if (printed) return Math.trunc(Number(printed.line_number) || 1)
    const slot = Math.trunc(Number(line?.line_number ?? line?.lineNumber) || 0)
    return slot >= 1 ? slot : 1
  }
  let slot = Math.trunc(Number(line?.line_number ?? line?.lineNumber) || 0)
  if (slot >= 1) return slot
  if (type === 'basmallah' || type === 'basmala') {
    const printed = original.find((row) => lineTypeOf(row) === 'basmallah' || lineTypeOf(row) === 'basmala')
    if (printed) return Math.trunc(Number(printed.line_number) || 2)
    const surahRow = original.find((row) => lineTypeOf(row) === 'surah_name')
    return surahRow ? Math.trunc(Number(surahRow.line_number) || 1) + 1 : 2
  }
  return 0
}

function preparedHasOpeningBasmala(lines = [], surah = 0) {
  const chapter = Math.trunc(Number(surah) || 0)
  return (Array.isArray(lines) ? lines : []).some((row) => {
    if (!isBasmalaLineType(lineTypeOf(row))) return false
    const rowSurah = lineSurahNumber(row)
    return !rowSurah || rowSurah === chapter
  })
}

/**
 * Title first, then a single Bismillah. Never leave Bismillah sitting above
 * the surah name (injected headers used to land between a printed basmala and ayah 1).
 */
export function normalizeSessionSurahOpeningLines(lines = []) {
  const source = Array.isArray(lines) ? [...lines] : []
  const ordered = []
  let index = 0
  while (index < source.length) {
    const line = source[index]
    const next = source[index + 1]
    if (isBasmalaLineType(lineTypeOf(line)) && lineTypeOf(next) === 'surah_name') {
      ordered.push(next)
      const afterTitle = source[index + 2]
      if (isBasmalaLineType(lineTypeOf(afterTitle))) {
        ordered.push(line)
        index += 3
        continue
      }
      ordered.push(line)
      index += 2
      continue
    }
    ordered.push(line)
    index += 1
  }

  const deduped = []
  for (const line of ordered) {
    const prev = deduped[deduped.length - 1]
    if (
      isBasmalaLineType(lineTypeOf(line))
      && prev
      && isBasmalaLineType(lineTypeOf(prev))
    ) {
      continue
    }
    deduped.push(line)
  }
  return deduped
}

/** Basmala under the surah title on the session’s opening header page (not mid-surah cards). */
export function injectBasmalaAfterSessionSurahHeader(prepared = [], source = [], startKey = '', endKey = '') {
  const original = Array.isArray(source) ? source : []
  const out = []
  for (let index = 0; index < prepared.length; index += 1) {
    const line = prepared[index]
    out.push(line)
    if (lineTypeOf(line) !== 'surah_name') continue
    const surah = lineSurahNumber(line)
    if (!surahShowsOpeningBasmala(surah)) continue
    if (!sessionIncludesSurahOpening(startKey, endKey, surah)) continue
    const next = prepared[index + 1]
    if (isBasmalaLineType(lineTypeOf(next))) continue
    if (preparedHasOpeningBasmala(prepared, surah)) continue
    const printed = original.find((row) => (
      isBasmalaLineType(lineTypeOf(row))
      && (!lineSurahNumber(row) || lineSurahNumber(row) === surah)
    ))
    const slot = resolvePrintedLineSlot(printed || { line_type: 'basmala', line_number: 0 }, original)
    out.push({
      ...(printed || {}),
      line_type: printed?.line_type || 'basmala',
      type: printed?.type || 'basmala',
      surah_number: surah,
      line_number: slot > 0 ? slot : 2,
      words: printed?.words || [],
    })
  }
  return out
}

/**
 * Build a 15-row page on printed line numbers so spread leaves share row alignment.
 */
export function padQpcMadaniLinesToPrintedGrid(
  source = [],
  prepared = [],
  startKey = '',
  endKey = '',
  { includeSurahOpening = false } = {},
) {
  void startKey
  void endKey
  const original = Array.isArray(source) ? source : []
  const rows = (Array.isArray(prepared) ? prepared : []).filter((line) => lineTypeOf(line) !== 'empty')
  const target = Math.max(
    MADANI_LINES_PER_PAGE,
    ...original.map((line) => Math.trunc(Number(line?.line_number) || 0)),
  )
  const grid = Array.from({ length: target }, (_, index) => emptyPrintedLine(index + 1))

  for (const line of rows) {
    const slot = resolvePrintedLineSlot(line, original)
    if (slot >= 1 && slot <= target) {
      grid[slot - 1] = { ...line, line_number: slot }
    }
  }

  if (includeSurahOpening) {
    const headerIndex = grid.findIndex((line) => lineTypeOf(line) === 'surah_name')
    if (headerIndex >= 0) {
      const surah = Number(grid[headerIndex].surah_number)
      const hasBasmala = grid.some((line) => lineTypeOf(line) === 'basmallah' || lineTypeOf(line) === 'basmala')
      if (
        !hasBasmala
        && surahShowsOpeningBasmala(surah)
        && sessionIncludesSurahOpening(startKey, endKey, surah)
      ) {
        const printed = original.find((row) => lineTypeOf(row) === 'basmallah' || lineTypeOf(row) === 'basmala')
        const slot = resolvePrintedLineSlot(printed || { line_type: 'basmala' }, original)
        if (slot >= 1 && slot <= target) {
          grid[slot - 1] = {
            ...(printed || {}),
            line_type: printed?.line_type || 'basmala',
            type: printed?.type || 'basmala',
            surah_number: surah,
            line_number: slot,
            words: printed?.words || [],
          }
        }
      }
    }
  }

  return grid
}

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
  const verseKey = String(word?.verseKey || word?.verse_key || '').trim()
  if (verseKey) {
    const parsed = parseAyahKey(verseKey)
    if (parsed?.key) return parsed.key
  }
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
 * Keep surah header and ayah words that fall inside the session.
 * Neighbouring ayahs on the same page are dropped. Basmala is kept only
 * when the session includes that surah’s first ayah.
 */
export function filterQpcPageLinesToSession(lines = [], startKey = '', endKey = '') {
  const source = Array.isArray(lines) ? lines : []
  const start = parseAyahKey(startKey)
  const end = parseAyahKey(endKey) || start
  if (!start || !end) return source

  const sessionSurahs = new Set()
  for (const line of source) {
    const type = String(line?.line_type || line?.type || '')
    if (type !== 'ayah') continue
    for (const word of line.words || []) {
      const key = ayahKeyFromWord(word)
      if (!key || !isAyahInCanonicalRange(key, start.key, end.key)) continue
      const parsed = parseAyahKey(key)
      if (!parsed) continue
      sessionSurahs.add(parsed.surah)
    }
  }
  if (!sessionSurahs.size) return []

  const kept = []
  for (const line of source) {
    const type = String(line?.line_type || line?.type || '')
    if (type === 'surah_name') {
      if (sessionSurahs.has(lineSurahNumber(line))) kept.push(line)
      continue
    }
    if (isBasmalaLineType(type)) {
      const lineSurah = lineSurahNumber(line)
      const showBasmala = [...sessionSurahs].some((surah) => (
        (!lineSurah || lineSurah === surah)
        && isAyahInCanonicalRange(`${surah}:1`, start.key, end.key)
      ))
      if (showBasmala) kept.push(line)
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
  return stripBasmalaAfterLastSessionAyah(kept, start.key, end.key)
}

/** Drop printed basmala rows that sit below the session’s last ayah on this page. */
export function stripBasmalaAfterLastSessionAyah(lines = [], startKey = '', endKey = '') {
  const source = Array.isArray(lines) ? lines : []
  let lastAyahSlot = 0
  for (const line of source) {
    if (lineTypeOf(line) !== 'ayah') continue
    const inSession = (line.words || []).some((word) => {
      const key = ayahKeyFromWord(word)
      return key && isAyahInCanonicalRange(key, startKey, endKey)
    })
    if (!inSession) continue
    const slot = Math.trunc(Number(line?.line_number ?? line?.lineNumber) || 0)
    if (slot > lastAyahSlot) lastAyahSlot = slot
  }
  if (!lastAyahSlot) return source
  return source.filter((line) => {
    const type = lineTypeOf(line)
    if (type !== 'basmallah' && type !== 'basmala') return true
    const slot = Math.trunc(Number(line?.line_number ?? line?.lineNumber) || 0)
    return slot <= lastAyahSlot
  })
}

/**
 * Keep every printed ayah row intact.
 * Merging a session-start fragment into the next row doubles the first line
 * (Al-Kahf 18:88 is 7 words + 12) and is the only row that overflows.
 */
export function compactQpcMadaniSessionAyahLines(lines = []) {
  return Array.isArray(lines) ? lines : []
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
    if (lineTypeOf(line) === 'surah_name') {
      headerSurahs.add(lineSurahNumber(line))
    }
  }

  const injected = []
  for (const surah of sessionSurahs) {
    if (headerSurahs.has(surah)) continue
    const anchor = firstSessionAyahLineNumber(source, surah, start.key, end.key)
      ?? firstSessionAyahLineNumber(kept, surah, start.key, end.key)
    const openingBasmala = kept.find((line) => {
      if (!isBasmalaLineType(lineTypeOf(line))) return false
      const rowSurah = lineSurahNumber(line)
      return !rowSurah || rowSurah === surah
    })
    const ayahLine = anchor != null ? Number(anchor) : NaN
    const basmalaLine = openingBasmala ? lineNumberOf(openingBasmala) : NaN
    let headerLine = 0
    if (Number.isFinite(basmalaLine) && Number.isFinite(ayahLine)) {
      headerLine = Math.min(basmalaLine, ayahLine) - 0.01
    } else if (Number.isFinite(basmalaLine)) {
      headerLine = basmalaLine - 0.01
    } else if (Number.isFinite(ayahLine)) {
      headerLine = ayahLine - 0.01
    }
    injected.push({
      line_type: 'surah_name',
      type: 'surah_name',
      surah_number: surah,
      line_number: headerLine,
      is_centered: 1,
      words: [],
    })
  }

  if (!injected.length) return kept
  return [...kept, ...injected].sort((left, right) => (
    Number(left?.line_number) - Number(right?.line_number)
  ))
}

function stripQpcSessionSurahNameLines(lines = []) {
  return (Array.isArray(lines) ? lines : []).filter((line) => (
    String(line?.line_type || line?.type || '') !== 'surah_name'
  ))
}

function ensureQpcMadaniPrintedGrid(source = []) {
  const original = Array.isArray(source) ? source : []
  const target = Math.max(
    MADANI_LINES_PER_PAGE,
    ...original.map((line) => Math.trunc(Number(line?.line_number ?? line?.lineNumber) || 0)),
  )
  const grid = Array.from({ length: target }, (_, index) => emptyPrintedLine(index + 1))
  for (const line of original) {
    const slot = Math.trunc(Number(line?.line_number ?? line?.lineNumber) || 0)
    if (slot >= 1 && slot <= target) {
      grid[slot - 1] = { ...line, line_number: slot }
    }
  }
  return grid
}

function sessionIncludesSurahOpening(startKey, endKey, surah) {
  const chapter = Math.trunc(Number(surah) || 0)
  if (!chapter) return false
  return isAyahInCanonicalRange(`${chapter}:1`, startKey, endKey)
}

/**
 * Render the full QUL page-by-page grid (15 lines) without repacking ayah rows.
 * Session bounds are applied at word level in the reader (maskOutOfSession).
 */
export function prepareQpcMadaniPrintedPageLines(
  source = [],
  startKey = '',
  endKey = '',
  { showSurahHeader = false, trimSurahChrome = false } = {},
) {
  const original = Array.isArray(source) ? source : []
  let grid = ensureQpcMadaniPrintedGrid(original)

  const blankChromeAt = (slot) => {
    if (slot >= 1 && slot <= grid.length) {
      grid[slot - 1] = emptyPrintedLine(slot)
    }
  }

  if (trimSurahChrome || !showSurahHeader) {
    grid = grid.map((line) => {
      const type = lineTypeOf(line)
      if (type === 'surah_name' || type === 'basmallah' || type === 'basmala') {
        return emptyPrintedLine(Math.trunc(Number(line.line_number) || 1))
      }
      return line
    })
  } else {
    for (let index = 0; index < grid.length; index += 1) {
      const line = grid[index]
      const type = lineTypeOf(line)
      if (type !== 'basmallah' && type !== 'basmala') continue
      const surah = Number(line.surah_number)
      const chapter = surah || parseAyahKey(startKey)?.surah
      if (chapter && !sessionIncludesSurahOpening(startKey, endKey, chapter)) {
        blankChromeAt(index + 1)
      }
    }
  }

  if (showSurahHeader) {
    const filtered = filterQpcPageLinesToSession(original, startKey, endKey)
    const withHeaders = injectQpcMadaniSessionSurahHeaders(original, filtered, startKey, endKey)
    for (const line of withHeaders) {
      if (lineTypeOf(line) !== 'surah_name') continue
      const slot = resolvePrintedLineSlot(line, original)
      if (slot >= 1 && slot <= grid.length) {
        grid[slot - 1] = { ...line, line_number: slot }
      }
    }
  }

  return grid
}

export function pageHasSessionAyahWords(lines = [], startKey = '', endKey = '') {
  const source = Array.isArray(lines) ? lines : []
  for (const line of source) {
    for (const word of line.words || []) {
      const key = ayahKeyFromWord(word)
      if (key && isAyahInCanonicalRange(key, startKey, endKey)) return true
    }
  }
  return false
}

export function isAyahInSessionSelection(key, selection = {}) {
  const start = String(selection.sessionStartAyah || selection.rangeStartAyah || '').trim()
  const end = String(selection.sessionEndAyah || selection.rangeEndAyah || start).trim()
  if (!start || !end) return true
  return isAyahInCanonicalRange(key, start, end)
}

function isSingleAyahSessionRange(startKey = '', endKey = '') {
  const start = parseAyahKey(startKey)
  const end = parseAyahKey(endKey) || start
  if (!start || !end) return false
  return start.key === end.key
}

export function prepareQpcMadaniSessionLines(
  lines = [],
  startKey = '',
  endKey = '',
  { showSurahHeader = true, preservePrintedGrid = false, includeSurahOpening = false } = {},
) {
  const source = Array.isArray(lines) ? lines : []
  const filtered = filterQpcPageLinesToSession(source, startKey, endKey)
  let prepared = filtered
  if (showSurahHeader) {
    prepared = injectQpcMadaniSessionSurahHeaders(source, filtered, startKey, endKey)
  } else {
    prepared = stripQpcSessionSurahNameLines(filtered)
  }
  if (!preservePrintedGrid && !isSingleAyahSessionRange(startKey, endKey)) {
    prepared = compactQpcMadaniSessionAyahLines(prepared)
  }
  if (includeSurahOpening) {
    prepared = injectBasmalaAfterSessionSurahHeader(prepared, source, startKey, endKey)
  }
  prepared = normalizeSessionSurahOpeningLines(prepared)
  if (preservePrintedGrid) {
    return padQpcMadaniLinesToPrintedGrid(source, prepared, startKey, endKey, { includeSurahOpening })
  }
  return stripTrailingBasmalaRows(prepared)
}

function stripTrailingBasmalaRows(lines = []) {
  const source = [...(Array.isArray(lines) ? lines : [])]
  while (source.length) {
    const type = lineTypeOf(source[source.length - 1])
    if (type === 'basmallah' || type === 'basmala') source.pop()
    else break
  }
  return source
}

export function pageHasQpcMadaniSessionLines(lines = [], startKey = '', endKey = '') {
  const filtered = filterQpcPageLinesToSession(lines, startKey, endKey)
  const prepared = isSingleAyahSessionRange(startKey, endKey)
    ? filtered
    : compactQpcMadaniSessionAyahLines(filtered)
  return prepared.length > 0
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
