/**
 * Generate i18n-workspace-patches.mjs from pending JSON.
 * Masks only {placeholders}; preserves Islamic terms via post-processing.
 *
 * Run: node scripts/_gen-workspace-patches.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const PENDING_PATH = path.resolve('scripts/.i18n-workspace-pending.json')
const CACHE_PATH = path.resolve('scripts/.i18n-translate-cache.json')
const OUT_PATH = path.resolve('scripts/i18n-workspace-patches.mjs')
const FULL_SYNC_PATH = path.resolve('scripts/i18n-full-sync.mjs')
const BULK_PATH = path.resolve('scripts/i18n-bulk-translate-placeholders.mjs')
const LOCALES = ['ar', 'es', 'id', 'tr']
const LANG_PAIR = { ar: 'en|ar', es: 'en|es', id: 'en|id', tr: 'en|tr' }
const CONCURRENCY = 3
const DELAY_MS = 350

function extractConst(name, src) {
  const marker = `const ${name} = `
  const start = src.indexOf(marker)
  if (start === -1) return {}
  const slice = src.slice(start + marker.length)
  let depth = 0
  let end = -1
  for (let i = 0; i < slice.length; i += 1) {
    if (slice[i] === '{') depth += 1
    if (slice[i] === '}') {
      depth -= 1
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end === -1) return {}
  return Function(`return ${slice.slice(0, end)}`)()
}

function loadSeeds(pending) {
  const syncSrc = fs.readFileSync(FULL_SYNC_PATH, 'utf8')
  const bulkSrc = fs.readFileSync(BULK_PATH, 'utf8')
  const memorisation = extractConst('MEMORISATION_PATCH', syncSrc)
  const coverage = extractConst('COVERAGE_PATCH', syncSrc)
  const bulk = extractConst('TRANSLATIONS', bulkSrc)
  /** @type {Record<string, Record<string, string>>} */
  const seeds = { ar: {}, es: {}, id: {}, tr: {} }
  for (const locale of LOCALES) {
    for (const patch of [memorisation[locale], coverage[locale]]) {
      if (!patch) continue
      for (const [key, value] of Object.entries(patch)) {
        if (pending[locale]?.[key]) seeds[locale][key] = value
      }
    }
    for (const [key, entry] of Object.entries(bulk)) {
      if (!pending[locale]?.[key]) continue
      if (entry[locale]) seeds[locale][key] = entry[locale]
      else if (locale === 'ar' && entry.ar) seeds[locale][key] = entry.ar
    }
  }
  return seeds
}

function loadCache() {
  if (fs.existsSync(CACHE_PATH)) return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  return { ar: {}, es: {}, id: {}, tr: {} }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
}

function maskPlaceholders(text) {
  /** @type {string[]} */
  const tokens = []
  const masked = text.replace(/\{[^}]+\}/g, (match) => {
    tokens.push(match)
    return `__PH${tokens.length - 1}__`
  })
  return { masked, tokens }
}

function unmaskPlaceholders(text, tokens) {
  let out = text
  tokens.forEach((token, index) => {
    out = out.replace(new RegExp(`__PH${index}__`, 'g'), token)
  })
  return out
}

function polish(text, locale) {
  let out = text.replace(/\.\.\./g, '…').replace(/Mutqin/g, 'Mutqin')
  if (locale === 'ar') {
    out = out
      .replace(/\bayah(s)?\b/gi, (_, s) => (s ? 'آيات' : 'آية'))
      .replace(/\bsurah(s)?\b/gi, (_, s) => (s ? 'سور' : 'سورة'))
      .replace(/\bTajweed\b/g, 'Tajweed')
      .replace(/\btajweed\b/g, 'tajweed')
      .replace(/\bMushaf\b/g, 'المصحف')
      .replace(/\bmushaf\b/g, 'مصحف')
      .replace(/\bQur'?an\b/g, 'القرآن')
  } else {
    const fixes = [
      [/vers[íi]culo(s)?/gi, 'ayah$1'],
      [/versículos/gi, 'ayahs'],
      [/sura(s)?/gi, 'surah$1'],
      [/Corán/gi, "Qur'an"],
      [/Alá/g, 'Allah'],
      [/ayet(ler)?/gi, 'ayah$1'],
      [/sure(ler)?/gi, 'surah$1'],
      [/mémorisation/gi, 'memorisation'],
    ]
    for (const [re, repl] of fixes) out = out.replace(re, repl)
  }
  return out
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function translateViaMyMemory(text, locale, attempt = 0) {
  const { masked, tokens } = maskPlaceholders(text)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(masked)}&langpair=${LANG_PAIR[locale]}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.responseStatus !== 200) {
    if (attempt < 6) {
      await sleep(2000 * (attempt + 1))
      return translateViaMyMemory(text, locale, attempt + 1)
    }
    throw new Error(data.responseDetails || 'translation failed')
  }
  return polish(unmaskPlaceholders(data.responseData.translatedText, tokens), locale)
}

async function translateBatch(items, locale, cache) {
  const queue = [...items]
  async function worker() {
    while (queue.length) {
      const english = queue.shift()
      if (!english || cache[locale][english]) continue
      try {
        cache[locale][english] = await translateViaMyMemory(english, locale)
      } catch (err) {
        console.warn(`  fail [${locale}]: ${err.message}`)
        cache[locale][english] = english
      }
      saveCache(cache)
      await sleep(DELAY_MS)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
}

function escapeJsString(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function writePatchesFile(patches) {
  const lines = [
    '/**',
    ' * Workspace UI translations for ar, es, id, tr.',
    ' * Generated from scripts/.i18n-workspace-pending.json',
    ' */',
    'export const WORKSPACE_PATCHES = {',
  ]
  for (const locale of LOCALES) {
    lines.push(`  ${locale}: {`)
    for (const key of Object.keys(patches[locale]).sort()) {
      lines.push(`    '${key.replace(/'/g, "\\'")}': '${escapeJsString(patches[locale][key])}',`)
    }
    lines.push('  },')
  }
  lines.push('}', '')
  fs.writeFileSync(OUT_PATH, lines.join('\n'))
}

async function main() {
  const pending = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8'))
  const seeds = loadSeeds(pending)
  const cache = loadCache()
  /** @type {Record<string, Record<string, string>>} */
  const patches = { ar: {}, es: {}, id: {}, tr: {} }

  for (const locale of LOCALES) {
    console.log(`${locale} seeds: ${Object.keys(seeds[locale]).length}`)
    const entries = Object.entries(pending[locale] || {})
    const missingEnglish = new Set()
    for (const [key, english] of entries) {
      if (seeds[locale][key]) continue
      if (!cache[locale][english]) missingEnglish.add(english)
    }
    const missing = [...missingEnglish]
    console.log(`${locale}: ${missing.length} unique to translate (${entries.length} keys)`)
    if (missing.length) await translateBatch(missing, locale, cache)
    for (const [key, english] of entries) {
      patches[locale][key] = seeds[locale][key] || cache[locale][english] || english
    }
    writePatchesFile(patches)
    console.log(`${locale}: wrote ${Object.keys(patches[locale]).length} keys`)
  }
  console.log(`Done: ${OUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
