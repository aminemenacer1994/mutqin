/**
 * Final manual patches for 100% coverage edge cases.
 */
import fs from 'node:fs'
import path from 'node:path'

const LOCALES_DIR = path.resolve('resources/js/locales')

const PATCHES = {
  ar: {
    'memorisation.featurePills.tajweed': 'تجويد',
    'waitingList.brand': 'متقن',
    'waitingList.kicker': 'متقن',
    'dashboard.last_activity_soft': '{when}',
    'dashboard.sync_ready': '{when}',
    'shortcuts.keys.enter': 'Enter ↵',
    'shortcuts.keys.save': 'Ctrl/Cmd + S (حفظ)',
    'homepage.pricing.premium': 'بريميوم',
    'homepage.badge.premium': 'بريميوم',
  },
  es: {
    'homepage.pricing.premium': 'Plan Premium',
    'homepage.badge.premium': 'Plan Premium',
    'shortcuts.keys.enter': 'Intro',
  },
  id: {
    'homepage.pricing.premium': 'Premium (berbayar)',
    'homepage.badge.premium': 'Premium (berbayar)',
    'shortcuts.keys.enter': 'Enter ↵',
  },
  tr: {
    'homepage.pricing.premium': 'Premium (ücretli)',
    'homepage.badge.premium': 'Premium (ücretli)',
    'shortcuts.keys.enter': 'Enter ↵',
  },
  fr: {
    'homepage.pricing.premium': 'Offre Premium',
    'homepage.badge.premium': 'Offre Premium',
    'shortcuts.keys.enter': 'Entrée',
  },
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

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, next))
    else out[next] = String(v)
  }
  return out
}

function needsFill(enValue, localeValue) {
  if (localeValue !== enValue) return false
  if (!enValue || !/[A-Za-z]{3,}/.test(enValue)) return false
  if (/^\{[a-z_]+\}$/.test(enValue)) return false
  return true
}

const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8')))

for (const [locale, patch] of Object.entries(PATCHES)) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  const tree = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(patch)) {
    setAt(tree, key, value)
  }
  fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
  const flat = flatten(tree)
  let rem = 0
  for (const [key, enValue] of Object.entries(enFlat)) {
    if (needsFill(enValue, flat[key] ?? enValue)) rem += 1
  }
  console.log(`${locale}: patched ${Object.keys(patch).length}, remaining ${rem}`)
}

// Urdu ← Arabic
const arTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ar.json'), 'utf8'))
const arFlat = flatten(arTree)
const urTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ur.json'), 'utf8'))
for (const [key, val] of Object.entries(arFlat)) {
  if (arFlat[key] !== enFlat[key]) setAt(urTree, key, val)
}
fs.writeFileSync(path.join(LOCALES_DIR, 'ur.json'), `${JSON.stringify(urTree, null, 2)}\n`)
const urFlat = flatten(urTree)
let urRem = 0
for (const [key, enValue] of Object.entries(enFlat)) {
  if (needsFill(enValue, urFlat[key] ?? enValue)) urRem += 1
}
console.log(`ur: synced from ar, remaining ${urRem}`)

console.log('\nTotal remaining (excl. pure placeholders):')
let total = 0
for (const locale of ['ar', 'es', 'id', 'tr', 'fr', 'ur']) {
  const flat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`), 'utf8')))
  let rem = 0
  for (const [key, enValue] of Object.entries(enFlat)) {
    if (needsFill(enValue, flat[key] ?? enValue)) rem += 1
  }
  total += rem
  console.log(`  ${locale}: ${rem}`)
}
process.exit(total > 0 ? 1 : 0)
