/**
 * Phone-only mushaf geometry.
 *
 * Full ayah rows justify edge-to-edge. Leftover rows (a few words) are centred.
 * Empty printed slots are dropped so pages do not leave a blank band.
 * One word-size per page; shrink until no row overflows.
 */

export const MOBILE_MUSHAF_HAIRLINE_PX = 6
export const MOBILE_MUSHAF_SPARSE_RATIO = 0.62
/** Desktop/tablet: centre anything that is not nearly full (avoids huge word gaps). */
export const DESKTOP_MUSHAF_SPARSE_RATIO = 0.9
export const MOBILE_MUSHAF_QCF_FIT_SAFETY = 0.88
export const MOBILE_MUSHAF_INDOPAK_FIT_SAFETY = 0.9

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
} = {}) {
  const natural = Number(naturalWidth)
  const available = Number(availableWidth)
  const words = Math.trunc(Number(wordCount) || 0)
  if (!(natural > 0) || !(available > 0)) return false
  // A handful of leftover words must never stretch edge-to-edge.
  if (words > 0 && words <= 4) return true
  if (words > 5) return natural < available * Math.max(0.5, ratio * 0.72)
  return natural < available * ratio
}

export function mobileMushafAyahJustify(sparse) {
  return sparse ? 'center' : 'space-between'
}

export function qcfSideBearingPx(wordSize) {
  const size = Number(wordSize)
  if (!(size > 0)) return 4
  return Math.max(4, Math.round(size * 0.08))
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
