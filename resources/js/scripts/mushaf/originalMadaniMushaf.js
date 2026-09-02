import { MADANI_LINES_PER_PAGE, MADANI_TOTAL_PAGES } from './madaniPageLayout.js'

export const READING_VIEW_MODES = Object.freeze(['stacked', 'mushaf', 'madani_mushaf', 'original'])
export const MADANI_MUSHAF_VIEW = 'madani_mushaf'
export const ORIGINAL_MADANI_VIEW = 'original'
export const ORIGINAL_MADANI_SPREAD_QUERY = '(min-width: 900px)'
export const MADANI_MUSHAF_SPREAD_QUERY = ORIGINAL_MADANI_SPREAD_QUERY
export const ORIGINAL_MADANI_IMAGE_WIDTHS = Object.freeze([512, 800, 1024, 1260, 1920])
export const ORIGINAL_MADANI_PAGE_ASPECT = 1024 / 1656

export { MADANI_TOTAL_PAGES }

export function isReadingViewMode(mode) {
  return READING_VIEW_MODES.includes(mode)
}

export function normalizeReadingViewMode(mode, fallback = 'mushaf') {
  return isReadingViewMode(mode) ? mode : (isReadingViewMode(fallback) ? fallback : 'mushaf')
}

export function isOriginalMadaniView(mode) {
  return mode === ORIGINAL_MADANI_VIEW
}

export function isMadaniMushafView(mode) {
  return mode === MADANI_MUSHAF_VIEW
}

export function isPageLayoutView(mode) {
  return mode === 'mushaf' || mode === MADANI_MUSHAF_VIEW || mode === ORIGINAL_MADANI_VIEW
}

export function isMadaniMushafSpreadViewport(media = typeof window !== 'undefined' ? window : null) {
  if (!media?.matchMedia) return false
  return media.matchMedia(MADANI_MUSHAF_SPREAD_QUERY).matches
}

export function clampMadaniPageNumber(pageNumber) {
  const page = Number(pageNumber)
  if (!Number.isFinite(page)) return 1
  return Math.max(1, Math.min(MADANI_TOTAL_PAGES, Math.round(page)))
}

/**
 * Arabic-book spread: odd pages sit on the right, even pages on the left.
 * Page 1 → { left: 2, right: 1 }, page 604 → { left: 604, right: 603 }.
 */
export function getMadaniSpreadPages(pageNumber) {
  const page = clampMadaniPageNumber(pageNumber)
  const right = page % 2 === 1 ? page : page - 1
  const left = right + 1
  return {
    right: right >= 1 && right <= MADANI_TOTAL_PAGES ? right : null,
    left: left >= 1 && left <= MADANI_TOTAL_PAGES ? left : null,
  }
}

export function stepOriginalMadaniPage(pageNumber, direction, { spread = false } = {}) {
  const page = clampMadaniPageNumber(pageNumber)
  const delta = (direction < 0 ? -1 : 1) * (spread ? 2 : 1)
  if (!spread) return clampMadaniPageNumber(page + delta)

  const { right } = getMadaniSpreadPages(page)
  const nextRight = (right || page) + delta
  if (nextRight < 1) return 1
  if (nextRight > MADANI_TOTAL_PAGES) return MADANI_TOTAL_PAGES
  return clampMadaniPageNumber(nextRight)
}

export function canStepOriginalMadaniPage(pageNumber, direction, { spread = false } = {}) {
  const current = clampMadaniPageNumber(pageNumber)
  return stepOriginalMadaniPage(current, direction, { spread }) !== current
}

export function normalizeMadaniPageList(pages = []) {
  const seen = new Set()
  const list = []
  for (const value of pages || []) {
    const page = Number(value)
    if (!Number.isFinite(page)) continue
    const clamped = clampMadaniPageNumber(page)
    if (seen.has(clamped)) continue
    seen.add(clamped)
    list.push(clamped)
  }
  return list.sort((a, b) => a - b)
}

export function constrainMadaniPageToSet(pageNumber, allowedPages = []) {
  const allowed = normalizeMadaniPageList(allowedPages)
  if (!allowed.length) return clampMadaniPageNumber(pageNumber)
  const page = clampMadaniPageNumber(pageNumber)
  if (allowed.includes(page)) return page
  return allowed.reduce((best, candidate) => (
    Math.abs(candidate - page) < Math.abs(best - page) ? candidate : best
  ))
}

