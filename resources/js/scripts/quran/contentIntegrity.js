/**
 * Qur'an content integrity checks against pinned fixtures under resources/quran/integrity.
 * Never mutates or “corrects” Uthmani text — compare only.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  QURAN_TOTALS,
  SURAH_AYAH_COUNTS,
  SURAH_NAMES
} from '../engine/hifz_session_engine.js'
import { MADANI_TOTAL_PAGES, chapterHasBismillahPre, isFatihahBasmalaVerseKey } from '../mushaf/madaniPageLayout.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const INTEGRITY_ROOT = join(__dirname, '../../../quran/integrity')

export const QURAN_INTEGRITY_TOTALS = Object.freeze({
  surahs: 114,
  ayahs: 6236,
  pages: 604,
  juz: 30,
  hizb: 60,
  hizbQuarters: 240
})

export function loadIntegrityJson(relative) {
  const raw = readFileSync(join(INTEGRITY_ROOT, relative), 'utf8')
  return JSON.parse(raw)
}

export function verifyChecksums() {
  const errors = []
  const checksums = loadIntegrityJson('checksums.json')
  const algo = checksums.algorithm || 'sha256'
  for (const [relative, expected] of Object.entries(checksums.files || {})) {
    const path = join(INTEGRITY_ROOT, relative)
    let actual
    try {
      actual = createHash(algo).update(readFileSync(path)).digest('hex')
    } catch {
      errors.push(`Missing protected file: ${relative}`)
      continue
    }
    if (actual !== expected) {
      errors.push(
        `Checksum mismatch for ${relative}: expected ${expected}, got ${actual}. See resources/quran/integrity/UPDATE.md`
      )
    }
  }
  return errors
}

export function globalAyahNumber(surah, ayah, counts = SURAH_AYAH_COUNTS) {
  const s = Number(surah)
  const a = Number(ayah)
  const max = Number(counts[s - 1] || 0)
  if (!Number.isFinite(s) || !Number.isFinite(a) || s < 1 || s > 114 || a < 1 || a > max) {
    return null
  }
  let offset = 0
  for (let i = 1; i < s; i += 1) offset += Number(counts[i - 1] || 0)
  return offset + a
}

export function verifyJsMetadataMirror() {
  const errors = []
  const meta = loadIntegrityJson('surah-metadata.json')
  const counts = meta.ayah_counts || []
  if (counts.length !== QURAN_INTEGRITY_TOTALS.surahs) {
    errors.push('surah-metadata ayah_counts must list 114 surahs')
  }
  if (JSON.stringify(SURAH_AYAH_COUNTS) !== JSON.stringify(counts)) {
    errors.push('SURAH_AYAH_COUNTS diverges from surah-metadata.json')
  }
  const sum = SURAH_AYAH_COUNTS.reduce((acc, n) => acc + n, 0)
  if (sum !== QURAN_INTEGRITY_TOTALS.ayahs || QURAN_TOTALS.ayahs !== QURAN_INTEGRITY_TOTALS.ayahs) {
    errors.push(`JS ayah total ${sum}/${QURAN_TOTALS.ayahs} !== ${QURAN_INTEGRITY_TOTALS.ayahs}`)
  }
  if (QURAN_TOTALS.pages !== MADANI_TOTAL_PAGES || MADANI_TOTAL_PAGES !== QURAN_INTEGRITY_TOTALS.pages) {
    errors.push('Madani page total mismatch')
  }
  if (QURAN_TOTALS.juz !== QURAN_INTEGRITY_TOTALS.juz || QURAN_TOTALS.hizb !== QURAN_INTEGRITY_TOTALS.hizb) {
    errors.push('Juz/hizb totals mismatch')
  }

  // Names: PHP uses Al-Fatihah; JS uses Al-Fatiha — alias-aware compare
  const aliases = meta.name_aliases || {}
  const expectedNames = meta.names || []
  if (SURAH_NAMES.length !== expectedNames.length) {
    errors.push('SURAH_NAMES length mismatch')
  } else {
    for (let i = 0; i < expectedNames.length; i += 1) {
      const expected = expectedNames[i]
      const actual = SURAH_NAMES[i]
      const allowed = new Set([expected, ...(aliases[expected] || [])])
      if (!allowed.has(actual)) {
        errors.push(`SURAH_NAMES[${i}] "${actual}" not in approved set for "${expected}"`)
      }
    }
  }
  return errors
}

export function verifySelectedCanonicalAyahs() {
  const errors = []
  const corpus = loadIntegrityJson('canonical-corpus.json')
  const ayahs = corpus.selected_ayahs || []
  const seenKeys = new Set()
  const seenGlobals = new Set()

  for (const ayah of ayahs) {
    const key = String(ayah.key || '')
    const surah = Number(ayah.surah)
    const number = Number(ayah.ayah)
    const global = Number(ayah.global_number)
    const page = Number(ayah.page)
    const uthmani = String(ayah.uthmani || '')
    if (key !== `${surah}:${number}`) errors.push(`Ayah key mismatch for ${key}`)
    if (!uthmani || /[A-Za-z]/.test(uthmani)) errors.push(`Uthmani text invalid for ${key}`)
    if (!ayah.translation_en_asad || !ayah.transliteration) {
      errors.push(`Missing translation/transliteration linkage for ${key}`)
    }
    if (page < 1 || page > QURAN_INTEGRITY_TOTALS.pages) {
      errors.push(`Page out of Madani range for ${key}`)
    }
    const expectedGlobal = globalAyahNumber(surah, number)
    if (expectedGlobal !== global) {
      errors.push(`Audio/global ayah linkage mismatch for ${key}`)
    }
    if (seenKeys.has(key)) errors.push(`Duplicated ayah key: ${key}`)
    if (seenGlobals.has(global)) errors.push(`Duplicated global_number: ${global}`)
    seenKeys.add(key)
    seenGlobals.add(global)
  }

  const fatiha = ayahs.find(a => a.key === '1:1')
  if (!fatiha || !String(fatiha.uthmani).includes('بِسْمِ')) {
    errors.push('Al-Fatihah 1:1 must be the basmala Uthmani text')
  }
  if (!isFatihahBasmalaVerseKey('1:1') || isFatihahBasmalaVerseKey('2:1')) {
    errors.push('Fatiha basmala verse-key helper regression')
  }
  if (!chapterHasBismillahPre(2) || !chapterHasBismillahPre(9) || chapterHasBismillahPre(1)) {
    errors.push('Bismillah-pre product policy regression')
  }
  const tawbah = ayahs.find(a => a.key === '9:1')
  if (!tawbah) {
    errors.push('Missing At-Tawbah 9:1 pin')
  } else {
    const stripped = String(tawbah.uthmani)
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[ٱ]/g, 'ا')
      .replace(/\s+/g, ' ')
      .trim()
    if (stripped.startsWith('بسم الله')) {
      errors.push('At-Tawbah 9:1 must not be the basmala')
    }
  }
  return errors
}

export function verifyPagePins() {
  const errors = []
  const corpus = loadIntegrityJson('canonical-corpus.json')
  const byPage = new Map((corpus.page_pins || []).map(p => [Number(p.page), p]))
  for (const pin of corpus.page_pins || []) {
    const page = Number(pin.page)
    if (page < 1 || page > QURAN_INTEGRITY_TOTALS.pages) {
      errors.push(`Page pin outside Madani range: ${page}`)
    }
    if (Number(pin.first_global) < 1 || Number(pin.last_global) > QURAN_INTEGRITY_TOTALS.ayahs) {
      errors.push(`Page ${page} global range invalid`)
    }
  }
  const p1 = byPage.get(1)
  const p2 = byPage.get(2)
  const p3 = byPage.get(3)
  const p604 = byPage.get(604)
  if (!p1 || p1.first_key !== '1:1' || p1.last_key !== '1:7') {
    errors.push('Page 1 must be Al-Fatihah 1:1–1:7')
  }
  if (p1 && p2 && Number(p2.first_global) !== Number(p1.last_global) + 1) {
    errors.push('Page transition 1→2 is not contiguous')
  }
  if (p2 && p3 && Number(p3.first_global) !== Number(p2.last_global) + 1) {
    errors.push('Page transition 2→3 is not contiguous')
  }
  if (!p604 || p604.last_key !== '114:6' || Number(p604.last_global) !== QURAN_INTEGRITY_TOTALS.ayahs) {
    errors.push('Page 604 must end at 114:6 / global 6236')
  }
  return errors
}

/**
 * Detect missing / duplicated / reordered / misaligned ayah records.
 */
