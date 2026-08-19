/**
 * Translate every locale JSON key that still matches English.
 *
 * Usage:
 *   node scripts/i18n-translate-all-remaining.mjs
 *   node scripts/i18n-translate-all-remaining.mjs --locale ar
 *   node scripts/i18n-translate-all-remaining.mjs --limit 200
 *   node scripts/i18n-translate-all-remaining.mjs --dry-run
 */
import fs from 'node:fs'
import path from 'node:path'
import { translate } from '@vitalets/google-translate-api'

const LOCALES_DIR = path.resolve('resources/js/locales')
const CACHE_PATH = path.resolve('scripts/.i18n-translate-all-cache.json')
const TARGET_LOCALES = ['ar', 'fr', 'es', 'id', 'tr', 'ur']
const GOOGLE_LOCALE = { ar: 'ar', fr: 'fr', es: 'es', id: 'id', tr: 'tr', ur: 'ur' }
const DELAY_MS = 150

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const localeArg = args.find((a, i) => args[i - 1] === '--locale')
const limitArg = args.find((a, i) => args[i - 1] === '--limit')
const limit = limitArg ? Number(limitArg) : Infinity
const locales = localeArg ? [localeArg] : TARGET_LOCALES

function flatten(obj, prefix = '') {
  /** @type {Record<string, string>} */
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, next))
    else out[next] = String(v)
  }
  return out
}

function setAt(obj, keyPath, value) {
  const parts = keyPath.split('.')
  let cursor = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {}
    cursor = cursor[part]
  }
  cursor[parts[parts.length - 1]] = value
}

function needsTranslation(enValue, localeValue) {
  if (localeValue !== enValue) return false
  if (!enValue || !/[A-Za-z]{3,}/.test(enValue)) return false
  return true
}

function maskPlaceholders(text) {
  /** @type {string[]} */
  const tokens = []
  const masked = text.replace(/\{[^}]+\}/g, (match) => {
    tokens.push(match)
    return `⟦PH${tokens.length - 1}⟧`
  })
  return { masked, tokens }
}

function unmaskPlaceholders(text, tokens) {
  let out = text
  tokens.forEach((token, index) => {
    out = out.replace(new RegExp(`⟦PH${index}⟧`, 'g'), token)
  })
  return out
}

function polish(text, locale) {
  let out = text.replace(/\.\.\./g, '…')
  if (locale === 'ar' || locale === 'ur') {
    out = out.replace(/\bayah(s)?\b/gi, (_, s) => (s ? 'آيات' : 'آية'))
      .replace(/\bsurah(s)?\b/gi, (_, s) => (s ? 'سور' : 'سورة'))
  }
  return out
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return {}
  return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function translateValue(text, locale) {
  const cache = loadCache()
  if (cache[locale]?.[text]) return cache[locale][text]
  const { masked, tokens } = maskPlaceholders(text)
  const result = await translate(masked, { to: GOOGLE_LOCALE[locale], from: 'en' })
  const translated = polish(unmaskPlaceholders(result.text, tokens), locale)
  if (!cache[locale]) cache[locale] = {}
  cache[locale][text] = translated
  saveCache(cache)
  return translated
}

function copyArToUr(enTree, arTree, urTree) {
  const enFlat = flatten(enTree)
  const arFlat = flatten(arTree)
  let copied = 0
  for (const key of Object.keys(enFlat)) {
    if (!needsTranslation(enFlat[key], flatten(urTree)[key] ?? enFlat[key])) continue
    if (arFlat[key] && arFlat[key] !== enFlat[key]) {
      setAt(urTree, key, arFlat[key])
      copied += 1
    }
  }
  return copied
}

async function translateLocale(locale) {
  const enTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  const localeTree = JSON.parse(fs.readFileSync(file, 'utf8'))

  if (locale === 'ur') {
    const arTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ar.json'), 'utf8'))
    const copied = copyArToUr(enTree, arTree, localeTree)
    if (!dryRun && copied) fs.writeFileSync(file, `${JSON.stringify(localeTree, null, 2)}\n`)
    console.log(`ur: copied ${copied} keys from ar`)
  }

  const enFlat = flatten(enTree)
  const localeFlat = flatten(localeTree)
  const pending = Object.keys(enFlat).filter(
    (key) => needsTranslation(enFlat[key], localeFlat[key] ?? enFlat[key]),
  )

  const batch = pending.slice(0, limit)
  console.log(`${locale}: ${pending.length} keys still English, translating ${batch.length}`)
  if (!batch.length) return

  let done = 0
  let failed = 0
  for (const key of batch) {
    const source = enFlat[key]
    try {
      const translated = await translateValue(source, locale)
      if (dryRun) {
        if (done < 3) console.log(`  ${key}: ${translated}`)
      } else {
        setAt(localeTree, key, translated)
      }
      done += 1
      if (done % 50 === 0) {
        console.log(`  ${locale}: ${done}/${batch.length}`)
        if (!dryRun) fs.writeFileSync(file, `${JSON.stringify(localeTree, null, 2)}\n`)
      }
      await sleep(DELAY_MS)
    } catch (error) {
      failed += 1
      console.warn(`  skip ${key}: ${error.message}`)
      await sleep(800)
    }
  }

  if (!dryRun) fs.writeFileSync(file, `${JSON.stringify(localeTree, null, 2)}\n`)
  console.log(`${locale}: translated ${done}, failed ${failed}, remaining ${Math.max(0, pending.length - done)}`)
}

for (const locale of locales) {
  if (!GOOGLE_LOCALE[locale]) {
    console.error(`Unknown locale: ${locale}`)
    process.exit(1)
  }
  await translateLocale(locale)
}

console.log('All-locale translation pass complete.')
