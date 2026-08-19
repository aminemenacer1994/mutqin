import assert from 'node:assert/strict'
import { runI18nAudit } from '../../scripts/i18n-full-audit.mjs'

const report = runI18nAudit()

assert.equal(
  report.summary.missingTranslationKeys,
  0,
  `translation keys missing from en.json:\n${
    report.missingKeys.map(({ key, locations }) => `  ${key} — ${locations.join(', ')}`).join('\n')
  }`,
)

assert.equal(
  report.hardcoded.length,
  0,
  `hardcoded UI strings remain:\n${
    report.hardcoded.map(({ file, text }) => `  ${file}: "${text}"`).join('\n')
  }`,
)

assert.equal(
  report.localeParity.length,
  0,
  `locale files out of sync with en.json:\n${
    report.localeParity.map(({ locale, missing, extra }) => `  ${locale}: missing ${missing.length}, extra ${extra.length}`).join('\n')
  }\nRun: node scripts/i18n-full-sync.mjs`,
)

console.log('i18n-full-audit.test.mjs: ok')
console.log(`  en keys: ${report.summary.enKeys}`)
console.log(`  untranslated (informational): ${report.summary.untranslatedKeys}`)
