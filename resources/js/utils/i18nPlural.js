import { resolveEnMessage } from '../i18n.js'
import {
  formatIcuPluralMessage,
  formatNamedParams,
  pluralFormForCount,
} from './icuPluralFormat.js'
import { unwrapLocale } from './i18nFormat.js'

export { formatIcuPluralMessage, formatNamedParams, pluralFormForCount } from './icuPluralFormat.js'

export function getLocaleMessageString(i18n, locale, key) {
  const normalized = unwrapLocale(locale)
  for (const loc of [normalized, 'en']) {
    const messages = i18n?.global?.getLocaleMessage?.(loc)
    if (!messages) continue
    const node = key.split('.').reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
      messages,
    )
    if (typeof node === 'string') return node
  }
  const fallback = resolveEnMessage(key)
  return typeof fallback === 'string' && fallback !== key ? fallback : null
}

function lookupMessage(i18n, locale, key) {
  return getLocaleMessageString(i18n, locale, key)
}

const PLURAL_SUFFIX_FALLBACK = ['zero', 'one', 'two', 'few', 'many', 'other']

/**
 * Pick `key_{form}` from locale JSON (no ICU in source strings).
 */
export function resolvePluralMessage(i18n, key, count, params = {}, locale) {
  const n = Number(count) || 0
  const loc = unwrapLocale(locale ?? i18n?.global?.locale?.value ?? i18n?.global?.locale ?? 'en')
  const form = pluralFormForCount(loc, n)
  const suffixIndex = PLURAL_SUFFIX_FALLBACK.indexOf(form)
  const tryForms = suffixIndex >= 0
    ? PLURAL_SUFFIX_FALLBACK.slice(0, suffixIndex + 1).reverse().concat(['other'])
    : ['other', 'one']

  const seen = new Set()
  for (const suffix of tryForms) {
    const pluralKey = `${key}_${suffix}`
    if (seen.has(pluralKey)) continue
    seen.add(pluralKey)
    const raw = lookupMessage(i18n, loc, pluralKey)
    if (raw && !raw.includes(', plural,')) {
      return formatNamedParams(raw, { ...params, n })
    }
  }

  const legacy = lookupMessage(i18n, loc, key)
  if (legacy?.includes(', plural,')) {
    return formatIcuPluralMessage(legacy, loc, { ...params, n })
  }
  if (legacy) {
    return formatNamedParams(legacy, { ...params, n })
  }

  return formatNamedParams(String(n), { ...params, n })
}

export function resolveLearnerMessage(i18n, key, params = {}, locale) {
  const loc = unwrapLocale(locale ?? i18n?.global?.locale?.value ?? i18n?.global?.locale ?? 'en')
  const raw = lookupMessage(i18n, loc, key)
  if (!raw) {
    return typeof i18n?.global?.t === 'function' ? i18n.global.t(key, params) : key
  }
  if (raw.includes(', plural,')) {
    return formatIcuPluralMessage(raw, loc, params)
  }
  return formatNamedParams(raw, params)
}

export function tp(i18n, key, count, params = {}) {
  if (!i18n?.global?.t) return key
  return resolvePluralMessage(i18n, key, count, params)
}
