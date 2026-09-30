import {
  getMushafLayout,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
} from './mushafLayouts.js'

/** Dedicated family — never reuse QCF page glyph names. */
export const INDOPAK_NASTALEEQ_FONT_FAMILY = 'IndopakNastaleeq'

export const INDOPAK_NASTALEEQ_FONT_URL = '/indopak/font/indopak-nastaleeq.woff2'

/**
 * Unicode Quran text stack for IndoPak. Primary face first; Arabic-friendly
 * Nastaliq/Naskh fallbacks if the local WOFF2 fails to load.
 */
export const INDOPAK_NASTALEEQ_FONT_STACK =
  `'${INDOPAK_NASTALEEQ_FONT_FAMILY}', 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Amiri Quran', 'Noto Naskh Arabic', 'Traditional Arabic', serif`

/** @type {Promise<string> | null} */
let loadingPromise = null

let loaded = false

export function isIndopakNastaleeqLayout(layoutId) {
  return String(layoutId || '') === MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH
}

export function isIndopakNastaleeqFontLoaded() {
  return loaded
}

/**
 * CSS font-family stack for a mushaf layout.
 * IndoPak → IndopakNastaleeq + Arabic fallbacks.
 * Madani / others → null (caller keeps QPC page fonts / existing behaviour).
 *
 * @param {string | { id?: string } | null | undefined} layoutIdOrLayout
 * @returns {string | null}
 */
export function mushafUnicodeFontStack(layoutIdOrLayout) {
  const id = typeof layoutIdOrLayout === 'object' && layoutIdOrLayout
    ? String(layoutIdOrLayout.id || '')
    : String(layoutIdOrLayout || '')
  if (!isIndopakNastaleeqLayout(id)) return null
  return INDOPAK_NASTALEEQ_FONT_STACK
}

/**
 * Load the local IndoPak Nastaleeq WOFF2 once.
 * Uses font-display: swap (Unicode text — fallback is readable).
 * Does not touch QCF / Madani page-font loaders.
 *
 * @returns {Promise<string>}
 */
export async function loadIndopakNastaleeqFont() {
  if (loaded) return INDOPAK_NASTALEEQ_FONT_FAMILY
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
      loaded = true
      return INDOPAK_NASTALEEQ_FONT_FAMILY
    }

    try {
      const face = new FontFace(
        INDOPAK_NASTALEEQ_FONT_FAMILY,
        `url("${INDOPAK_NASTALEEQ_FONT_URL}") format("woff2")`,
        {
          display: 'swap',
          style: 'normal',
          weight: 'normal',
        },
      )
      document.fonts.add(face)
      await face.load()
      loaded = true
      return INDOPAK_NASTALEEQ_FONT_FAMILY
    } catch (error) {
      console.warn('[indopakNastaleeqFont] Failed to load IndopakNastaleeq', error)
      // Soft-fail: callers still use the fallback stack.
      return INDOPAK_NASTALEEQ_FONT_FAMILY
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

/**
 * Ensure the IndoPak face is loaded only when that layout is active.
 * Madani V2 and unknown layouts are no-ops and never load this font.
 *
 * @param {string | { id?: string } | null | undefined} layoutIdOrLayout
 * @returns {Promise<string | null>} Font family when applicable, otherwise null.
 */
export async function ensureIndopakNastaleeqFontForLayout(layoutIdOrLayout) {
  const id = typeof layoutIdOrLayout === 'object' && layoutIdOrLayout
    ? String(layoutIdOrLayout.id || '')
    : String(layoutIdOrLayout || '')

  if (!isIndopakNastaleeqLayout(id)) {
    return null
  }

  // Validate against the central registry when a string id is passed.
  if (typeof layoutIdOrLayout !== 'object') {
    getMushafLayout(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
  }

  await loadIndopakNastaleeqFont()
  return INDOPAK_NASTALEEQ_FONT_FAMILY
}

/**
 * Apply IndoPak CSS vars only for that layout. Clears them for other layouts
 * so Madani QPC glyph styling is never overridden by this face.
 *
 * @param {string | { id?: string } | null | undefined} layoutIdOrLayout
 * @param {ParentNode|Document|Element|null} [root]
 * @returns {Promise<string | null>}
 */
export async function applyIndopakNastaleeqFontForLayout(
  layoutIdOrLayout,
  root = typeof document !== 'undefined' ? document.documentElement : null,
) {
  const stack = mushafUnicodeFontStack(layoutIdOrLayout)
  if (!root || typeof root.style?.setProperty !== 'function') {
    if (!stack) return null
    await ensureIndopakNastaleeqFontForLayout(layoutIdOrLayout)
    return INDOPAK_NASTALEEQ_FONT_FAMILY
  }

  if (!stack) {
    root.style.removeProperty('--indopak-nastaleeq-font')
    if (typeof root.removeAttribute === 'function') {
      root.removeAttribute('data-indopak-nastaleeq-font')
    }
    return null
  }

  root.style.setProperty('--indopak-nastaleeq-font', stack)
  if (typeof root.setAttribute === 'function') {
    root.setAttribute('data-indopak-nastaleeq-font', '1')
  }
  await ensureIndopakNastaleeqFontForLayout(layoutIdOrLayout)
  return INDOPAK_NASTALEEQ_FONT_FAMILY
}

export function resetIndopakNastaleeqFontForTests() {
  loaded = false
  loadingPromise = null
}
