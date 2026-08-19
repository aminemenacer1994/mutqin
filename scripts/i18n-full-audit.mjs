/**
 * Comprehensive localization audit for Mutqin.
 *
 * Checks:
 *  1. Every t('dotted.key') in JS/Vue exists in en.json
 *  2. All locale JSON files share the same key set as en.json
 *  3. Vue templates do not contain hardcoded user-facing English
 *  4. Guarded Memorisation.js computed props use t(), not raw strings
 *  5. ar/fr/id/tr/es/ur values in guarded namespaces are not English copies
 *  6. PHP lang files (ui, profile, billing, onboarding) have key parity
 *
 * Usage:
 *   node scripts/i18n-full-audit.mjs
 *   node scripts/i18n-full-audit.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.cwd()
const LOCALES_DIR = path.join(ROOT, 'resources/js/locales')
const JS_ROOT = path.join(ROOT, 'resources/js')
const ALL_JSON_LOCALES = ['en', 'ar', 'fr', 'id', 'tr', 'es', 'ur']
const UNTRANSLATED_LOCALES = ['ar', 'fr', 'id', 'tr', 'es', 'ur']
const GUARD_NAMESPACES = [
  'common', 'auth', 'nav', 'homepage', 'memorisation', 'hifzPlan',
  'aboutUs', 'about', 'mission', 'donate', 'waitingList', 'dashboard',
  'admin', 'toasts', 'errors', 'pricingPage',
]
const PHP_GROUPS = ['ui', 'profile', 'billing', 'onboarding', 'admin']
const PHP_LOCALES = ['en', 'fr', 'ar']

const VUE_SCAN_GLOBS = ['views', 'components'].map(d => path.join(JS_ROOT, d))

const JS_COMPUTED_GUARDS = [
  'onboardingSteps',
  'chainingMethodDescription',
  'chainingMethodLabel',
  'chainingMethodPreview',
  'controlsAnalyticsCards',
  'activePracticeTechniques',
  'detailedAnalyticsSections',
  'guidedPhaseLabel',
  'guidedPrimaryCta',
  'guidedInstruction',
  'flowCtaLabel',
  'flowHint',
  'sessionEndedActionCards',
  'sessionTypeInfo',
  'currentSessionExplanation',
  'currentControlInfo',
]

const SKIP_TEMPLATE_PATTERNS = [
  /^bi /, /^bi-/, /^col-/, /^d-/, /^g-/, /^btn-/, /^modal-/, /^verse-/, /^session-/,
  /^https?:/, /^\/\//, /^data-/, /^aria-/, /^mutqin/i, /^Al-/, /^Surah/, /^Ayah/,
]
const SKIP_TEMPLATE_WORDS = new Set(['Mutqin', 'Space', 'OK', 'CSS', 'HTML', 'API', 'URL', 'JSON', 'Vue', 'JS', '۞'])

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

function loadFlatLocale(locale) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
}

function hasNestedKey(obj, key) {
  return key.split('.').reduce(
    (node, part) => (node && typeof node === 'object' ? node[part] : undefined),
    obj,
  ) !== undefined
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'locales') walkFiles(full, out)
    } else if (/\.(js|vue|mjs)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function walkVueFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkVueFiles(full, out)
    else if (/\.vue$/.test(entry.name)) out.push(full)
  }
  return out
}

function looksLikeCssClass(text) {
  return (text.match(/-/g) || []).length >= 2 && !/\s/.test(text)
}

function shouldSkipUntranslatedKey(key, value) {
  if (/\.author$/.test(key)) return true
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(value)) return true
  if (value.length <= 10 && !value.includes(' ')) return true
  if ([
    'memorisation.fonts.naskh',
    'memorisation.export.surahIdFallback',
    'memorisation.misc.surahName',
    'homepage.social.twitter',
    'homepage.social.instagram',
    'homepage.social.youtube',
    'homepage.social.facebook',
  ].includes(key)) return true
  return false
}

function checkMissingTranslationKeys(enTree) {
  const files = walkFiles(JS_ROOT)
  const KEY_PATTERN = /\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g
  /** @type {Map<string, string[]>} */
  const missing = new Map()

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    let match
    while ((match = KEY_PATTERN.exec(source))) {
      const key = match[1]
      if (!key.includes('.') || hasNestedKey(enTree, key)) continue
      const line = source.slice(0, match.index).split('\n').length
      const rel = path.relative(ROOT, file)
      if (!missing.has(key)) missing.set(key, [])
      missing.get(key).push(`${rel}:${line}`)
    }
  }
  return [...missing.entries()].map(([key, locations]) => ({ key, locations }))
}

