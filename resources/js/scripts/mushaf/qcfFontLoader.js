const CDN_BASE = 'https://verses.quran.foundation'
const loadedFonts = new Set()
const loadingFonts = new Map()
let surahNamesLoaded = null

export function qcfFontFamily(pageNumber, { tajweed = false } = {}) {
  const page = Math.max(1, Math.min(604, Number(pageNumber) || 1))
  return tajweed ? `p${page}-v4` : `p${page}-v2`
}

export function qcfLocalFontName(pageNumber, { tajweed = false } = {}) {
  const page = Math.max(1, Math.min(604, Number(pageNumber) || 1))
  const padded = String(page).padStart(3, '0')
  return tajweed ? `QCF4_P${padded}` : `QCF2${padded}`
}

export function qcfFontUrl(pageNumber, { tajweed = false } = {}) {
  const page = Math.max(1, Math.min(604, Number(pageNumber) || 1))
  if (tajweed) {
    return {
      woff2: `${CDN_BASE}/fonts/quran/hafs/v4/colrv1/woff2/p${page}.woff2`,
      woff: `${CDN_BASE}/fonts/quran/hafs/v4/colrv1/woff/p${page}.woff`,
      ttf: `${CDN_BASE}/fonts/quran/hafs/v4/colrv1/ttf/p${page}.ttf`
    }
  }
  return {
    woff2: `${CDN_BASE}/fonts/quran/hafs/v2/woff2/p${page}.woff2`,
    woff: `${CDN_BASE}/fonts/quran/hafs/v2/woff/p${page}.woff`,
    ttf: `${CDN_BASE}/fonts/quran/hafs/v2/ttf/p${page}.ttf`
  }
}

function qcfFontFaceSource(pageNumber, options = {}) {
  const localName = qcfLocalFontName(pageNumber, options)
  const urls = qcfFontUrl(pageNumber, options)
  return `local('${localName}'), url('${urls.woff2}') format('woff2'), url('${urls.woff}') format('woff'), url('${urls.ttf}') format('truetype')`
}

export function isQcfFontLoaded(pageNumber, options = {}) {
  return loadedFonts.has(qcfFontFamily(pageNumber, options))
}

/**
 * Load a QCF page font. Never trust document.fonts.check() for missing families —
 * browsers report true (fallback available), which causes code_v2 Presentation Forms
 * to render as garbage ligatures instead of Madani glyphs.
 */
export async function loadQcfPageFont(pageNumber, options = {}) {
  const fontName = qcfFontFamily(pageNumber, options)
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
    return fontName
  }
  if (loadedFonts.has(fontName)) return fontName
  if (loadingFonts.has(fontName)) return loadingFonts.get(fontName)

  const promise = (async () => {
    try {
      const fontFace = new FontFace(fontName, qcfFontFaceSource(pageNumber, options))
      fontFace.display = 'block'
      document.fonts.add(fontFace)
      await fontFace.load()
      loadedFonts.add(fontName)
      return fontName
    } catch (error) {
      console.warn(`[qcfFontLoader] Failed to load ${fontName}`, error)
      throw error
    } finally {
      loadingFonts.delete(fontName)
    }
  })()

  loadingFonts.set(fontName, promise)
  return promise
}

export async function prefetchQcfPageFonts(pageNumbers = [], options = {}) {
  const unique = [...new Set((pageNumbers || []).map(n => Number(n)).filter(n => n >= 1 && n <= 604))]
  await Promise.all(unique.map(page => loadQcfPageFont(page, options).catch(() => null)))
  return unique.map(page => qcfFontFamily(page, options))
}

export const SURAH_NAMES_FONT_FAMILY = 'surahnames'
export const SURAH_NAMES_FONT_URL = `${CDN_BASE}/fonts/quran/surah-names/v1/sura_names.woff2`

export async function loadSurahNamesFont() {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
    return SURAH_NAMES_FONT_FAMILY
  }
  if (loadedFonts.has(SURAH_NAMES_FONT_FAMILY)) return SURAH_NAMES_FONT_FAMILY
  if (surahNamesLoaded) return surahNamesLoaded

  surahNamesLoaded = (async () => {
    try {
      const fontFace = new FontFace(
        SURAH_NAMES_FONT_FAMILY,
        `url('${SURAH_NAMES_FONT_URL}') format('woff2')`
      )
      fontFace.display = 'block'
      document.fonts.add(fontFace)
      await fontFace.load()
      loadedFonts.add(SURAH_NAMES_FONT_FAMILY)
    } catch (error) {
      console.warn('[qcfFontLoader] Failed to load SurahNames font', error)
    }
    return SURAH_NAMES_FONT_FAMILY
  })()

  return surahNamesLoaded
}

export function resetQcfFontLoaderForTests() {
  loadedFonts.clear()
  loadingFonts.clear()
  surahNamesLoaded = null
}
