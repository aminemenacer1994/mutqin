import assert from 'node:assert/strict'
import {
  formatAppDate,
  formatAppNumber,
  formatRelativeTime,
  resolveIntlLocale,
  unwrapLocale,
} from '../../resources/js/utils/i18nFormat.js'

assert.equal(unwrapLocale('fr'), 'fr')
assert.equal(unwrapLocale({ value: 'es' }), 'es')
assert.equal(resolveIntlLocale('fr'), 'fr-FR')
assert.equal(resolveIntlLocale('es'), 'es-ES')
assert.equal(formatAppNumber(1234, 'fr').includes('1'), true)
assert.equal(formatAppNumber(1234, 'es').includes('1'), true)

const t = (key, params = {}) => {
  if (key === 'common.relative.justNow') return 'À l’instant'
  if (key === 'common.relative.minutesAgo') return `il y a ${params.n} min`
  return key
}
assert.equal(formatRelativeTime(new Date(), t, 'fr'), 'À l’instant')

const stamped = formatAppDate('2026-03-15T12:00:00Z', 'fr')
assert.equal(typeof stamped, 'string')
assert.ok(stamped.length > 0)

console.log('i18n-format.test.mjs: ok')
