import pairsData from '../../../data/mutashabihat_pairs.json'

function importedPairList() {
  const raw = pairsData && pairsData.default !== undefined ? pairsData.default : pairsData
  return Array.isArray(raw) ? raw : []
}

export function resolveVerseKey(source = {}) {
  const key = String(source?.key || source?.verse_key || source?.verseKey || '').trim()
  if (/^\d{1,3}:\d{1,3}$/.test(key)) return key
  const surah = Number(source?.surah || source?.surah_number || source?.chapter || source?.chapterId || 0)
  let ayah = source?.ayah ?? source?.ayah_number ?? source?.numberInSurah ?? source?.number
  if (typeof ayah === 'string' && ayah.includes(':')) {
    ayah = ayah.split(':').pop()
  }
  ayah = Number(ayah)
  return surah > 0 && ayah > 0 ? `${surah}:${ayah}` : ''
}

function verseKey(surah, ayah) {
  return `${Number(surah)}:${Number(ayah)}`
}

function canonicalPairEntry(raw, index) {
  const a = raw?.a
  const b = raw?.b
  if (!Array.isArray(a) || !Array.isArray(b)) return null
  const vk1 = verseKey(a[0], a[1])
  const vk2 = verseKey(b[0], b[1])
  const keys = [vk1, vk2].sort()
  return {
    id: index + 1,
    verse_key_1: vk1,
    verse_key_2: vk2,
    surah_number_1: Number(a[0]),
    ayah_number_1: Number(a[1]),
    surah_number_2: Number(b[0]),
    ayah_number_2: Number(b[1]),
    pair_key: keys.join('|'),
  }
}

/** @type {Map<string, object[]>} */
let byVerseKey = null

function ensureIndex() {
  if (byVerseKey) return byVerseKey
  byVerseKey = new Map()
  const list = importedPairList()
  list.forEach((raw, index) => {
    const entry = canonicalPairEntry(raw, index)
    if (!entry) return
    for (const vk of [entry.verse_key_1, entry.verse_key_2]) {
      if (!byVerseKey.has(vk)) byVerseKey.set(vk, [])
      byVerseKey.get(vk).push(entry)
    }
  })
  return byVerseKey
}

export function listAllMutashabihatPairs() {
  ensureIndex()
  const seen = new Set()
  const out = []
  for (const entries of byVerseKey.values()) {
    for (const entry of entries) {
      if (seen.has(entry.pair_key)) continue
      seen.add(entry.pair_key)
      out.push(entry)
    }
  }
  return out.sort((a, b) => a.id - b.id)
}

export function findPairsForVerseKey(verseKeyInput) {
  const vk = String(verseKeyInput || '').trim()
  if (!vk) return []
  return [...(ensureIndex().get(vk) || [])]
}

/**
 * Merge server pair rows (post-seed) into the in-memory index without duplicating pair_key.
 *
 * @param {object[]} apiPairs
 */
export function registerApiMutashabihatPairs(apiPairs = []) {
  const map = ensureIndex()
  for (const row of apiPairs) {
    const vk1 = String(row?.verse_key_1 || '').trim()
    const vk2 = String(row?.verse_key_2 || '').trim()
    if (!vk1 || !vk2) continue
    const pairKey = String(row?.pair_key || [vk1, vk2].sort().join('|'))
    const entry = {
      id: Number(row?.id) || 0,
      verse_key_1: vk1,
      verse_key_2: vk2,
      surah_number_1: Number(row?.surah_number_1 || vk1.split(':')[0]),
      ayah_number_1: Number(row?.ayah_number_1 || vk1.split(':')[1]),
      surah_number_2: Number(row?.surah_number_2 || vk2.split(':')[0]),
      ayah_number_2: Number(row?.ayah_number_2 || vk2.split(':')[1]),
      pair_key: pairKey,
    }
    for (const vk of [vk1, vk2]) {
      const list = map.get(vk) || []
      if (list.some((item) => item.pair_key === pairKey)) continue
      list.push(entry)
      map.set(vk, list)
    }
  }
}

export function otherVerseKeyInPair(pair, anchorVerseKey) {
  const anchor = String(anchorVerseKey || '').trim()
  if (!pair) return ''
  if (pair.verse_key_1 === anchor) return pair.verse_key_2
  if (pair.verse_key_2 === anchor) return pair.verse_key_1
  return pair.verse_key_2
}

export function resolvePairById(pairId) {
  const id = Number(pairId)
  if (!Number.isFinite(id) || id <= 0) return null
  return listAllMutashabihatPairs().find((p) => p.id === id) || null
}