/**
 * Arabic-book spread constrained to the session page set.
 * Prefer the physical odd/even pair when both pages are in-session.
 * Otherwise pair consecutive session pages so desktop can still show 2-up.
 */
export function getSessionMadaniSpreadPages(pageNumber, allowedPages = []) {
  const allowed = normalizeMadaniPageList(allowedPages)
  const current = constrainMadaniPageToSet(pageNumber, allowed)
  const physical = getMadaniSpreadPages(current)
  if (!allowed.length) return physical

  const leftOk = physical.left && allowed.includes(physical.left)
  const rightOk = physical.right && allowed.includes(physical.right)
  if (leftOk && rightOk) {
    return { left: physical.left, right: physical.right }
  }

  if (allowed.length >= 2) {
    const idx = Math.max(0, allowed.indexOf(current))
    const pairStart = idx % 2 === 0 ? idx : idx - 1
    const first = allowed[pairStart]
    const second = allowed[pairStart + 1]
    if (first && second) {
      // Arabic reading order: lower page on the right, higher on the left.
      return {
        right: Math.min(first, second),
        left: Math.max(first, second),
      }
    }
  }

  return {
    left: leftOk ? physical.left : null,
    right: rightOk ? physical.right : current,
  }
}

export function stepSessionMadaniPage(pageNumber, direction, {
  allowedPages = [],
  spread = false,
} = {}) {
  const allowed = normalizeMadaniPageList(allowedPages)
  if (!allowed.length) return stepOriginalMadaniPage(pageNumber, direction, { spread })
  const current = constrainMadaniPageToSet(pageNumber, allowed)
  const dir = direction < 0 ? -1 : 1
  if (spread) {
    const pair = getSessionMadaniSpreadPages(current, allowed)
    const pairPages = [pair.right, pair.left].filter(Boolean)
    if (pairPages.length === 2) {
      const pairIndices = pairPages
        .map(page => allowed.indexOf(page))
        .filter(index => index >= 0)
      if (pairIndices.length) {
        const low = Math.min(...pairIndices)
        const high = Math.max(...pairIndices)
        const nextIdx = dir > 0 ? high + 1 : low - 1
        if (nextIdx < 0) return allowed[0]
        if (nextIdx >= allowed.length) return allowed[allowed.length - 1]
        return allowed[nextIdx]
      }
    }
  }
  const index = Math.max(0, allowed.indexOf(current))
  const nextIdx = index + dir
  if (nextIdx < 0) return allowed[0]
  if (nextIdx >= allowed.length) return allowed[allowed.length - 1]
  return allowed[nextIdx]
}

export function canStepSessionMadaniPage(pageNumber, direction, options = {}) {
  const allowed = normalizeMadaniPageList(options.allowedPages)
  const current = constrainMadaniPageToSet(pageNumber, allowed)
  return stepSessionMadaniPage(current, direction, options) !== current
}

export function padMadaniPageFile(pageNumber) {
  return String(clampMadaniPageNumber(pageNumber)).padStart(3, '0')
}

export function normalizeMadaniImageWidth(width) {
  const requested = Number(width)
  if (!Number.isFinite(requested)) return 1024
  let closest = ORIGINAL_MADANI_IMAGE_WIDTHS[0]
  let best = Math.abs(requested - closest)
  for (const candidate of ORIGINAL_MADANI_IMAGE_WIDTHS) {
    const distance = Math.abs(requested - candidate)
    if (distance < best) {
      closest = candidate
      best = distance
    }
  }
  return closest
}

export function preferredMadaniImageWidth({
  spread = false,
  viewportWidth = 1024,
  devicePixelRatio = 1,
} = {}) {
  const dpr = Math.max(1, Number(devicePixelRatio) || 1)
  const cssWidth = Math.max(320, Number(viewportWidth) || 1024)
  const perPage = spread ? cssWidth / 2 : cssWidth
  return normalizeMadaniImageWidth(perPage * dpr)
}

export function originalMadaniPageImageUrl(pageNumber, width = 1024) {
  const page = clampMadaniPageNumber(pageNumber)
  const w = normalizeMadaniImageWidth(width)
  return `/memorisation/mushaf-page/${page}.png?w=${w}`
}

