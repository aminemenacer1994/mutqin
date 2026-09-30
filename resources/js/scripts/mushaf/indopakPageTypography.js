/**
 * IndoPak 15 Lines — Qudratullah typography & responsive fit.
 * Nastaleeq metrics differ from Madani QCF — do not reuse Madani values blindly.
 */

import {
  DEFAULT_MUSHAF_LAYOUT_ID,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
} from './mushafLayouts.js'

function isIndopakLayoutId(layoutId) {
  return String(layoutId || '') === MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH
}

/** Madani QCF two-page threshold (unchanged). */
export const MADANI_TWO_PAGE_MIN_WIDTH = 1080

/**
 * IndoPak needs a wider viewport before two leaves stay comfortably readable
 * (taller Nastaleeq metrics + 15 fixed lines).
 */
export const INDOPAK_TWO_PAGE_MIN_WIDTH = 1200

/**
 * Layout-scoped CSS custom properties applied on `.qpc-madani-page--indopak`.
 * Fit still sets `--qpc-word-size` in px at runtime; these are the base geometry.
 */
export const INDOPAK_PAGE_TYPOGRAPHY = Object.freeze({
  /** Fallback before fit; slightly larger for readability. */
  wordSize: '19px',
  /** Nastaleeq needs more leading than QCF page glyphs (Madani ≈ 1.32). */
  lineHeight: '1.92',
  /** Min row band for 15-line geometry (Madani ≈ 1.62). */
  lineMinHeight: '2.02',
  /** Extra gap between ayah lines as a multiple of word-size (Madani ≈ 0). */
  lineGap: '0.08',
  /** Surah banner scale vs word-size — cleaner container title. */
  surahTitleScale: '2.35',
  /** Sheet padding (block / inline) — single & borderless mobile. */
  pagePaddingBlock: '0.62rem',
  pagePaddingInline: '0.48rem',
  /** Embedded / desktop spread sheet padding. */
  embeddedPaddingBlock: '1.15rem',
  embeddedPaddingInline: '1.05rem',
  /** Mobile borderless sides — enough to avoid Nastaleeq clipping, no H-scroll. */
  mobilePaddingInline: '0.42rem',
  mobilePaddingBlock: '0.55rem',
})

/**
 * Fit caps for IndoPak (px). Tuned for Unicode Nastaleeq — not Madani QCF caps.
 *
 * @param {{ mobile?: boolean, narrow?: boolean, desktopSpread?: boolean, sessionSheet?: boolean }} ctx
 */
export function indopakFitWordSizeCap(ctx = {}) {
  const { mobile = false, narrow = false, desktopSpread = false, sessionSheet = false } = ctx
  if (desktopSpread) return narrow ? 40 : 50
  if (sessionSheet) return narrow ? 46 : 54
  if (mobile) return narrow ? 42 : 50
  return narrow ? 36 : 42
}

/**
 * Width safety factor for IndoPak fit (slightly tighter than Madani).
 *
 * @param {{ mobile?: boolean, narrow?: boolean, desktopSpread?: boolean, sessionSheet?: boolean, embedded?: boolean }} ctx
 */
export function indopakFitSafety(ctx = {}) {
  const {
    mobile = false,
    narrow = false,
    desktopSpread = false,
    sessionSheet = false,
    embedded = false,
  } = ctx
  if (sessionSheet) return 0.96
  if (desktopSpread && embedded) return narrow ? 0.88 : 0.92
  if (embedded || sessionSheet) return narrow ? 0.86 : 0.9
  if (mobile) return 0.9
  return narrow ? 0.88 : 0.92
}

export function mushafTwoPageMinWidth(layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  if (isIndopakLayoutId(layoutId)) return INDOPAK_TWO_PAGE_MIN_WIDTH
  return MADANI_TWO_PAGE_MIN_WIDTH
}

/**
 * Two leaves only when the viewport is wide enough for the active layout.
 * Mobile (<768) is always single page at the call site.
 *
 * @param {number} width
 * @param {string} [layoutId]
 */
export function shouldShowTwoMushafPages(width, layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  return Number(width) >= mushafTwoPageMinWidth(layoutId)
}

/**
 * Apply IndoPak typography custom properties on a page root element.
 * @param {HTMLElement | null | undefined} root
 */
export function applyIndopakPageTypographyVars(root) {
  if (!(root instanceof HTMLElement)) return
  const t = INDOPAK_PAGE_TYPOGRAPHY
  root.style.setProperty('--qpc-line-height', t.lineHeight)
  root.style.setProperty('--qpc-line-min-height', t.lineMinHeight)
  root.style.setProperty('--qpc-line-gap', t.lineGap)
  root.style.setProperty('--qpc-surah-title-scale', t.surahTitleScale)
  root.style.setProperty('--qpc-page-padding-block', t.pagePaddingBlock)
  root.style.setProperty('--qpc-page-padding-inline', t.pagePaddingInline)
  root.style.setProperty('--indopak-embedded-padding-block', t.embeddedPaddingBlock)
  root.style.setProperty('--indopak-embedded-padding-inline', t.embeddedPaddingInline)
  root.style.setProperty('--indopak-mobile-padding-block', t.mobilePaddingBlock)
  root.style.setProperty('--indopak-mobile-padding-inline', t.mobilePaddingInline)
  if (!root.style.getPropertyValue('--qpc-word-size')) {
    root.style.setProperty('--qpc-word-size', t.wordSize)
  }
}

export function clearIndopakPageTypographyVars(root) {
  if (!(root instanceof HTMLElement)) return
  ;[
    '--qpc-line-height',
    '--qpc-line-min-height',
    '--qpc-line-gap',
    '--qpc-surah-title-scale',
    '--qpc-page-padding-block',
    '--qpc-page-padding-inline',
    '--indopak-embedded-padding-block',
    '--indopak-embedded-padding-inline',
    '--indopak-mobile-padding-block',
    '--indopak-mobile-padding-inline',
  ].forEach((name) => root.style.removeProperty(name))
}

export {
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
}
