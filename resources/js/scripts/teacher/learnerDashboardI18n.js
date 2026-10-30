import enMessages from '../../locales/en.json' with { type: 'json' }
import { formatIcuPluralMessage, formatNamedParams, pluralFormForCount } from '../../utils/icuPluralFormat.js'
import { unwrapLocale } from '../../utils/i18nFormat.js'

const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other']

function teacherMessages(locale, i18n) {
  const loc = unwrapLocale(locale || 'en')
  const fromI18n = i18n?.global?.getLocaleMessage?.(loc)?.teacher
  if (fromI18n && typeof fromI18n === 'object') return fromI18n
  if (loc !== 'en') {
    const enPack = i18n?.global?.getLocaleMessage?.('en')?.teacher
    if (enPack && typeof enPack === 'object') return enPack
  }
  return enMessages.teacher || {}
}

function resolveTeacherKey(bucket, dottedKey) {
  const path = dottedKey.startsWith('teacher.') ? dottedKey.slice('teacher.'.length) : dottedKey
  const node = path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), bucket)
  return typeof node === 'string' ? node : null
}

function lookupString(locale, i18n, key) {
  const bucket = teacherMessages(locale, i18n)
  return resolveTeacherKey(bucket, key) ?? resolveTeacherKey(enMessages.teacher || {}, key)
}

/**
 * Learner dashboard copy — always resolves from locale JSON (en fallback), never ICU literals.
 */
export function learnerDashboardT(locale, i18n, key, params = {}) {
  const raw = lookupString(locale, i18n, key)
  if (!raw) {
    return formatNamedParams(String(key).replace(/^teacher\./, ''), params)
  }
  if (raw.includes(', plural,')) {
    return formatIcuPluralMessage(raw, unwrapLocale(locale), params)
  }
  return formatNamedParams(raw, params)
}

export function learnerDashboardTp(locale, i18n, key, count, params = {}) {
  const n = Number(count) || 0
  const loc = unwrapLocale(locale || 'en')
  const form = pluralFormForCount(loc, n)
  const base = key.startsWith('teacher.') ? key.slice('teacher.'.length) : key
  const suffixIndex = PLURAL_SUFFIXES.indexOf(form)
  const trySuffixes = suffixIndex >= 0
    ? [...PLURAL_SUFFIXES.slice(0, suffixIndex + 1).reverse(), 'other']
    : ['other', 'one']

  const seen = new Set()
  for (const suffix of trySuffixes) {
    const pluralKey = `teacher.${base}_${suffix}`
    if (seen.has(pluralKey)) continue
    seen.add(pluralKey)
    const raw = lookupString(locale, i18n, pluralKey)
    if (raw && !raw.includes(', plural,')) {
      return formatNamedParams(raw, { ...params, n })
    }
  }

  const legacy = lookupString(locale, i18n, key)
  if (legacy?.includes(', plural,')) {
    return formatIcuPluralMessage(legacy, loc, { ...params, n })
  }
  if (legacy) {
    return formatNamedParams(legacy, { ...params, n })
  }

  return formatNamedParams(String(n), { ...params, n })
}
