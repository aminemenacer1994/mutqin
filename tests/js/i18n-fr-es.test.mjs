import assert from 'node:assert/strict'
import { runI18nAudit } from '../../scripts/i18n-full-audit.mjs'

/**
 * Production lock for English / French / Spanish.
 * Missing keys render as raw paths (e.g. "memorisation.postSession.ayahSingular").
 */
const report = runI18nAudit()

assert.equal(
  report.summary.missingTranslationKeys,
  0,
  `translation keys missing from en.json:\n${
    report.missingKeys.map(({ key, locations }) => `  ${key} — ${locations.join(', ')}`).join('\n')
  }`,
)

const frEsParity = report.localeParity.filter(item => item.locale === 'fr' || item.locale === 'es')
assert.equal(
  frEsParity.reduce((n, item) => n + item.missing.length, 0),
  0,
  `fr/es locale files missing keys:\n${
    frEsParity.map(({ locale, missing }) => `  ${locale}: ${missing.slice(0, 12).join(', ')}`).join('\n')
  }`,
)

assert.equal(
  report.summary.productionUntranslatedKeys,
  0,
  `French/Spanish keys still English:\n${
    (report.productionUntranslated || []).map(({ locale, key }) => `  ${locale}:${key}`).join('\n')
  }`,
)

assert.equal(
  report.summary.garbageCopy,
  0,
  `Broken FR/ES machine-translation leftovers:\n${
    (report.garbage || []).map(({ locale, key, text }) => `  ${locale}:${key} "${text}"`).join('\n')
  }`,
)

const phpFrEs = report.phpParity.filter(item => item.locale === 'fr' || item.locale === 'es')
assert.equal(
  phpFrEs.length,
  0,
  `PHP lang files out of sync for fr/es:\n${
    phpFrEs.map(({ group, locale, missing, fileMissing }) => (
      `  ${group}/${locale}: ${fileMissing ? 'file missing' : `missing ${missing}`}`
    )).join('\n')
  }`,
)

console.log('i18n-fr-es.test.mjs: ok')
console.log(`  en keys: ${report.summary.enKeys}`)
console.log(`  fr/es untranslated: ${report.summary.productionUntranslatedKeys}`)
console.log(`  fr/es garbage: ${report.summary.garbageCopy}`)
