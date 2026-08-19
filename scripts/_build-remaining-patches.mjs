/**
 * Build i18n-workspace-remaining-patches.mjs from string translations.
 *
 * Run: node scripts/_build-remaining-patches.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const LOCALES_DIR = path.resolve('resources/js/locales')
const OUT_PATH = path.resolve('scripts/i18n-workspace-remaining-patches.mjs')
const STRINGS_PATH = path.resolve('scripts/.i18n-remaining-string-translations.json')
const LOCALES = ['ar', 'es', 'id', 'tr']

/** Per-key overrides after string lookup. */
const KEY_OVERRIDES = {
  ar: {
    'memorisation.a11y.tajweedLabel': 'التجويد',
    'memorisation.amd.tajweed': 'التجويد',
    'memorisation.amd.tajweedShort': 'التجويد',
    'memorisation.reading.tajweed': 'التجويد',
    'memorisation.quiz.progress': '{current} من {total}',
    'memorisation.postSession.adaptiveCheck.progress': '{current} من {total}',
  },
  es: {
    'memorisation.amd.tajweed': 'Tajwid',
    'memorisation.amd.tajweedShort': 'Tajwid',
    'memorisation.a11y.tajweedLabel': 'Tajwid',
    'memorisation.reading.tajweed': 'Tajwid',
  },
  id: {
    'memorisation.amd.tajweed': 'Tajwid',
    'memorisation.amd.tajweedShort': 'Tajwid',
    'memorisation.a11y.tajweedLabel': 'Tajwid',
    'memorisation.reading.tajweed': 'Tajwid',
  },
  tr: {
    'memorisation.amd.tajweed': 'Tecvid',
    'memorisation.amd.tajweedShort': 'Tecvid',
    'memorisation.a11y.tajweedLabel': 'Tecvid',
    'memorisation.reading.tajweed': 'Tecvid',
  },
}

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

/** English values that should stay unchanged in all locales. */
const KEEP_ENGLISH = new Set([
  'Muhammad Asad',
  'Scheherazade New',
  'Lateef',
  'Amiri Quran',
  'Noto Naskh Arabic',
])

function escapeJsString(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function writePatchesFile(patches) {
  const lines = [
    '/** Remaining memorisation workspace translations for ar, es, id, tr. */',
    'export const REMAINING_PATCHES = {',
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

const strings = JSON.parse(fs.readFileSync(STRINGS_PATH, 'utf8'))
const en = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8')))
/** @type {Record<string, Record<string, string>>} */
const patches = { ar: {}, es: {}, id: {}, tr: {} }

for (const locale of LOCALES) {
  for (const key of Object.keys(en)) {
    if (!key.startsWith('memorisation.')) continue
    const english = en[key]
    const value =
      KEY_OVERRIDES[locale]?.[key] ||
      strings[locale]?.[english]
    if (!value || value === english) continue
    if (KEEP_ENGLISH.has(english)) continue
    patches[locale][key] = value
  }
  console.log(`${locale}: ${Object.keys(patches[locale]).length} keys`)
}

writePatchesFile(patches)
console.log(`Wrote ${OUT_PATH}`)