function checkLocaleParity(enFlat) {
  const baseKeys = new Set(Object.keys(enFlat))
  /** @type {{ locale: string, missing: string[], extra: string[] }[]} */
  const issues = []

  for (const locale of ALL_JSON_LOCALES) {
    if (locale === 'en') continue
    const flat = loadFlatLocale(locale)
    const localeKeys = new Set(Object.keys(flat))
    const missing = [...baseKeys].filter(k => !localeKeys.has(k))
    const extra = [...localeKeys].filter(k => !baseKeys.has(k))
    if (missing.length || extra.length) {
      issues.push({ locale, missing, extra })
    }
  }
  return issues
}

function scanVueHardcoded() {
  /** @type {{ file: string, text: string }[]} */
  const findings = []
  const vueFiles = VUE_SCAN_GLOBS.flatMap(d => walkVueFiles(d))

  for (const file of vueFiles) {
    const rel = path.relative(ROOT, file)
    const full = fs.readFileSync(file, 'utf8')
    const templateMatch = full.match(/<template>([\s\S]*?)<\/template>/)
    if (!templateMatch) continue
    const content = templateMatch[1]

    for (const m of content.matchAll(/>([^<{][^<]{3,120})</g)) {
      const text = m[1].trim()
      if (!/[A-Za-z]{4,}/.test(text)) continue
      if (text.includes('{{') || text.includes('t(') || text.includes('v-')) continue
      if (/[{}\]=:]/.test(text)) continue
      if (looksLikeCssClass(text)) continue
      if (SKIP_TEMPLATE_PATTERNS.some(p => p.test(text))) continue
      if (/^[0-9$£%]/.test(text)) continue
      if (/^&[a-z]+;$/i.test(text)) continue
      if (/^-- .+ --$/.test(text)) continue
      if (SKIP_TEMPLATE_WORDS.has(text)) continue
      if (/^[\d\s:.-]+$/.test(text)) continue
      findings.push({ file: rel, text: text.slice(0, 100) })
    }

    const scriptMatch = full.match(/<script>([\s\S]*?)<\/script>/)
    if (scriptMatch) {
      const script = scriptMatch[1]
      if (/steps:\s*\[\s*\{[^}]*label:\s*['"]Goal['"]/s.test(script)) {
        findings.push({ file: rel, text: 'hardcoded wizard steps/options in data()' })
      }
      if (/goalOptions:\s*\[\s*\{[^}]*title:\s*['"]Light['"]/s.test(script)) {
        findings.push({ file: rel, text: 'hardcoded goalOptions in data()' })
      }
    }
  }
  return findings
}

function scanAppJsHardcoded() {
  const file = path.join(JS_ROOT, 'app.js')
  if (!fs.existsSync(file)) return []
  const source = fs.readFileSync(file, 'utf8')
  /** @type {{ file: string, text: string }[]} */
  const findings = []
  const rel = path.relative(ROOT, file)

  const patterns = [
    /Loading memorisation workspace/,
    /Preparing your session tools/,
    /You appear to be offline/,
    /Something went wrong/,
    /Return Home/,
    /Updating Mutqin/,
  ]
  for (const pattern of patterns) {
    if (pattern.test(source)) {
      findings.push({ file: rel, text: `hardcoded boot string matching ${pattern}` })
    }
  }
  return findings
}

function scanMemorisationComputedGuards() {
  const file = path.join(JS_ROOT, 'views/Memorisation.js')
  if (!fs.existsSync(file)) return []
  const full = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)
  /** @type {{ file: string, text: string }[]} */
  const findings = []

  const computedMatch = full.match(/computed:\s*\{([\s\S]*?)\n\s*\},\n\s*watch:/)
  if (!computedMatch) return findings
  const block = computedMatch[1]

  for (const name of JS_COMPUTED_GUARDS) {
    const fnMatch = block.match(new RegExp(`${name}\\(\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\},`))
    if (!fnMatch) continue
    const body = fnMatch[1]
    if (/return\s+['"][^'"]{8,}['"]/.test(body) && !body.includes('this.t(')) {
      findings.push({ file: rel, text: `${name}() returns hardcoded English` })
    }
    if (/title:\s*['"][A-Za-z][^'"]{6,}['"]/.test(body) && !body.includes('this.t(')) {
      findings.push({ file: rel, text: `${name}() contains hardcoded title/label strings` })
    }
  }
  if (/onboardingSteps:\s*\[/.test(full)) {
    findings.push({ file: rel, text: 'onboardingSteps should be a computed property' })
  }
  return findings
}

function checkUntranslated(enFlat) {
  /** @type {{ locale: string, key: string }[]} */
  const untranslated = []
  const locales = Object.fromEntries(
    UNTRANSLATED_LOCALES.map(locale => [locale, loadFlatLocale(locale)]),
  )

  for (const key of Object.keys(enFlat)) {
    const root = key.split('.')[0]
    if (!GUARD_NAMESPACES.includes(root)) continue
    const enValue = enFlat[key]
    if (!enValue || !/[A-Za-z]{4,}/.test(enValue)) continue
    if (shouldSkipUntranslatedKey(key, enValue)) continue
    for (const locale of UNTRANSLATED_LOCALES) {
      if (locales[locale][key] === enValue) {
        untranslated.push({ locale, key })
      }
    }
  }
  return untranslated
}

function loadPhpKeys(locale, group) {
  const file = path.join(ROOT, `lang/${locale}/${group}.php`)
  if (!fs.existsSync(file)) return null
  const content = fs.readFileSync(file, 'utf8')
  return [...content.matchAll(/'([^']+)'\s*=>/g)].map(m => m[1]).sort()
}

function checkPhpParity() {
  /** @type {{ group: string, locale: string, missing: number, extra: number }[]} */
  const issues = []
  for (const group of PHP_GROUPS) {
    const base = loadPhpKeys('en', group)
    if (!base) continue
    for (const locale of PHP_LOCALES) {
      if (locale === 'en') continue
      const keys = loadPhpKeys(locale, group)
      if (!keys) {
        issues.push({ group, locale, missing: base.length, extra: 0, fileMissing: true })
        continue
      }
      const missing = base.filter(k => !keys.includes(k))
      const extra = keys.filter(k => !base.includes(k))
      if (missing.length || extra.length) {
        issues.push({ group, locale, missing: missing.length, extra: extra.length })
      }
    }
  }
  return issues
}

/**
 * @param {{ json?: boolean, warnUntranslated?: boolean }} [options]
 */
export function runI18nAudit(options = {}) {
  const enTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
  const enFlat = flatten(enTree)

  const missingKeys = checkMissingTranslationKeys(enTree)
  const localeParity = checkLocaleParity(enFlat)
  const hardcodedVue = scanVueHardcoded()
  const hardcodedApp = scanAppJsHardcoded()
  const hardcodedJs = scanMemorisationComputedGuards()
  const untranslated = checkUntranslated(enFlat)
  const phpParity = checkPhpParity()

  const hardcoded = [...hardcodedVue, ...hardcodedApp, ...hardcodedJs]

  const criticalCount = missingKeys.length
    + localeParity.reduce((n, i) => n + i.missing.length, 0)
    + hardcoded.length

  const report = {
    ok: criticalCount === 0 && (options.warnUntranslated ? untranslated.length === 0 : true),
    summary: {
      enKeys: Object.keys(enFlat).length,
      missingTranslationKeys: missingKeys.length,
      localeParityIssues: localeParity.length,
      hardcodedStrings: hardcoded.length,
      untranslatedKeys: untranslated.length,
      phpParityIssues: phpParity.length,
    },
    missingKeys,
    localeParity,
    hardcoded,
    untranslated,
    phpParity,
  }

  return report
}

function printReport(report) {
  const { summary } = report
  console.log('=== Mutqin i18n full audit ===')
  console.log(`English keys: ${summary.enKeys}`)
  console.log('')

  if (report.missingKeys.length) {
    console.log(`✗ Missing translation keys (${report.missingKeys.length}):`)
    report.missingKeys.slice(0, 20).forEach(({ key, locations }) => {
      console.log(`  ${key} — ${locations.join(', ')}`)
    })
    if (report.missingKeys.length > 20) console.log(`  … and ${report.missingKeys.length - 20} more`)
    console.log('')
  } else {
    console.log('✓ All t() keys exist in en.json')
  }

  if (report.localeParity.length) {
    const missingOnly = report.localeParity.filter(i => i.missing.length)
    const extraOnly = report.localeParity.filter(i => i.extra.length)
    if (missingOnly.length) {
      console.log(`✗ Locale key parity (${missingOnly.length} locales missing keys):`)
      missingOnly.forEach(({ locale, missing, extra }) => {
        console.log(`  ${locale}: missing ${missing.length}, extra ${extra.length}`)
        if (missing.length) console.log(`    missing sample: ${missing.slice(0, 5).join(', ')}`)
      })
      console.log('  → Run: node scripts/i18n-full-sync.mjs')
      console.log('')
    }
    if (extraOnly.length) {
      console.log(`⚠ Stale locale keys (${extraOnly.length} locales have extra keys not in en.json):`)
      extraOnly.forEach(({ locale, extra }) => {
        console.log(`  ${locale}: ${extra.length} extra (e.g. ${extra.slice(0, 3).join(', ')})`)
      })
      console.log('  → Run: node scripts/i18n-full-sync.mjs --prune to remove stale keys')
      console.log('')
    }
  } else {
    console.log('✓ All locale JSON files match en.json key set')
  }

  if (report.hardcoded.length) {
    console.log(`✗ Hardcoded UI strings (${report.hardcoded.length}):`)
    report.hardcoded.slice(0, 30).forEach(({ file, text }) => {
      console.log(`  ${file}: "${text}"`)
    })
    if (report.hardcoded.length > 30) console.log(`  … and ${report.hardcoded.length - 30} more`)
    console.log('')
  } else {
    console.log('✓ No hardcoded user-facing strings in Vue / boot surfaces')
  }

  if (report.phpParity.length) {
    console.log(`⚠ PHP lang file parity (${report.phpParity.length} issues — backend only):`)
    report.phpParity.forEach(({ group, locale, missing, extra, fileMissing }) => {
      if (fileMissing) console.log(`  ${group}/${locale}: file missing`)
      else console.log(`  ${group}/${locale}: missing ${missing}, extra ${extra}`)
    })
    console.log('')
  } else {
    console.log('✓ PHP lang files in sync')
  }

  if (report.untranslated.length) {
    console.log(`⚠ Untranslated keys still matching English (${report.untranslated.length}):`)
    report.untranslated.slice(0, 15).forEach(({ locale, key }) => {
      console.log(`  ${locale}:${key}`)
    })
    if (report.untranslated.length > 15) console.log(`  … and ${report.untranslated.length - 15} more`)
    console.log('  → Run: node scripts/i18n-check-untranslated.mjs for the full list')
    console.log('')
  } else {
    console.log('✓ Guarded namespaces appear translated in all locales')
  }

  if (report.ok) {
    console.log('Audit passed — localisation is locked in.')
  } else {
    console.error('Audit failed — fix the issues above to lock in localisation.')
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const json = process.argv.includes('--json')
  const report = runI18nAudit()
  if (json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report)
  }
  if (!report.ok) process.exit(1)
}
