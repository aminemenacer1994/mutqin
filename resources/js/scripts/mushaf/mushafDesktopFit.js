/**
 * Desktop two-page mushaf geometry.
 * Size from the viewport only — never from the current page's line widths —
 * so first/last spreads and surah-start pages stay the same as mid-mushaf pages.
 */

export const DESKTOP_SPREAD_LINE_SLOTS = 15
export const DESKTOP_SPREAD_FOLIO_RESERVE_PX = 36

/**
 * Word size that is identical for every page at the same viewport + zoom.
 *
 * @param {{
 *   measureSize?: number,
 *   safety?: number,
 *   cap?: number,
 *   fontScale?: number,
 *   heightFit?: number | null,
 * }} [input]
 */
export function desktopSpreadStableWordSize(input = {}) {
  const measureSize = Number(input.measureSize)
  const safety = Number(input.safety)
  const cap = Number(input.cap)
  const requested = Number.isFinite(Number(input.fontScale)) && Number(input.fontScale) > 0
    ? Number(input.fontScale)
    : 1
  if (!Number.isFinite(measureSize) || measureSize <= 0) return 8
  if (!Number.isFinite(safety) || safety <= 0) return 8
  if (!Number.isFinite(cap) || cap <= 0) return 8
  const widthFit = measureSize * safety
  const heightFit = Number(input.heightFit)
  const height = Number.isFinite(heightFit) && heightFit > 0 ? heightFit : Number.POSITIVE_INFINITY
  return Math.max(8, Math.round(Math.min(cap * requested, widthFit, height)))
}

/**
 * Height available for 15 printed lines on a desktop spread.
 * Folio reserve is constant so pages with/without a visible number stay aligned.
 *
 * @param {{
 *   targetHeight?: number,
 *   sheetPaddingY?: number,
 *   folioReserve?: number,
 * }} [input]
 */
export function desktopSpreadSheetHeight(input = {}) {
  const targetHeight = Number(input.targetHeight)
  const sheetPaddingY = Number(input.sheetPaddingY) || 0
  const folioReserve = Number.isFinite(Number(input.folioReserve))
    ? Number(input.folioReserve)
    : DESKTOP_SPREAD_FOLIO_RESERVE_PX
  if (!Number.isFinite(targetHeight) || targetHeight <= 0) return 160
  return Math.max(160, Math.round(targetHeight - folioReserve - sheetPaddingY))
}
