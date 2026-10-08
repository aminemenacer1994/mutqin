/**
 * Phone mushaf geometry — same rules with tajweed ON or OFF.
 *
 * Full ayah rows justify edge-to-edge. Leftover rows (a few words) are centred.
 * Empty printed slots are dropped so pages do not leave a blank band.
 * One word-size per page; shrink until no row overflows the viewport.
 * Tajweed COLR and plain QCF both use the same caps, hairline, and sparse pack.
 */

/** Side bezel on phones — safe-area only; padding is applied separately. */
export const MOBILE_MUSHAF_HAIRLINE_PX = 0
export const MOBILE_MUSHAF_SPARSE_RATIO = 0.92
/** Desktop/tablet: centre anything that is not nearly full (avoids huge word gaps). */
export const DESKTOP_MUSHAF_SPARSE_RATIO = 0.96
/** Phone fit headroom — keep high so tajweed/plain rows fill the viewport width. */
export const MOBILE_MUSHAF_QCF_FIT_SAFETY = 0.96
export const MOBILE_MUSHAF_INDOPAK_FIT_SAFETY = 0.94
/** Never shrink phone ink below this — unreadably small mushaf pages. */
export const MOBILE_MUSHAF_WORD_SIZE_FLOOR = 22
/** Hard ceiling so short surahs (Kawthar) cannot blow up past a normal page. */
export const MOBILE_MUSHAF_WORD_SIZE_CAP = 30

/**
 * One phone word size for every page — dense or short, tajweed on or off.
 * Sized from the viewport, never from the shortest line (that is what blew up Kawthar).
 * This is the STARTING size; shrink-to-fit may only go down to the floor.
 */
export function mobileMushafWordSizePx(viewportWidth = 390) {
  const view = Number(viewportWidth)
  const inner = Math.max(240, (view > 0 ? view : 390) - MOBILE_MUSHAF_HAIRLINE_PX * 2)
  const fitted = Math.floor(inner / 13)
  return Math.max(
    MOBILE_MUSHAF_WORD_SIZE_FLOOR,
    Math.min(MOBILE_MUSHAF_WORD_SIZE_CAP, fitted),
  )
}

/** Clamp a fitted phone size into the readable band. */
export function clampMobileMushafWordSize(size) {
  const n = Math.round(Number(size) || 0)
  if (!(n > 0)) return MOBILE_MUSHAF_WORD_SIZE_FLOOR
  return Math.max(
    MOBILE_MUSHAF_WORD_SIZE_FLOOR,
    Math.min(MOBILE_MUSHAF_WORD_SIZE_CAP, n),
  )
}

export function mobileViewportInnerWidth(padLeft = 0, padRight = 0) {
  if (typeof window === 'undefined') return 0
  const viewW = window.visualViewport?.width || window.innerWidth || 0
  return Math.max(0, viewW - (Number(padLeft) || 0) - (Number(padRight) || 0))
}

function lineTypeOf(line) {
  return String(line?.line_type || line?.type || '').trim()
}

function isBasmalaType(type) {
  return type === 'basmala' || type === 'basmallah'
}

export function mobileMushafHairlinePadding(safeStart = 0, safeEnd = 0) {
  const start = Math.max(MOBILE_MUSHAF_HAIRLINE_PX, Number(safeStart) || 0)
  const end = Math.max(MOBILE_MUSHAF_HAIRLINE_PX, Number(safeEnd) || 0)
  return `${start}px ${end}px`
}

export function mobileMushafFitSafety({ indopak = false } = {}) {
  return indopak ? MOBILE_MUSHAF_INDOPAK_FIT_SAFETY : MOBILE_MUSHAF_QCF_FIT_SAFETY
}

export function isMobileMushafAyahSparse({
  naturalWidth,
  availableWidth,
  wordCount = 0,
  ratio = MOBILE_MUSHAF_SPARSE_RATIO,
  phone = false,
} = {}) {
  const natural = Number(naturalWidth)
  const available = Number(availableWidth)
  const words = Math.trunc(Number(wordCount) || 0)
  if (!(natural > 0) || !(available > 0)) return false
  // Leftover rows (a few words) stay centred on every viewport.
  if (words > 0 && words <= 8) return true
  // Phone + desktop: centre rows that do not nearly fill the painted width.
  // Phone uses a slightly looser threshold so tajweed under-measure (~90%)
  // still stretches, while clearly short rows (Fatihah tails) centre.
  const effectiveRatio = phone ? Math.min(Number(ratio) || MOBILE_MUSHAF_SPARSE_RATIO, 0.86) : ratio
  return natural < available * effectiveRatio
}

export function mobileMushafAyahJustify(sparse) {
  return sparse ? 'center' : 'space-between'
}

export function qcfSideBearingPx(wordSize) {
  const size = Number(wordSize)
  if (!(size > 0)) return 16
  // Diacritics and verse ornaments paint past the advance on both edges.
  return Math.max(16, Math.round(size * 0.32))
}

/** Strip hard breaks from painted tajweed/word HTML (never use layout BRs). */
export function stripMushafHtmlBreaks(html = '') {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/[\u2028\u2029\r\n]/g, '')
}

/**
 * Surah name, then a single Bismillah. Drop any Bismillah that sits above the title.
 * Empty printed slots are kept (desktop 15-line pages) unless the caller strips them.
 */
export function reorderMushafOpeningLines(lines = []) {
  const source = Array.isArray(lines) ? [...lines] : []
  const ordered = []
  let index = 0
  while (index < source.length) {
    const line = source[index]
    const next = source[index + 1]
    if (isBasmalaType(lineTypeOf(line)) && lineTypeOf(next) === 'surah_name') {
      ordered.push(next)
      const afterTitle = source[index + 2]
      if (isBasmalaType(lineTypeOf(afterTitle))) {
        ordered.push(afterTitle)
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
    if (isBasmalaType(lineTypeOf(line)) && prev && isBasmalaType(lineTypeOf(prev))) {
      continue
    }
    deduped.push(line)
  }
  return deduped
}

export function compactMobileMushafDisplayLines(lines = []) {
  const withoutEmpty = Array.isArray(lines)
    ? lines.filter((line) => lineTypeOf(line) !== 'empty')
    : []
  return reorderMushafOpeningLines(withoutEmpty)
}
