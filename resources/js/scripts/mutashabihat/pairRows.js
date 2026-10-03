import { buildAyahComparison } from './compareAyahs.js'

const lookupCache = new WeakMap()
const comparisonCache = new Map()

function verseRecordKey(row) {
  if (!row) return ''
  const key = String(row.key || row.verse_key || row.verseKey || '').trim()
  if (/^\d{1,3}:\d{1,3}$/.test(key)) return key
  const surah = Number(row.surah ?? row.chapterId ?? row.surah_number ?? 0)
  const ayah = Number(row.ayah ?? row.number ?? row.numberInSurah ?? row.ayah_number ?? 0)
  return surah > 0 && ayah > 0 ? `${surah}:${ayah}` : ''
}

function verseArabic(row) {
  return String(row?.arabic || row?.text || '').trim()
}

function verseTranslation(row) {
  return String(row?.translation || '').trim()
}

export function getVerseLookup(ctx) {
  const index = ctx?.quranSearchIndex
  if (Array.isArray(index) && index.length) {
    let map = lookupCache.get(index)
    if (!map) {
      map = new Map()
      for (const row of index) {
        const key = verseRecordKey(row)
        if (key) map.set(key, row)
      }
      lookupCache.set(index, map)
    }
    return map
  }

  const map = new Map()
  const extras = ctx?.verses || []
  const mushaf = ctx?.mushafDisplayVerses || []
  for (const row of extras) {
    const key = verseRecordKey(row)
    if (key && !map.has(key)) map.set(key, row)
  }
  for (const row of mushaf) {
    const key = verseRecordKey(row)
    if (key && !map.has(key)) map.set(key, row)
  }
  const cache = ctx?.mutashabihatAyahByKey
  if (cache && typeof cache === 'object') {
    for (const [key, row] of Object.entries(cache)) {
      if (key && !map.has(key)) map.set(key, row)
    }
  }
  return map
}

function lookupVerse(ctx, verseKey) {
  const vk = String(verseKey || '').trim()
  if (!vk) return null
  return getVerseLookup(ctx).get(vk) || null
}

export function resolveArabicFromSearchIndex(indexOrCtx, verseKey) {
  if (Array.isArray(indexOrCtx)) {
    return resolveArabicFromSearchIndex({ quranSearchIndex: indexOrCtx }, verseKey)
  }
  return verseArabic(lookupVerse(indexOrCtx, verseKey))
}

export function resolveTranslationFromSearchIndex(indexOrCtx, verseKey) {
  if (Array.isArray(indexOrCtx)) {
    return resolveTranslationFromSearchIndex({ quranSearchIndex: indexOrCtx }, verseKey)
  }
  return verseTranslation(lookupVerse(indexOrCtx, verseKey))
}

function getCachedComparison(leftArabic, rightArabic) {
  if (!leftArabic || !rightArabic) return null
  const cacheKey = `${leftArabic}\u0000${rightArabic}`
  let comparison = comparisonCache.get(cacheKey)
  if (!comparison) {
    comparison = buildAyahComparison(leftArabic, rightArabic)
    if (comparisonCache.size > 400) comparisonCache.clear()
    comparisonCache.set(cacheKey, comparison)
  }
  return comparison
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function previewFromPlain(text) {
  const tokens = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return ''
  if (tokens.length <= 16) return escapeHtml(tokens.join(' '))
  const visible = Math.max(8, Math.ceil(tokens.length / 2))
  const start = Math.max(0, Math.floor((tokens.length - visible) / 2))
  const slice = tokens.slice(start, start + visible)
  const lead = start > 0 ? '… ' : ''
  const tail = start + visible < tokens.length ? ' …' : ''
  return `${lead}${escapeHtml(slice.join(' '))}${tail}`
}

export function formatVerseLabel(ctx, verseKey, { withName = true, separator = ' ' } = {}) {
  const vk = String(verseKey || '').trim()
  if (!vk) return ''
  const [s, a] = vk.split(':')
  const name = ctx?.getChapterLatinName?.(Number(s)) || ''
  if (withName && name) return `${name}${separator}${s}:${a}`
  return `${s}:${a}`
}

export function formatPairTitle(ctx, pair) {
  if (!pair) return ''
  const left = pair.verse_key_1 || `${pair.surah_number_1}:${pair.ayah_number_1}`
  const right = pair.verse_key_2 || `${pair.surah_number_2}:${pair.ayah_number_2}`
  return `${formatVerseLabel(ctx, left)} ↔ ${formatVerseLabel(ctx, right)}`
}

/**
 * @param {object} ctx
 * @param {{ pair: object, progress?: object, status: string }} merged
 */
export function buildMutashabihatCardRow(ctx, merged) {
  const pair = merged?.pair
  if (!pair) return null
  const leftKey = pair.verse_key_1 || `${pair.surah_number_1}:${pair.ayah_number_1}`
  const rightKey = pair.verse_key_2 || `${pair.surah_number_2}:${pair.ayah_number_2}`
  const leftHit = lookupVerse(ctx, leftKey)
  const rightHit = lookupVerse(ctx, rightKey)
  const leftArabic = verseArabic(leftHit)
  const rightArabic = verseArabic(rightHit)
  const comparison = (leftArabic && rightArabic)
    ? getCachedComparison(leftArabic, rightArabic)
    : null
  const status = merged.status || 'new'
  const leftPreviewHtml = (comparison?.leftPreviewHtml && leftArabic)
    ? comparison.leftPreviewHtml
    : previewFromPlain(leftArabic)
  const rightPreviewHtml = (comparison?.rightPreviewHtml && rightArabic)
    ? comparison.rightPreviewHtml
    : previewFromPlain(rightArabic)

  return {
    key: `pair-${pair.pair_key || pair.id || leftKey}`,
    pair,
    progress: merged.progress || null,
    status,
    statusLabel: ctx.mutashabihatStatusLabelFor?.(status) || status,
    leftVerseKey: leftKey,
    rightVerseKey: rightKey,
    leftName: ctx.getChapterLatinName?.(Number(String(leftKey).split(':')[0])) || '',
    rightName: ctx.getChapterLatinName?.(Number(String(rightKey).split(':')[0])) || '',
    leftLabel: formatVerseLabel(ctx, leftKey),
    rightLabel: formatVerseLabel(ctx, rightKey),
    leftCompareLabel: formatVerseLabel(ctx, leftKey, { separator: ' · ' }),
    rightCompareLabel: formatVerseLabel(ctx, rightKey, { separator: ' · ' }),
    pairLabel: formatPairTitle(ctx, pair),
    leftArabic,
    rightArabic,
    leftTranslation: verseTranslation(leftHit),
    rightTranslation: verseTranslation(rightHit),
    leftPreviewHtml,
    rightPreviewHtml,
    leftHtml: comparison?.leftHtml || escapeHtml(leftArabic),
    rightHtml: comparison?.rightHtml || escapeHtml(rightArabic),
    leftPhrase: comparison?.leftPhrase || '',
    rightPhrase: comparison?.rightPhrase || '',
    expected_verse_key: merged.progress?.expected_verse_key || leftKey,
    hasArabic: !!(leftArabic || rightArabic),
  }
}
