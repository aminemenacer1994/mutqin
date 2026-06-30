/**
 * Verify en/fr/ar locale JSON and lang PHP files have identical key sets.
 * Usage: node scripts/i18n-sync-locales.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

function flatten(obj, prefix = '') {
  /** @type {string[]} */
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...flatten(v, next))
    else keys.push(next)
  }
  return keys.sort()
}

const locales = ['en', 'fr', 'ar']
/** @type {Record<string, string[]>} */
const jsonKeys = {}
for (const locale of locales) {
  const file = path.resolve(`resources/js/locales/${locale}.json`)
  jsonKeys[locale] = flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
}

const base = jsonKeys.en
let ok = true
for (const locale of ['fr', 'ar']) {
  const missing = base.filter(k => !jsonKeys[locale].includes(k))
  const extra = jsonKeys[locale].filter(k => !base.includes(k))
  if (missing.length || extra.length) {
    ok = false
    console.error(`JSON ${locale}: missing ${missing.length}, extra ${extra.length}`)
    if (missing.length) console.error('  missing:', missing.slice(0, 10).join(', '))
    if (extra.length) console.error('  extra:', extra.slice(0, 10).join(', '))
  }
}

function loadPhpKeys(file) {
  const content = fs.readFileSync(file, 'utf8')
  return [...content.matchAll(/'([^']+)'\s*=>/g)].map(m => m[1]).sort()
}

const phpLocales = ['en', 'fr', 'ar']
/** @type {Record<string, string[]>} */
const phpKeys = {}
for (const locale of phpLocales) {
  phpKeys[locale] = loadPhpKeys(path.resolve(`lang/${locale}/ui.php`))
}

const phpBase = phpKeys.en
for (const locale of ['fr', 'ar']) {
  const missing = phpBase.filter(k => !phpKeys[locale].includes(k))
  const extra = phpKeys[locale].filter(k => !phpBase.includes(k))
  if (missing.length || extra.length) {
    ok = false
    console.error(`PHP ui ${locale}: missing ${missing.length}, extra ${extra.length}`)
  }
}

console.log(`JSON keys: ${base.length} per locale`)
console.log(`PHP ui keys: ${phpBase.length} per locale`)
if (ok) console.log('i18n key parity OK')
else process.exit(1)