export function originalMadaniImageEventMatchesUrl(loadedSrc, currentUrl) {
  const loaded = String(loadedSrc || '').trim()
  const current = String(currentUrl || '').trim()
  if (!loaded || !current) return false

  try {
    const loadedUrl = new URL(loaded, 'https://mutqin.local')
    const currentResolved = new URL(current, loadedUrl.origin)
    return loadedUrl.pathname === currentResolved.pathname
      && loadedUrl.search === currentResolved.search
  } catch {
    return loaded === current || loaded.endsWith(current) || current.endsWith(loaded)
  }
}

export function originalMadaniPagesToPrefetch(pageNumber, { spread = false } = {}) {
  const page = clampMadaniPageNumber(pageNumber)
  const seen = new Set()
  const pages = []
  const add = (value) => {
    const next = Number(value)
    if (!Number.isFinite(next) || next < 1 || next > MADANI_TOTAL_PAGES || seen.has(next)) return
    seen.add(next)
    pages.push(next)
  }

  if (spread) {
    const { left, right } = getMadaniSpreadPages(page)
    add(right)
    add(left)
    add(stepOriginalMadaniPage(page, 1, { spread: true }))
    add(stepOriginalMadaniPage(page, -1, { spread: true }))
    const nextSpread = getMadaniSpreadPages(stepOriginalMadaniPage(page, 1, { spread: true }))
    const prevSpread = getMadaniSpreadPages(stepOriginalMadaniPage(page, -1, { spread: true }))
    add(nextSpread.left)
    add(nextSpread.right)
    add(prevSpread.left)
    add(prevSpread.right)
  } else {
    add(page)
    add(page + 1)
    add(page - 1)
  }
  return pages
}

export function isOriginalMadaniSpreadViewport(media = typeof window !== 'undefined' ? window : null) {
  if (!media?.matchMedia) return false
  return media.matchMedia(ORIGINAL_MADANI_SPREAD_QUERY).matches
}

const JUZ_ARABIC_NAMES = Object.freeze([
  '',
  'الجزء الأول', 'الجزء الثاني', 'الجزء الثالث', 'الجزء الرابع', 'الجزء الخامس',
  'الجزء السادس', 'الجزء السابع', 'الجزء الثامن', 'الجزء التاسع', 'الجزء العاشر',
  'الجزء الحادي عشر', 'الجزء الثاني عشر', 'الجزء الثالث عشر', 'الجزء الرابع عشر', 'الجزء الخامس عشر',
  'الجزء السادس عشر', 'الجزء السابع عشر', 'الجزء الثامن عشر', 'الجزء التاسع عشر', 'الجزء العشرون',
  'الجزء الحادي والعشرون', 'الجزء الثاني والعشرون', 'الجزء الثالث والعشرون', 'الجزء الرابع والعشرون', 'الجزء الخامس والعشرون',
  'الجزء السادس والعشرون', 'الجزء السابع والعشرون', 'الجزء الثامن والعشرون', 'الجزء التاسع والعشرون', 'الجزء الثلاثون',
])

export function isOpeningMadaniPage(pageNumber) {
  return clampMadaniPageNumber(pageNumber) <= 2
}

export function originalMadaniFrameVariant(pageNumber) {
  return isOpeningMadaniPage(pageNumber) ? 'opening' : 'standard'
}

export function originalMadaniFrameSrc(pageNumber) {
  return isOpeningMadaniPage(pageNumber)
    ? '/images/mushaf/madani-frame-opening.jpg'
    : '/images/mushaf/madani-frame-standard.jpg'
}

export function originalMadaniTextInsets(pageNumber) {
  if (isOpeningMadaniPage(pageNumber)) {
    return { top: 28.6, right: 26.4, bottom: 35.4, left: 28.8 }
  }
  // Calibrated against madani-frame-standard.jpg cream/paper window (900×1350).
  return { top: 7.2, right: 10.0, bottom: 6.8, left: 10.0 }
}

/**
 * Scale QCF glyph size so the longest packed line fills the gold window.
 * Measures by summing word offsetWidths (flex scrollWidth is unreliable).
 * Never uses space-between — packing stays tight like printed Madani.
 */
