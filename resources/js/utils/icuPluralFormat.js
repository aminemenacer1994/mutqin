import { unwrapLocale } from './i18nFormat.js'

export function pluralFormForCount(locale, count) {
  const n = Number(count)
  const safe = Number.isFinite(n) ? n : 0
  try {
    return new Intl.PluralRules(locale).select(safe)
  } catch (_) {
    return safe === 1 ? 'one' : 'other'
  }
}

/** @param {Record<string, unknown>} params */
export function formatNamedParams(template, params = {}) {
  if (!template || typeof template !== 'string') return ''
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = params[name]
    return value === undefined || value === null ? `{${name}}` : String(value)
  })
}

export function formatIcuPluralMessage(template, locale, params = {}) {
  if (!template || typeof template !== 'string') return ''
  const intlLocale = unwrapLocale(locale)

  let output = template.replace(
    /\{(\w+),\s*plural,\s*((?:\w+\s*\{[^{}]*\}\s*)+)\}/g,
    (_, varName, rulesBlock) => {
      const n = Number(params[varName] ?? params.n ?? 0)
      const form = pluralFormForCount(intlLocale, n)
      const forms = {}
      const ruleRe = /(\w+)\s*\{([^{}]*)\}/g
      let match = ruleRe.exec(rulesBlock)
      while (match) {
        forms[match[1]] = match[2]
        match = ruleRe.exec(rulesBlock)
      }
      const chosen = forms[form] ?? forms.other ?? Object.values(forms)[0] ?? ''
      return chosen.replace(/#/g, String(n))
    },
  )

  return formatNamedParams(output, params)
}
