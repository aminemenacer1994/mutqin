import { clampMadaniPage } from './madaniPagePair.js'

/** @type {Set<string>} */
const loadedFamilies = new Set()

/** @type {Map<string, Promise<string>>} */
const loadingFamilies = new Map()

/** @type {Set<string>} */
const preloadedUrls = new Set()

function familyKey(pageNumber, fontFamily) {
  return `${clampMadaniPage(pageNumber)}:${String(fontFamily || '').trim()}`
}

/** Deterministic Madani V2 page face — matches QpcV2PageAdapter::pageFontFamily. */
export function madaniPageFontFamily(pageNumber) {
  const page = clampMadaniPage(pageNumber)
  return `QCF2${String(page).padStart(3, '0')}`
}

/** Local woff2 path — matches MadaniV2StaticPaths::fontUrl. */
export function madaniPageFontUrl(pageNumber) {
  const page = clampMadaniPage(pageNumber)
  return `/madani/font/p${page}.woff2`
}

export function isQpcMadaniPageFontLoaded(pageNumber, fontFamily = '') {
  const page = clampMadaniPage(pageNumber)
  const family = String(fontFamily || madaniPageFontFamily(page)).trim()
  return loadedFamilies.has(familyKey(page, family))
}

/**
 * Hint the browser to fetch the page face early (parallel with page JSON).
 * @param {string} fontUrl
 */
export function preloadQpcMadaniFontUrl(fontUrl) {
  const url = String(fontUrl || '').trim()
  if (!url || typeof document === 'undefined') return
  if (preloadedUrls.has(url)) return
  preloadedUrls.add(url)
  try {
    if (document.head?.querySelector?.(`link[data-qpc-font-preload="${url}"]`)) return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = 'font/woff2'
    link.crossOrigin = 'anonymous'
    link.href = url
    link.setAttribute('data-qpc-font-preload', url)
    document.head.appendChild(link)
  } catch {
    // Preload is best-effort; FontFace.load still fetches.
  }
}

/**
 * Never trust FontFaceSet.check for QCF page families.
 * Browsers report true when a fallback can paint the Presentation-Form
 * codepoints, which renders garbage ligatures instead of Madani glyphs.
 *
 * @param {number} pageNumber
 * @param {string} fontFamily
 * @param {string} fontUrl
 */
export async function ensureQpcMadaniPageFont(pageNumber, fontFamily, fontUrl) {
  const page = clampMadaniPage(pageNumber)
  const family = String(fontFamily || '').trim()
  const url = String(fontUrl || '').trim()
  if (!family || !url) {
    throw new Error(`QPC page font metadata missing for page ${page}`)
  }

  const key = familyKey(page, family)
  if (loadedFamilies.has(key)) {
    return family
  }
  if (loadingFamilies.has(key)) {
    return loadingFamilies.get(key)
  }

  preloadQpcMadaniFontUrl(url)

  const promise = (async () => {
    if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
      loadedFamilies.add(key)
      return family
    }

    const face = new FontFace(family, `url("${url}") format("woff2")`, {
      display: 'block',
      style: 'normal',
      weight: 'normal',
    })
    // Load bytes first, then register — avoids a paint using an incomplete face.
    await face.load()
    document.fonts.add(face)
    loadedFamilies.add(key)
    return family
  })()

  loadingFamilies.set(key, promise)
  try {
    return await promise
  } finally {
    loadingFamilies.delete(key)
  }
}

/**
 * Warm a page face from the known Madani V2 URL/family without waiting on page JSON.
 * @param {number} pageNumber
 */
export function warmQpcMadaniPageFont(pageNumber) {
  const page = clampMadaniPage(pageNumber)
  return ensureQpcMadaniPageFont(page, madaniPageFontFamily(page), madaniPageFontUrl(page))
}

/**
 * @param {number[]} pageNumbers
 */
export function prefetchQpcMadaniPageFonts(pageNumbers) {
  const pages = [...new Set(pageNumbers.map((n) => clampMadaniPage(n)).filter(Boolean))]
  pages.forEach((page) => {
    preloadQpcMadaniFontUrl(madaniPageFontUrl(page))
    void warmQpcMadaniPageFont(page).catch(() => {})
  })
}

export function clearQpcMadaniFontCacheForTests() {
  loadedFamilies.clear()
  loadingFamilies.clear()
  preloadedUrls.clear()
}