export function detectRecordDefects(records = [], options = {}) {
  const errors = []
  const expectSurah = options.expectSurah != null ? Number(options.expectSurah) : null
  const expectCount = options.expectCount != null ? Number(options.expectCount) : null
  const expectKeys = options.expectKeys || null
  const keys = new Map()
  const globals = new Map()
  const ayahNumbers = []

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index] || {}
    const surah = Number(record.surah || 0)
    const ayah = Number(record.ayah || 0)
    const key = String(record.key || (surah && ayah ? `${surah}:${ayah}` : ''))
    const global = record.global_number != null ? Number(record.global_number) : null
    const page = record.page != null ? Number(record.page) : null

    if (expectSurah != null && surah !== expectSurah) {
      errors.push(`Record ${index} surah ${surah} !== expected ${expectSurah}`)
    }
    if (!key || ayah < 1) {
      errors.push(`Record ${index} missing ayah identity`)
      continue
    }
    if (keys.has(key)) errors.push(`Duplicated ayah record: ${key}`)
    keys.set(key, index)
    ayahNumbers.push(ayah)

    if (global != null) {
      if (global < 1 || global > QURAN_INTEGRITY_TOTALS.ayahs) {
        errors.push(`global_number out of range on ${key}`)
      }
      if (globals.has(global)) errors.push(`Duplicated global_number ${global} on ${key}`)
      globals.set(global, key)
      if (globalAyahNumber(surah, ayah) !== global) {
        errors.push(`Misaligned audio/global linkage on ${key}`)
      }
    }
    if (page != null && (page < 1 || page > QURAN_INTEGRITY_TOTALS.pages)) {
      errors.push(`Page mapping outside Madani range on ${key}: ${page}`)
    }
    if (
      (record.translation != null || record.transliteration != null || record.translation_en_asad != null)
      && key !== `${surah}:${ayah}`
    ) {
      errors.push(`Translation/transliteration linked to wrong ayah identity at ${index}`)
    }
  }

  if (expectCount != null && keys.size !== expectCount) {
    errors.push(`Ayah set count ${keys.size} !== expected ${expectCount}`)
  }
  if (Array.isArray(expectKeys)) {
    for (const expectedKey of expectKeys) {
      if (!keys.has(expectedKey)) errors.push(`Missing ayah: ${expectedKey}`)
    }
  } else if (expectSurah != null && expectCount != null) {
    for (let n = 1; n <= expectCount; n += 1) {
      const expectedKey = `${expectSurah}:${n}`
      if (!keys.has(expectedKey)) errors.push(`Missing ayah: ${expectedKey}`)
    }
  }

  const sorted = [...ayahNumbers].sort((a, b) => a - b)
  if (JSON.stringify(sorted) !== JSON.stringify(ayahNumbers)) {
    errors.push('Ayahs are reordered relative to canonical numbering')
  }

  return [...new Set(errors)]
}

/**
 * Ensure compare-normalization does not mutate the caller's stored/display string.
 */
export function verifyNormalizationPreservesCanonical(normalizeFn) {
  const errors = []
  const corpus = loadIntegrityJson('canonical-corpus.json')
  for (const ayah of corpus.selected_ayahs || []) {
    const original = String(ayah.uthmani || '')
    const copy = original
    const before = copy
    normalizeFn(copy)
    if (before !== original || ayah.uthmani !== original) {
      errors.push(`Normalizer mutated canonical storage for ${ayah.key}`)
    }
  }
  return errors
}

export function runAllIntegrityChecks() {
  const errors = [
    ...verifyChecksums(),
    ...verifyJsMetadataMirror(),
    ...verifySelectedCanonicalAyahs(),
    ...verifyPagePins()
  ]
  return { ok: errors.length === 0, errors }
}
