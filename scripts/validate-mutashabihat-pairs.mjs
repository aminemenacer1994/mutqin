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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchAyah(surah, ayah) {
  const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/${MUTASHABIHAT_ARABIC_EDITION}`
  const res = await fetch(url)
  const json = await res.json()
  const text = String(json?.data?.text || '').trim()
  if (!text) throw new Error(`Missing text for ${surah}:${ayah}`)
  return text
}

const kept = []
const dropped = []

for (const entry of pairs) {
  const [s1, a1] = entry.a
  const [s2, a2] = entry.b
  const label = `${s1}:${a1} ↔ ${s2}:${a2}`
  if (!isValidVerseReference(s1, a1) || !isValidVerseReference(s2, a2)) {
    dropped.push({ label, reason: 'invalid reference' })
    continue
  }
  try {
    await sleep(60)
    const left = await fetchAyah(s1, a1)
    await sleep(60)
    const right = await fetchAyah(s2, a2)
    const diff = compareAyahTexts(left, right)
    const lw = left.split(/\s+/).filter(Boolean).length
    const rw = right.split(/\s+/).filter(Boolean).length
    if (!pairPassesOverlapQuality(diff.stats, lw, rw)) {
      dropped.push({ label, reason: 'low overlap', stats: diff.stats, lw, rw })
      continue
    }
    kept.push(entry)
  } catch (error) {
    dropped.push({ label, reason: String(error?.message || error) })
  }
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
