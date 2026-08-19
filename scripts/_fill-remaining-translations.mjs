/**
 * Fill remaining untranslated strings via Google Translate.
 * Usage: node scripts/_fill-remaining-translations.mjs [--locale ar]
 */
import fs from 'node:fs'
import path from 'node:path'
import { translate } from '@vitalets/google-translate-api'

const MANUAL_PATH = path.resolve('scripts/.i18n-manual-translations.json')
const PENDING_PATH = path.resolve('scripts/.i18n-workspace-pending.json')
const CACHE_PATH = path.resolve('scripts/.i18n-fill-cache.json')
const LOCALES = ['ar', 'es', 'id', 'tr']
const GOOGLE = { ar: 'ar', es: 'es', id: 'id', tr: 'tr' }
const DELAY_MS = 2500

const localeArg = process.argv.find((a, i) => process.argv[i - 1] === '--locale')
const locales = localeArg ? [localeArg] : LOCALES

function loadCache() {
  if (fs.existsSync(CACHE_PATH)) return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  return { ar: {}, es: {}, id: {}, tr: {} }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
}

function mask(text) {
  /** @type {string[]} */
  const tokens = []
  const masked = text.replace(/\{[^}]+\}/g, (m) => {
    tokens.push(m)
    return `__PH${tokens.length - 1}__`
  })
  return { masked, tokens }
}

function unmask(text, tokens) {
  let out = text
  tokens.forEach((t, i) => {
    out = out.replace(new RegExp(`__PH${i}__`, 'g'), t)
  })
  return out
}

function polish(text, locale) {
  let out = text.replace(/\.\.\./g, '…').replace(/Mutqin/g, 'Mutqin')
  if (locale === 'ar') {
    out = out.replace(/\bayah(s)?\b/gi, (_, s) => (s ? 'آيات' : 'آية'))
  } else {
    out = out
      .replace(/vers[íi]culo(s)?/gi, 'ayah$1')
      .replace(/sura(s)?/gi, 'surah$1')
      .replace(/Corán/gi, "Qur'an")
  }
  return out
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function translateOne(text, locale, attempt = 0) {
  const { masked, tokens } = mask(text)
  const result = await translate(masked, { to: GOOGLE[locale], from: 'en' })
  return polish(unmask(result.text, tokens), locale)
}

async function main() {
  const pending = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8'))
  const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'))
  const cache = loadCache()

  for (const locale of locales) {
    const missing = new Set()
    for (const [key, english] of Object.entries(pending[locale] || {})) {
      if (manual[locale][key] === english) missing.add(english)
    }
    const list = [...missing].filter((e) => !cache[locale][e])
    console.log(`${locale}: ${list.length} to translate`)
    let done = 0
    for (const english of list) {
      try {
        cache[locale][english] = await translateOne(english, locale)
      } catch (err) {
        console.warn(`  fail: ${err.message}`)
        cache[locale][english] = english
      }
      saveCache(cache)
      done += 1
      if (done % 25 === 0) console.log(`  ${locale}: ${done}/${list.length}`)
      await sleep(DELAY_MS)
    }
    for (const [key, english] of Object.entries(pending[locale] || {})) {
      if (manual[locale][key] === english && cache[locale][english]) {
        manual[locale][key] = cache[locale][english]
      }
    }
    fs.writeFileSync(MANUAL_PATH, `${JSON.stringify(manual, null, 2)}\n`)
    let left = Object.entries(pending[locale]).filter(([k, v]) => manual[locale][k] === v).length
    console.log(`${locale}: ${left} still English`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