export function fitOriginalMadaniGlyphSize(sheetEl, {
  lineSelector = '.original-madani-sheet__line--ayah',
  targetFill = 0.992,
  iterations = 10,
} = {}) {
  if (!sheetEl || typeof sheetEl.querySelectorAll !== 'function') return null
  const width = sheetEl.clientWidth
  const height = sheetEl.clientHeight
  if (!(width > 24) || !(height > 24)) return null

  const lineCount = Math.max(
    1,
    Number.parseFloat(getComputedStyle(sheetEl).getPropertyValue('--madani-line-count')) || 15
  )
  const rowHeight = height / lineCount
  const minPx = Math.max(8, rowHeight * 0.62)
  const maxPx = Math.max(minPx + 1, rowHeight * 0.96)

  const apply = (px) => {
    sheetEl.style.setProperty('--madani-glyph-size', `${px}px`)
  }

  const longestLineWidth = () => {
    let longest = 0
    const lines = sheetEl.querySelectorAll(lineSelector)
    lines.forEach((line) => {
      if (!line || line.childElementCount === 0) return
      let sum = 0
      for (const child of line.children) sum += child.offsetWidth || 0
      if (sum > longest) longest = sum
    })
    return longest
  }

  // Seed from current computed size (CSS cq fallback), then correct to width.
  const computed = Number.parseFloat(getComputedStyle(sheetEl).fontSize) || (rowHeight * 0.9)
  let size = Math.min(maxPx, Math.max(minPx, computed))
  apply(size)

  let content = longestLineWidth()
  if (!(content > 0)) return size

  // One-shot scale toward target fill, then clamp against overflow.
  size = Math.min(maxPx, Math.max(minPx, size * ((width * targetFill) / content)))
  apply(size)
  content = longestLineWidth()

  for (let i = 0; i < iterations && content > width + 0.5; i += 1) {
    size = Math.max(minPx, size * (width / content) * 0.995)
    apply(size)
    content = longestLineWidth()
  }

  return size
}

export function classifyOriginalMadaniLineFits() {
  // Kept for API compatibility; short/full stretch classes were removed
  // because space-between produced sparse "star map" layouts.
}

const LINE_GRID_TOP_PAD = 0.35
const LINE_GRID_BOTTOM_PAD = 0.45

export function originalMadaniLineBox(line = {}, index = 0, { opening = false, lineCount = 0 } = {}) {
  const usable = 100 - LINE_GRID_TOP_PAD - LINE_GRID_BOTTOM_PAD
  if (opening) {
    const total = Math.max(1, Number(lineCount) || 1)
    return {
      topPercent: LINE_GRID_TOP_PAD + (index / total) * usable,
      heightPercent: usable / total,
    }
  }
  const lineNumber = Math.max(1, Number(line.lineNumber || index + 1))
  return {
    topPercent: LINE_GRID_TOP_PAD + ((lineNumber - 1) / MADANI_LINES_PER_PAGE) * usable,
    heightPercent: usable / MADANI_LINES_PER_PAGE,
  }
}

export function originalMadaniZoomFromFontSize(fontSize, base = 150) {
  const size = Number(fontSize)
  const origin = Number(base) || 150
  if (!Number.isFinite(size) || size <= 0 || origin <= 0) return 1
  return Math.max(0.85, Math.min(1.85, size / origin))
}

const JUZ_START_PAGES = Object.freeze([
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
])

export function juzNumberFromMadaniPage(pageNumber) {
  const page = clampMadaniPageNumber(pageNumber)
  let juz = 1
  for (let index = 0; index < JUZ_START_PAGES.length; index += 1) {
    if (page >= JUZ_START_PAGES[index]) juz = index + 1
    else break
  }
  return juz
}

export function arabicJuzLabel(juzNumber) {
  const juz = Math.max(1, Math.min(30, Number(juzNumber) || 1))
  return JUZ_ARABIC_NAMES[juz] || `الجزء ${juz}`
}

const ARABIC_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g
const WIDE_ARABIC = /[صضطظشسقفغعهخحجن]/
const NARROW_ARABIC = /[اىلإأآء]/

/** Decorated ayah-end circles are much wider than their 1–2 stored characters. */
export const MADANI_AYAH_MARKER_WEIGHT = 3.7

export function isMadaniAyahMarker(word = {}) {
  return !!(word?.isEnd || word?.charType === 'end')
}

