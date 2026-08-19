/**
 * Drive locale JSON translation coverage to 100% (value !== English).
 *
 * 1. Apply workspace patches
 * 2. Offline engine fill
 * 3. Google Translate unique remaining strings (cached, rate-limit safe)
 * 4. Urdu copies Arabic
 *
 * Usage:
 *   node scripts/i18n-translate-100.mjs
 *   node scripts/i18n-translate-100.mjs --locale ar
 *   node scripts/i18n-translate-100.mjs --offline-only
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { translate } from '@vitalets/google-translate-api'
import { translateText, EXACT } from './_translation-engine.mjs'

const LOCALES_DIR = path.resolve('resources/js/locales')
const CACHE_PATH = path.resolve('scripts/.i18n-translate-100-cache.json')
const TARGETS = ['ar', 'es', 'id', 'tr', 'fr', 'ur']
const GOOGLE = { ar: 'ar', es: 'es', id: 'id', tr: 'tr', fr: 'fr', ur: 'ur' }
const DELAY_MS = 3500
const MAX_RETRIES = 6

const args = process.argv.slice(2)
const offlineOnly = args.includes('--offline-only')
const localeArg = args.find((a, i) => args[i - 1] === '--locale')
const locales = localeArg ? [localeArg] : TARGETS

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

function needsFill(enValue, localeValue) {
  if (localeValue !== enValue) return false
  if (!enValue || !/[A-Za-z]{3,}/.test(enValue)) return false
  return true
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return {}
  return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function translateOnline(text, locale) {
  const cache = loadCache()
  if (!cache[locale]) cache[locale] = {}
  if (cache[locale][text]) return cache[locale][text]

  const { masked, tokens } = maskPlaceholders(text)
  let lastError = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const result = await translate(masked, { to: GOOGLE[locale], from: 'en' })
      const translated = polish(unmaskPlaceholders(result.text, tokens), locale)
      if (translated && translated !== text) {
        cache[locale][text] = translated
        saveCache(cache)
        return translated
      }
      return null
    } catch (error) {
      lastError = error
      const wait = error.message?.includes('Too Many') ? 45000 + attempt * 15000 : 8000
      console.warn(`  retry ${attempt + 1}/${MAX_RETRIES} after ${wait}ms: ${error.message?.slice(0, 80)}`)
      await sleep(wait)
    }
  }
  throw lastError
}

function offlineTranslate(text, locale) {
  if (EXACT[locale]?.[text]) return EXACT[locale][text]
  if (locale === 'ur' && EXACT.ar?.[text]) return EXACT.ar[text]
  if (locale === 'fr') {
    const es = translateText(text, 'es')
    if (es && es !== text) return es
  }
  const out = translateText(text, locale === 'ur' ? 'ar' : locale)
  return out && out !== text ? out : null
}

/** Brand / keyboard strings that should differ from EN but stay recognizable. */
const MANUAL = {
  ar: {
    Enter: 'Enter ↵',
    'Ctrl/Cmd + S': 'Ctrl/Cmd + S (حفظ)',
    pro: 'احترافي',
    free: 'مجاني',
    premium: 'بريميوم',
    Premium: 'بريميوم',
    Tajweed: 'Tajweed',
    Mutqin: 'Mutqin',
    Voice: 'صوت',
    Search: 'بحث',
    Rename: 'إعادة تسمية',
    Playing: 'قيد التشغيل',
    Repeats: 'تكرارات',
    Delay: 'تأخير',
    Translation: 'ترجمة',
    Transliteration: 'نقل حرفي',
    Balanced: 'متوازن',
    Intensive: 'مكثّف',
    Tomorrow: 'غدًا',
  },
  es: {
    Enter: 'Intro',
    pro: 'Pro',
    free: 'Gratis',
    premium: 'Premium',
    Premium: 'Premium',
  },
  id: {
    Enter: 'Enter',
    pro: 'Pro',
    free: 'Gratis',
    premium: 'Premium',
    Premium: 'Premium',
  },
  tr: {
    Enter: 'Enter',
    pro: 'Pro',
    free: 'Ücretsiz',
    premium: 'Premium',
    Premium: 'Premium',
  },
  fr: {
    Enter: 'Entrée',
    pro: 'Pro',
    free: 'Gratuit',
    premium: 'Premium',
    Premium: 'Premium',
  },
}

