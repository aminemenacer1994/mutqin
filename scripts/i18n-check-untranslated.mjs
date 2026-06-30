/**
 * Fail when ar/fr locale values still match en for user-facing namespaces.
 * Usage: node scripts/i18n-check-untranslated.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const LOCALES_DIR = path.resolve('resources/js/locales')
const GUARD_NAMESPACES = ['memorisation', 'homepage', 'hifzPlan', 'aboutUs', 'mission', 'donate', 'common']

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

function loadFlat(locale) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
}

function shouldSkipKey(key, value) {
  if (/\.author$/.test(key)) return true
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(value)) return true
  if (value.length <= 10 && !value.includes(' ')) return true
  return false
}

const en = loadFlat('en')
const ar = loadFlat('ar')
const fr = loadFlat('fr')

/** @type {string[]} */
const untranslated = []

for (const key of Object.keys(en)) {
  const root = key.split('.')[0]
  if (!GUARD_NAMESPACES.includes(root)) continue
  const enValue = en[key]
  if (!enValue || !/[A-Za-z]{4,}/.test(enValue)) continue
  if (shouldSkipKey(key, enValue)) continue
  if (ar[key] === enValue) untranslated.push(`ar:${key}`)
  if (fr[key] === enValue) untranslated.push(`fr:${key}`)
}

console.log(`Untranslated placeholder keys: ${untranslated.length}`)
untranslated.slice(0, 40).forEach(item => console.log(' ', item))

if (untranslated.length > 0) {
  console.error('Some ar/fr keys still match English — add translations or run i18n-bulk-translate-placeholders.mjs')
  process.exit(1)
}

console.log('All guarded locale keys appear translated in ar and fr.')