export function madaniWordVisualWeight(word = {}) {
  if (isMadaniAyahMarker(word)) return MADANI_AYAH_MARKER_WEIGHT
  const raw = String(word.textQpc || word.text || '')
  const base = raw.replace(ARABIC_MARKS, '').replace(/\s+/g, '')
  if (!base) return 1
  let weight = 0
  for (const ch of base) {
    if (NARROW_ARABIC.test(ch)) weight += 0.7
    else if (WIDE_ARABIC.test(ch)) weight += 1.22
    else weight += 1
  }
  return Math.max(0.8, weight)
}

export function highlightableMadaniWords(words = []) {
  return (words || []).filter(word => word && !isMadaniAyahMarker(word) && word.verseKey)
}

export function layoutMadaniOverlayWords(words = [], { typicalWeight = 40 } = {}) {
  const items = (words || []).map((word, index) => ({
    ...word,
    localIndex: index,
    visualWeight: Number(word.visualWeight) > 0 ? Number(word.visualWeight) : madaniWordVisualWeight(word),
  }))
  const total = items.reduce((sum, item) => sum + item.visualWeight, 0) || 1
  const typical = Math.max(24, Number(typicalWeight) || 40)
  const verseKeys = new Set(items.map(item => item.verseKey).filter(Boolean))
  const isShort = items.length > 0 && verseKeys.size <= 1 && total < typical * 0.72
  const occupied = isShort ? Math.max(12, (total / typical) * 100) : 100
  // Printed Madani short lines are centered, not flush to the right margin.
  const startOffset = isShort ? (100 - occupied) / 2 : 0

  let cursor = 0
  return items.map((item) => {
    const start = cursor
    cursor += item.visualWeight
    return {
      ...item,
      startPercent: startOffset + (start / total) * occupied,
      widthPercent: (item.visualWeight / total) * occupied,
    }
  })
}

export function groupMadaniLineSegments(line = {}, options = {}) {
  const typical = options.typicalWeight ?? options.typicalChars ?? 40
  const laidOut = (line.words || []).some(word => Number.isFinite(Number(word?.startPercent)))
    ? line.words
    : layoutMadaniOverlayWords(line.words || [], { typicalWeight: typical })

  const segments = []
  for (const word of laidOut) {
    const verseKey = word?.verseKey
    if (!verseKey) continue
    const last = segments[segments.length - 1]
    if (!last || last.verseKey !== verseKey) {
      segments.push({
        verseKey,
        words: [word],
      })
    } else {
      last.words.push(word)
    }
  }
  return segments.map((segment) => {
    const textWords = highlightableMadaniWords(segment.words)
    const boxWords = textWords.length ? textWords : segment.words
    const start = Math.min(...boxWords.map(word => Number(word.startPercent) || 0))
    const end = Math.max(...boxWords.map(word => (
      (Number(word.startPercent) || 0) + (Number(word.widthPercent) || 0)
    )))
    return {
      ...segment,
      wordCount: textWords.length,
      charCount: madaniSegmentCharCount({ words: textWords }),
      startPercent: start,
      widthPercent: Math.max(0, end - start),
    }
  })
}

export function madaniSegmentCharCount(segment = {}) {
  return (segment.words || []).reduce((sum, word) => (
    sum + String(word.textQpc || word.text || '').replace(/\s+/g, '').length
  ), 0)
}

export function typicalMadaniLineChars(lines = []) {
  const lengths = (lines || []).map(line => madaniSegmentCharCount({ words: line.words || [] }))
  const longest = Math.max(0, ...lengths)
  return Math.max(36, longest)
}

export function typicalMadaniLineWeight(lines = []) {
  const lengths = (lines || []).map(line => (
    (line.words || []).reduce((sum, word) => sum + madaniWordVisualWeight(word), 0)
  ))
  return Math.max(36, ...lengths, 0)
}

export function layoutMadaniOverlaySegments(segments = [], { typicalChars = 40 } = {}) {
  const words = []
  for (const segment of segments || []) {
    for (const word of segment.words || []) {
      words.push({
        ...word,
        verseKey: word.verseKey || segment.verseKey,
      })
    }
  }
  if (!words.length) {
    return (segments || []).map((segment, index) => ({
      ...segment,
      startPercent: 0,
      widthPercent: index === 0 ? 100 : 0,
    }))
  }
  return groupMadaniLineSegments({ words }, { typicalWeight: typicalChars })
}
