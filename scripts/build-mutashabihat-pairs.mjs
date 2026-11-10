/**
 * Rebuild mutashabihat_pairs.json from Al Quran Cloud quran-simple.
 * Usage: node scripts/build-mutashabihat-pairs.mjs [--write]
 *
 * Pairs must be near-duplicates with a real wording difference, checked with the
 * same overlap rules the practice UI uses.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareAyahTexts } from '../resources/js/scripts/mutashabihat/compareAyahs.js'
import { normalizeComparisonText } from '../resources/js/scripts/memorisation/quranTextNormalizer.js'
import {
  isValidVerseReference,
  MUTASHABIHAT_ARABIC_EDITION,
  mutashabihatOverlapMetrics,
  pairPassesOverlapQuality,
} from '../resources/js/scripts/mutashabihat/pairCatalog.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pairsPath = join(root, 'resources/data/mutashabihat_pairs.json')
const write = process.argv.includes('--write')

const STOP = new Set([
  'الله', 'من', 'ما', 'لا', 'في', 'ان', 'الي', 'علي', 'عن', 'لم', 'قد', 'كل', 'هو', 'هي',
  'هذا', 'ذلك', 'الذين', 'الذي', 'التي', 'كان', 'قال', 'ثم', 'او', 'اذا', 'له', 'لهم', 'به',
  'فيها', 'منه', 'عليهم', 'وانا', 'اني', 'انا', 'رب', 'يوم', 'ولا', 'وما', 'ومن', 'فلا',
  'الا', 'حتي', 'بين', 'بعد', 'قبل', 'عند', 'غير', 'يا', 'قل', 'قالوا', 'كانت', 'كانوا',
])

async function fetchQuran() {
  const url = `https://api.alquran.cloud/v1/quran/${MUTASHABIHAT_ARABIC_EDITION}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'MutqinMutashabihatBuilder/1.0' },
  })
  if (!res.ok) throw new Error(`Quran fetch HTTP ${res.status}`)
  const json = await res.json()
  const surahs = json?.data?.surahs
  if (!Array.isArray(surahs)) throw new Error('Al Quran Cloud response has no surahs')
  const ayahs = []
  for (const surah of surahs) {
    const chapter = Number(surah.number)
    for (const ayah of surah.ayahs || []) {
      const number = Number(ayah.numberInSurah)
      const text = String(ayah.text || '').trim()
      if (!chapter || !number || !text || !isValidVerseReference(chapter, number)) continue
      const tokens = text.split(/\s+/).filter(Boolean)
      const norm = tokens.map((token) => normalizeComparisonText(token)).filter(Boolean)
      ayahs.push({
        surah: chapter,
        ayah: number,
        key: `${chapter}:${number}`,
        text,
        tokens,
        norm,
      })
    }
  }
  if (ayahs.length < 6000) throw new Error(`Expected the full Hafs mushaf, got ${ayahs.length} ayahs`)
  return ayahs
}

function usefulTokens(norm) {
  const unique = [...new Set(norm)]
  return unique.filter((token) => token.length >= 3 && !STOP.has(token))
}

function buildPairs(ayahs) {
  const postings = new Map()
  const df = new Map()
  for (const ayah of ayahs) {
    for (const token of usefulTokens(ayah.norm)) {
      df.set(token, (df.get(token) || 0) + 1)
    }
  }
  for (const ayah of ayahs) {
    const tokens = usefulTokens(ayah.norm)
      .filter((token) => {
        const count = df.get(token) || 0
        return count >= 2 && count <= 60
      })
      .sort((a, b) => (df.get(a) || 0) - (df.get(b) || 0))
      .slice(0, 10)
    ayah.indexTokens = tokens
    for (const token of tokens) {
      const list = postings.get(token) || []
      list.push(ayah)
      postings.set(token, list)
    }
  }

  const seen = new Set()
  const found = []
  for (const ayah of ayahs) {
    const scores = new Map()
    for (const token of ayah.indexTokens) {
      for (const other of postings.get(token) || []) {
        if (other.key <= ayah.key) continue
        scores.set(other, (scores.get(other) || 0) + 1)
      }
    }
    const candidates = [...scores.entries()]
      .filter(([, score]) => score >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
    for (const [other] of candidates) {
      const pairKey = `${ayah.key}|${other.key}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      const diff = compareAyahTexts(ayah.text, other.text)
      const metrics = mutashabihatOverlapMetrics(diff.stats, ayah.tokens.length, other.tokens.length)
      const changes = diff.stats.different + diff.stats.inserted + diff.stats.omitted
      if (!pairPassesOverlapQuality(diff.stats, ayah.tokens.length, other.tokens.length)) continue
      if (changes < 1) continue
      if (metrics.sharedRatio < 0.45) continue
      found.push({
        a: [ayah.surah, ayah.ayah],
        b: [other.surah, other.ayah],
        shared: metrics.shared,
        sharedRatio: Number(metrics.sharedRatio.toFixed(3)),
        lengthRatio: Number(metrics.lengthRatio.toFixed(3)),
        changes,
      })
    }
  }

  found.sort((left, right) => (
    right.sharedRatio - left.sharedRatio
    || right.shared - left.shared
    || left.a[0] - right.a[0]
    || left.a[1] - right.a[1]
  ))

  // Keep a spanning forest so repeated formulas (Shu'ara, Rahman) are not
  // listed as every combination of the same sentence.
  const parent = new Map()
  const find = (key) => {
    const current = parent.get(key) || key
    if (current === key) return key
    const root = find(current)
    parent.set(key, root)
    return root
  }
  const unite = (left, right) => {
    const a = find(left)
    const b = find(right)
    if (a === b) return false
    parent.set(b, a)
    return true
  }
  const span = []
  for (const pair of found) {
    const left = `${pair.a[0]}:${pair.a[1]}`
    const right = `${pair.b[0]}:${pair.b[1]}`
    if (unite(left, right)) span.push(pair)
  }
  span.sort((left, right) => (
    left.a[0] - right.a[0]
    || left.a[1] - right.a[1]
    || left.b[0] - right.b[0]
    || left.b[1] - right.b[1]
  ))
  return span
}

async function assertUthmaniExists(pair) {
  for (const [surah, ayah] of [pair.a, pair.b]) {
    const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-uthmani`
    let text = ''
    let lastStatus = 0
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'MutqinMutashabihatBuilder/1.0' } })
      lastStatus = res.status
      if (res.ok) {
        const json = await res.json()
        text = String(json?.data?.text || '').trim()
        if (text) break
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
    if (!text) throw new Error(`Uthmani text missing for ${surah}:${ayah} (HTTP ${lastStatus})`)
  }
}

const ayahs = await fetchQuran()
const pairs = buildPairs(ayahs)
const required = pairs.some((pair) => pair.a[0] === 2 && pair.a[1] === 58 && pair.b[0] === 7 && pair.b[1] === 161)
if (!required) {
  console.error('Expected canonical pair 2:58 ↔ 7:161 was not found in Al Quran Cloud text')
  process.exit(1)
}
const spotChecks = [pairs.find((pair) => pair.a[0] === 2 && pair.a[1] === 58), ...pairs.filter((_, index) => index % 17 === 0)].filter(Boolean)
for (const pair of spotChecks.slice(0, 8)) {
  await assertUthmaniExists(pair)
}

console.log(`Edition: ${MUTASHABIHAT_ARABIC_EDITION}`)
console.log(`Ayahs: ${ayahs.length}`)
console.log(`Credible pairs: ${pairs.length}`)
for (const pair of pairs.slice(0, 25)) {
  console.log(`${pair.a[0]}:${pair.a[1]} ↔ ${pair.b[0]}:${pair.b[1]} shared=${pair.shared} ratio=${pair.sharedRatio} changes=${pair.changes}`)
}

if (write) {
  const catalog = pairs.map((pair) => ({ a: pair.a, b: pair.b }))
  writeFileSync(pairsPath, `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`Wrote ${catalog.length} pairs to ${pairsPath}`)
}
