/**
 * Filter mutashabihat_pairs.json against Al Quran Cloud Arabic + overlap rules.
 * Usage: node scripts/validate-mutashabihat-pairs.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareAyahTexts } from '../resources/js/scripts/mutashabihat/compareAyahs.js'
import {
  isValidVerseReference,
  MUTASHABIHAT_ARABIC_EDITION,
  pairPassesOverlapQuality,
} from '../resources/js/scripts/mutashabihat/pairCatalog.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pairsPath = join(root, 'resources/data/mutashabihat_pairs.json')
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'))
const write = process.argv.includes('--write')

async function fetchSurah(surah) {
  const url = `https://api.alquran.cloud/v1/surah/${surah}/${MUTASHABIHAT_ARABIC_EDITION}`
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'MutqinMutashabihatValidator/1.0' } })
  if (!res.ok) throw new Error(`Surah ${surah} HTTP ${res.status}`)
  const json = await res.json()
  const ayahs = json?.data?.ayahs
  if (!Array.isArray(ayahs) || !ayahs.length) throw new Error(`Surah ${surah} has no ayahs`)
  const byNumber = new Map()
  for (const ayah of ayahs) {
    const number = Number(ayah?.numberInSurah || ayah?.number)
    const text = String(ayah?.text || '').trim()
    if (number > 0 && text) byNumber.set(number, text)
  }
  return byNumber
}

async function loadSurahTexts(surahs) {
  const texts = new Map()
  const queue = [...surahs]
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const surah = queue.shift()
      let lastError = null
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          texts.set(surah, await fetchSurah(surah))
          lastError = null
          break
        } catch (error) {
          lastError = error
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
        }
      }
      if (lastError) throw lastError
    }
  })
  await Promise.all(workers)
  return texts
}

const kept = []
const dropped = []
const surahs = [...new Set(pairs.flatMap((entry) => [Number(entry.a[0]), Number(entry.b[0])]))]
const texts = await loadSurahTexts(surahs)

for (const entry of pairs) {
  const [s1, a1] = entry.a
  const [s2, a2] = entry.b
  const label = `${s1}:${a1} ↔ ${s2}:${a2}`
  if (!isValidVerseReference(s1, a1) || !isValidVerseReference(s2, a2)) {
    dropped.push({ label, reason: 'invalid reference' })
    continue
  }
  const left = texts.get(Number(s1))?.get(Number(a1)) || ''
  const right = texts.get(Number(s2))?.get(Number(a2)) || ''
  if (!left || !right) {
    dropped.push({ label, reason: 'missing ayah text from Al Quran Cloud' })
    continue
  }
  const diff = compareAyahTexts(left, right)
  const lw = left.split(/\s+/).filter(Boolean).length
  const rw = right.split(/\s+/).filter(Boolean).length
  if (!pairPassesOverlapQuality(diff.stats, lw, rw)) {
    dropped.push({ label, reason: 'low overlap', stats: diff.stats, lw, rw })
    continue
  }
  kept.push(entry)
}

console.log(`Edition: ${MUTASHABIHAT_ARABIC_EDITION}`)
console.log(`Kept ${kept.length} / ${pairs.length} pairs`)
if (dropped.length) {
  console.log('Dropped:')
  for (const row of dropped) console.log(' -', row.label, row.reason, row.stats ? JSON.stringify(row.stats) : '')
}

if (write) {
  writeFileSync(pairsPath, `${JSON.stringify(kept, null, 2)}\n`)
  console.log(`Wrote ${pairsPath}`)
}
