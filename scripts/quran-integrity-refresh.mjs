#!/usr/bin/env node
/**
 * Refresh pinned Qur'an integrity fixtures from Al Quran Cloud.
 * Requires explicit --confirm. Never run from CI as a silent regen.
 *
 * Usage: node scripts/quran-integrity-refresh.mjs --confirm
 */

import { createHash } from 'node:crypto'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const integrityDir = join(root, 'resources/quran/integrity')

if (!process.argv.includes('--confirm')) {
  console.error('Refusing to refresh without --confirm. See resources/quran/integrity/UPDATE.md')
  process.exit(1)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getJson(url, { retries = 8 } = {}) {
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetch(url)
    if (res.ok) return res.json()

    lastError = new Error(`HTTP ${res.status} for ${url}`)
    // Al Quran Cloud rate-limits bursty clients (429). Back off and retry.
    if (res.status !== 429 && res.status < 500) throw lastError

    const retryAfterHeader = Number(res.headers.get('retry-after'))
    const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader * 1000
      : Math.min(30_000, 1000 * (2 ** attempt))
    console.warn(`Rate-limited/upstream error (${res.status}); waiting ${Math.round(waitMs / 1000)}s… (${attempt + 1}/${retries})`)
    await sleep(waitMs)
  }
  throw lastError
}

const keys = [
  '1:1', '1:2', '1:7',
  '2:1', '2:2', '2:255',
  '9:1', '9:128', '9:129',
  '36:1', '55:1', '67:1',
  '78:1', '112:1', '112:4', '113:1', '114:1', '114:6'
]

const selected = []
for (const key of keys) {
  console.log(`Fetching ayah ${key}…`)
  const data = await getJson(`https://api.alquran.cloud/v1/ayah/${key}/editions/quran-uthmani,en.asad,en.transliteration`)
  const editions = data.data
  const uthmani = editions.find(e => e.edition.identifier === 'quran-uthmani')
  const asad = editions.find(e => e.edition.identifier === 'en.asad')
  const translit = editions.find(e => e.edition.identifier === 'en.transliteration')
  selected.push({
    key,
    surah: uthmani.surah.number,
    ayah: uthmani.numberInSurah,
    global_number: uthmani.number,
    page: uthmani.page,
    juz: uthmani.juz,
    hizb_quarter: uthmani.hizbQuarter,
    uthmani: String(uthmani.text || '').replace(/^\uFEFF/, ''),
    translation_en_asad: asad.text,
    transliteration: translit.text
  })
  await sleep(400)
}

console.log('Fetching meta…')
const meta = await getJson('https://api.alquran.cloud/v1/meta')
const ayahCounts = meta.data.surahs.references.map(s => s.numberOfAyahs)
if (ayahCounts.length !== 114 || ayahCounts.reduce((a, b) => a + b, 0) !== 6236) {
  throw new Error('Upstream surah meta failed totals check')
}
await sleep(400)

const pagePins = []
for (const page of [1, 2, 3, 49, 187, 603, 604]) {
  console.log(`Fetching page ${page}…`)
  const pdata = await getJson(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`)
  const ayahs = pdata.data.ayahs
  pagePins.push({
    page,
    ayah_count: ayahs.length,
    first_key: `${ayahs[0].surah.number}:${ayahs[0].numberInSurah}`,
    last_key: `${ayahs.at(-1).surah.number}:${ayahs.at(-1).numberInSurah}`,
    first_global: ayahs[0].number,
    last_global: ayahs.at(-1).number,
    juz: ayahs[0].juz
  })
  await sleep(400)
}

const boundaries = []
let offset = 0
ayahCounts.forEach((count, index) => {
  const surah = index + 1
  boundaries.push({
    surah,
    ayah_count: count,
    first_global: offset + 1,
    last_global: offset + count,
    first_key: `${surah}:1`,
    last_key: `${surah}:${count}`
  })
  offset += count
})

const corpus = {
  source: {
    provider: 'alquran.cloud',
    arabic_edition: 'quran-uthmani',
    translation_edition: 'en.asad',
    transliteration_edition: 'en.transliteration',
    mushaf: 'Madani (page numbers from Al Quran Cloud Uthmani metadata)',
    authority_note: 'Pinned verbatim from Al Quran Cloud API. Do not edit Arabic text by hand or via AI.'
  },
  totals: {
    surahs: 114,
    ayahs: 6236,
    pages: 604,
    juz: 30,
    hizb: 60,
    hizb_quarters: 240
  },
  ayah_counts: ayahCounts,
  selected_ayahs: selected,
  page_pins: pagePins,
  surah_boundaries: boundaries
}

const corpusText = `${JSON.stringify(corpus, null, 2)}\n`
writeFileSync(join(integrityDir, 'canonical-corpus.json'), corpusText, 'utf8')

// Preserve existing surah names / translated names unless missing
const metaPath = join(integrityDir, 'surah-metadata.json')
let surahMeta
if (existsSync(metaPath)) {
  surahMeta = JSON.parse(readFileSync(metaPath, 'utf8'))
  surahMeta.ayah_counts = ayahCounts
  surahMeta.totals = corpus.totals
  surahMeta.source = corpus.source
} else {
  throw new Error('surah-metadata.json missing — create names manually once, then refresh')
}
const metaText = `${JSON.stringify(surahMeta, null, 2)}\n`
writeFileSync(metaPath, metaText, 'utf8')

const checksums = {
  algorithm: 'sha256',
  files: {
    'canonical-corpus.json': createHash('sha256').update(corpusText).digest('hex'),
    'surah-metadata.json': createHash('sha256').update(metaText).digest('hex')
  },
  protected_fields: [
    'selected_ayahs[].uthmani',
    'selected_ayahs[].global_number',
    'selected_ayahs[].page',
    'selected_ayahs[].juz',
    'selected_ayahs[].hizb_quarter',
    'selected_ayahs[].translation_en_asad',
    'selected_ayahs[].transliteration',
    'ayah_counts',
    'page_pins',
    'surah_boundaries',
    'totals'
  ],
  note: 'Intentional corpus updates must follow UPDATE.md and refresh these checksums via scripts/quran-integrity-refresh.mjs --confirm.'
}
writeFileSync(join(integrityDir, 'checksums.json'), `${JSON.stringify(checksums, null, 2)}\n`, 'utf8')

console.log('Refreshed Qur\'an integrity fixtures.')
console.log('canonical-corpus.json', checksums.files['canonical-corpus.json'])
console.log('surah-metadata.json', checksums.files['surah-metadata.json'])
console.log('Next: sync PHP/JS mirrors if counts changed, run npm run test:quran-integrity')
