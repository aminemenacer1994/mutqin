/**
 * Locale-aware date/number formatting for Mutqin UI.
 * Uses the active vue-i18n locale rather than the browser default.
 */

const INTL_BY_LOCALE = {
  en: 'en-GB',
  fr: 'fr-FR',
  es: 'es-ES',
  ar: 'ar',
  id: 'id-ID',
  tr: 'tr-TR',
  ur: 'ur-PK',
}

export function unwrapLocale(locale) {
  if (!locale) return 'en'
  if (typeof locale === 'object' && locale !== null && 'value' in locale) {
    return String(locale.value || 'en')
  }
  return String(locale)
}

export function resolveIntlLocale(locale) {
  const base = unwrapLocale(locale).slice(0, 2).toLowerCase()
  return INTL_BY_LOCALE[base] || 'en-GB'
}

export function formatAppNumber(value, locale) {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? '')
  return n.toLocaleString(resolveIntlLocale(locale))
}

export function formatAppDate(value, locale, options = {}) {
  if (!value && value !== 0) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const hasStyle = options.dateStyle || options.timeStyle
  const resolved = hasStyle ? { ...options } : { day: 'numeric', month: 'short', year: 'numeric', ...options }
  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), resolved).format(date)
  } catch (_) {
    return date.toISOString().slice(0, 10)
  }
}

export function formatAppDateTime(value, locale, options = {}) {
  return formatAppDate(value, locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  })
}

/**
 * Relative time using i18n keys, falling back to an absolute date.
 * @param {string|number|Date} value
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @param {string} locale
 */
export function formatRelativeTime(value, t, locale) {
  if (!value && value !== 0) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const translate = typeof t === 'function' ? t : (key) => key
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return translate('common.relative.justNow')
  if (diffMins < 60) return translate('common.relative.minutesAgo', { n: diffMins })
  if (diffHours < 24) return translate('common.relative.hoursAgo', { n: diffHours })
  if (diffDays < 7) return translate('common.relative.daysAgo', { n: diffDays })
  return formatAppDate(date, locale)
}