function resolveTranslation(text, locale) {
  const manual = MANUAL[locale]?.[text]
  if (manual && manual !== text) return manual
  const cache = loadCache()
  if (cache[locale]?.[text]) return cache[locale][text]
  return offlineTranslate(text, locale)
}

function countRemaining(locale, enFlat, localeFlat) {
  let n = 0
  for (const [key, enValue] of Object.entries(enFlat)) {
    if (needsFill(enValue, localeFlat[key] ?? enValue)) n += 1
  }
  return n
}

console.log('Applying workspace patches…')
execSync('node scripts/i18n-apply-workspace-patches.mjs', { stdio: 'inherit' })

const enTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
const enFlat = flatten(enTree)

for (const locale of locales.filter(l => l !== 'ur')) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  let tree = JSON.parse(fs.readFileSync(file, 'utf8'))
  let flat = flatten(tree)

  // Offline pass
  let offlineFilled = 0
  for (const [key, enValue] of Object.entries(enFlat)) {
    if (!needsFill(enValue, flat[key] ?? enValue)) continue
    const translated = resolveTranslation(enValue, locale)
    if (translated && translated !== enValue) {
      setAt(tree, key, translated)
      offlineFilled += 1
    }
  }
  if (offlineFilled) {
    fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
    flat = flatten(tree)
  }
  console.log(`${locale}: offline filled ${offlineFilled}, remaining ${countRemaining(locale, enFlat, flat)}`)

  if (offlineOnly) continue

  // Collect unique pending strings
  /** @type {Set<string>} */
  const pending = new Set()
  for (const [key, enValue] of Object.entries(enFlat)) {
    if (needsFill(enValue, flat[key] ?? enValue)) pending.add(enValue)
  }

  const list = [...pending]
  console.log(`${locale}: ${list.length} unique strings for online translate`)
  let onlineFilled = 0
  for (let i = 0; i < list.length; i += 1) {
    const text = list[i]
    let translated = resolveTranslation(text, locale)
    if (!translated || translated === text) {
      try {
        translated = await translateOnline(text, locale)
        await sleep(DELAY_MS)
      } catch (error) {
        console.warn(`  failed: ${text.slice(0, 60)}…`)
        continue
      }
    }
    if (!translated || translated === text) continue
    for (const [key, enValue] of Object.entries(enFlat)) {
      if (enValue === text && needsFill(enValue, flatten(tree)[key] ?? enValue)) {
        setAt(tree, key, translated)
        onlineFilled += 1
      }
    }
    if ((i + 1) % 25 === 0) {
      fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
      console.log(`  ${locale}: ${i + 1}/${list.length} unique strings processed`)
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
  flat = flatten(tree)
  console.log(`${locale}: online applied ${onlineFilled}, remaining ${countRemaining(locale, enFlat, flat)}`)
}

// Urdu ← Arabic
if (locales.includes('ur')) {
  const arTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ar.json'), 'utf8'))
  const arFlat = flatten(arTree)
  const urFile = path.join(LOCALES_DIR, 'ur.json')
  const urTree = JSON.parse(fs.readFileSync(urFile, 'utf8'))
  let copied = 0
  for (const [key, enValue] of Object.entries(enFlat)) {
    const urVal = flatten(urTree)[key] ?? enValue
    if (!needsFill(enValue, urVal)) continue
    if (arFlat[key] && arFlat[key] !== enValue) {
      setAt(urTree, key, arFlat[key])
      copied += 1
    }
  }
  fs.writeFileSync(urFile, `${JSON.stringify(urTree, null, 2)}\n`)
  console.log(`ur: copied ${copied} from ar, remaining ${countRemaining('ur', enFlat, flatten(urTree))}`)
}

// Final report
console.log('\n=== Coverage report ===')
let totalRemaining = 0
for (const locale of TARGETS) {
  const flat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`), 'utf8')))
  const rem = countRemaining(locale, enFlat, flat)
  totalRemaining += rem
  const pct = Math.round(100 * (1 - rem / Object.keys(enFlat).length))
  console.log(`${locale}: ${rem} remaining (${pct}% translated)`)
}
if (totalRemaining > 0) {
  console.error(`\nStill ${totalRemaining} keys across locales. Re-run or add manual entries to scripts/.i18n-translate-100-cache.json`)
  process.exit(1)
}
console.log('\n100% locale coverage achieved.')
