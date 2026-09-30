/** @typedef {'rtl' | 'ltr'} MushafDirection */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   variant: string,
 *   pageCount: number,
 *   defaultLinesPerPage: number,
 *   direction: MushafDirection,
 *   fontFamily: string,
 *   fontUrl: string | null,
 *   fontStrategy: 'qpc-page-glyphs' | 'unicode-text',
 *   dataRoot: string,
 *   pagesDirectory: string,
 *   versePageMapFile: string,
 *   pageFilePadding: number,
 *   publicPagesBase: string | null,
 * }} MushafLayout
 */

export const MUSHAF_LAYOUT_MADANI_V2 = 'madani-v2'
export const MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH = 'indopak-15-qudratullah'
export const DEFAULT_MUSHAF_LAYOUT_ID = MUSHAF_LAYOUT_MADANI_V2

/** @type {Readonly<Record<string, MushafLayout>>} */
export const MUSHAF_LAYOUTS = Object.freeze({
  [MUSHAF_LAYOUT_MADANI_V2]: Object.freeze({
    id: MUSHAF_LAYOUT_MADANI_V2,
    name: 'Madani',
    variant: 'V2',
    pageCount: 604,
    defaultLinesPerPage: 15,
    direction: 'rtl',
    fontFamily: 'QCF2',
    fontUrl: null,
    fontStrategy: 'qpc-page-glyphs',
    dataRoot: 'public/quran/madani-v2',
    pagesDirectory: 'pages',
    versePageMapFile: 'verse-pages.json',
    pageFilePadding: 3,
    publicPagesBase: '/quran/madani-v2/pages',
  }),
  [MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH]: Object.freeze({
    id: MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
    name: 'IndoPak 15 Lines',
    variant: 'Qudratullah',
    pageCount: 610,
    defaultLinesPerPage: 15,
    direction: 'rtl',
    fontFamily: 'IndopakNastaleeq',
    fontUrl: '/indopak/font/indopak-nastaleeq.woff2',
    fontStrategy: 'unicode-text',
    dataRoot: 'resources/quran/indopak-15-qudratullah/generated',
    pagesDirectory: 'pages',
    versePageMapFile: 'verse-page-map.json',
    pageFilePadding: 0,
    publicPagesBase: null,
  }),
})
export function listMushafLayouts() {
  return Object.freeze(Object.values(MUSHAF_LAYOUTS))
}

export function isMushafLayoutId(id) {
  return Object.prototype.hasOwnProperty.call(MUSHAF_LAYOUTS, String(id || ''))
}

/**
 * @param {string | MushafLayout | null | undefined} idOrLayout
 * @returns {MushafLayout}
 */
export function getMushafLayout(idOrLayout = DEFAULT_MUSHAF_LAYOUT_ID) {
  if (idOrLayout && typeof idOrLayout === 'object' && idOrLayout.id && Number(idOrLayout.pageCount) > 0) {
    return idOrLayout
  }
  const id = String(idOrLayout || DEFAULT_MUSHAF_LAYOUT_ID)
  const layout = MUSHAF_LAYOUTS[id]
  if (!layout) {
    throw new Error(`Unknown mushaf layout [${id}]. Known layouts: ${Object.keys(MUSHAF_LAYOUTS).join(', ')}.`)
  }
  return layout
}

export function mushafPageCount(idOrLayout = DEFAULT_MUSHAF_LAYOUT_ID) {
  return getMushafLayout(idOrLayout).pageCount
}

export function clampMushafPage(page, idOrLayout = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(idOrLayout)
  const n = Number(page)
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(layout.pageCount, Math.trunc(n)))
}

export function mushafPageFileName(page, idOrLayout = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(idOrLayout)
  const n = clampMushafPage(page, layout)
  if (layout.pageFilePadding > 0) {
    return `${String(n).padStart(layout.pageFilePadding, '0')}.json`
  }
  return `${n}.json`
}

export function mushafPageJsonUrl(page, idOrLayout = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(idOrLayout)
  const fileName = mushafPageFileName(page, layout)
  if (layout.publicPagesBase) {
    return `${layout.publicPagesBase.replace(/\/$/, '')}/${fileName}`
  }
  return `${layout.dataRoot.replace(/\/$/, '')}/${layout.pagesDirectory}/${fileName}`
}
