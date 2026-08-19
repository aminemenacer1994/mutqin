/**
 * Translate memorisation workspace strings for es, id, tr, ar, ur.
 *
 * Focus: memorisation.* plus workspace shell keys (common, nav, sessionStatus, …).
 * Preserves {placeholders}, HTML entities, and Qur'anic terms where possible.
 *
 * Usage:
 *   node scripts/i18n-translate-workspace.mjs
 *   node scripts/i18n-translate-workspace.mjs --locale es
 *   node scripts/i18n-translate-workspace.mjs --dry-run
 *   node scripts/i18n-translate-workspace.mjs --locale ur --from-ar
 */
import fs from 'node:fs'
import path from 'node:path'
import { translate } from '@vitalets/google-translate-api'

const LOCALES_DIR = path.resolve('resources/js/locales')
const TARGET_LOCALES = ['ar', 'es', 'id', 'tr', 'ur']
const GOOGLE_LOCALE = { ar: 'ar', es: 'es', id: 'id', tr: 'tr', ur: 'ur' }

/** Namespaces used inside the memorisation workspace shell. */
const WORKSPACE_PREFIXES = [
  'memorisation.',
  'common.',
  'nav.',
  'sessionStatus.',
  'sessionSetup.',
  'hifzPlan.',
  'shortcuts.',
  'recordings.',
  'resume.',
  'toasts.',
  'errors.',
  'dashboard.',
]

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fromAr = args.includes('--from-ar')
const localeArg = args.find((a, i) => args[i - 1] === '--locale')
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

function isWorkspaceKey(key) {
  return WORKSPACE_PREFIXES.some(prefix => key === prefix.slice(0, -1) || key.startsWith(prefix))
}

function needsTranslation(enValue, localeValue) {
  if (localeValue !== enValue) return false
  if (!/[A-Za-z]{3,}/.test(enValue)) return false
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
    out = out.replace(new RegExp(`\\[PH${index}\\]`, 'g'), token)
    out = out.replace(new RegExp(`PH${index}`, 'g'), token)
  })
  return out
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function translateValue(text, to) {
  const { masked, tokens } = maskPlaceholders(text)
  const result = await translate(masked, { to, from: 'en' })
  return unmaskPlaceholders(result.text, tokens)
}

function copyArToUr(enTree, arTree, urTree) {
  const enFlat = flatten(enTree)
  const arFlat = flatten(arTree)
  let copied = 0
  for (const key of Object.keys(enFlat)) {
    if (!isWorkspaceKey(key)) continue
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
  const enFlat = flatten(enTree)
  const localeFlat = flatten(localeTree)

  if (fromAr || (locale === 'ur' && !localeArg)) {
    const arTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ar.json'), 'utf8'))
    const copied = copyArToUr(enTree, arTree, localeTree)
    if (!dryRun && copied) {
      fs.writeFileSync(file, `${JSON.stringify(localeTree, null, 2)}\n`)
    }
    console.log(`${locale}: copied ${copied} keys from ar (RTL baseline)`)
    if (locale === 'ur' && !localeArg) {
      // ur gets ar copy first; fall through to translate any remaining English copies
    } else if (fromAr) {
      return
    }
  }

  const pending = Object.keys(enFlat).filter(
    key => isWorkspaceKey(key) && needsTranslation(enFlat[key], localeFlat[key] ?? enFlat[key]),
  )

  console.log(`${locale}: ${pending.length} workspace keys to translate`)
  if (!pending.length) return

  let done = 0
  let failed = 0
  for (const key of pending) {
    const source = enFlat[key]
    try {
      const translated = await translateValue(source, GOOGLE_LOCALE[locale])
      if (dryRun) {
        if (done < 5) console.log(`  ${key}: ${translated}`)
      } else {
        setAt(localeTree, key, translated)
      }
      done += 1
      if (done % 25 === 0) {
        console.log(`  ${locale}: ${done}/${pending.length}`)
        if (!dryRun) fs.writeFileSync(file, `${JSON.stringify(localeTree, null, 2)}\n`)
      }
      await sleep(120)
    } catch (error) {
      failed += 1
      console.warn(`  skip ${key}: ${error.message}`)
      await sleep(500)
    }
  }

  if (!dryRun) {
    fs.writeFileSync(file, `${JSON.stringify(localeTree, null, 2)}\n`)
  }
  console.log(`${locale}: translated ${done}, failed ${failed}`)
}

for (const locale of locales) {
  if (!GOOGLE_LOCALE[locale]) {
    console.error(`Unknown locale: ${locale}`)
    process.exit(1)
  }
  await translateLocale(locale)
}

console.log('Workspace translation complete.')
