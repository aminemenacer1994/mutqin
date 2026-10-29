import { resolveIntlLocale } from './i18nFormat.js'

function startOfLocalDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Shared learner dashboard dates: Today / Yesterday / "27 Oct" (+ year if not current).
 * @param {string|number|Date|null|undefined} value
 * @param {(key: string, params?: object) => string} t
 * @param {string} [locale='en']
 * @param {Date} [now=new Date()]
 */
export function formatLearnerDisplayDate(value, t, locale = 'en', now = new Date()) {
  if (!value && value !== 0) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const today = startOfLocalDay(now)
  const target = startOfLocalDay(date)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return t('common.relative.today')
  if (diffDays === -1) return t('common.relative.yesterday')

  const intl = resolveIntlLocale(locale)
  const sameYear = date.getFullYear() === now.getFullYear()
  try {
    return new Intl.DateTimeFormat(intl, {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date)
  } catch (_) {
    return date.toISOString().slice(0, 10)
  }
}
