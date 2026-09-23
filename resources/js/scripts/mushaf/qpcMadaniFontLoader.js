import { clampMadaniPage } from './madaniPagePair.js'
import { loadMadaniPageLeaf } from './qpcMadaniPageData.js'

/** @type {Set<string>} */
const loadedFamilies = new Set()

/** @type {Map<string, Promise<string>>} */
const loadingFamilies = new Map()

function familyKey(pageNumber, fontFamily) {
  return `${clampMadaniPage(pageNumber)}:${String(fontFamily || '').trim()}`
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
    document.fonts.add(face)
    await face.load()
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
 * @param {number[]} pageNumbers
 */
export function prefetchQpcMadaniPageFonts(pageNumbers) {
  const pages = [...new Set(pageNumbers.map((n) => clampMadaniPage(n)).filter(Boolean))]
  pages.forEach((page) => {
    void loadMadaniPageLeaf(page)
      .then((leaf) => ensureQpcMadaniPageFont(page, leaf.fontFamily, leaf.fontUrl))
      .catch(() => {})
  })
}

export function clearQpcMadaniFontCacheForTests() {
  loadedFamilies.clear()
  loadingFamilies.clear()
}
