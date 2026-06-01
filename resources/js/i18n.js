import { createI18n } from 'vue-i18n'

export const SUPPORT_LOCALES = ['en', 'ar', 'fr']
const STORAGE_KEY = 'mutqin.locale'

function normalizeLocale(locale) {
  return SUPPORT_LOCALES.includes(locale) ? locale : 'en'
}

export function getSavedLocale() {
  try {
    return normalizeLocale(localStorage.getItem(STORAGE_KEY) || 'en')
  } catch (e) {
    return 'en'
  }
}

function setDocumentLanguage(locale) {
  const normalized = normalizeLocale(locale)
  const isArabic = normalized === 'ar'
  document.documentElement.setAttribute('lang', normalized)
  document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr')
  document.body?.setAttribute('dir', isArabic ? 'rtl' : 'ltr')
}

export async function loadLocaleMessages(i18n, locale) {
  const normalized = normalizeLocale(locale)
  if (!i18n.global.availableLocales.includes(normalized)) {
    const messages = await import(`./locales/${normalized}.json`)
    i18n.global.setLocaleMessage(normalized, messages.default)
  }
  i18n.global.locale.value = normalized
  setDocumentLanguage(normalized)
  return normalized
}

export async function setLocale(i18n, locale) {
  const normalized = await loadLocaleMessages(i18n, locale)
  try {
    localStorage.setItem(STORAGE_KEY, normalized)
  } catch (e) {
    // no-op: storage may be unavailable
  }
  window.dispatchEvent(new CustomEvent('mutqin:locale-change', { detail: { locale: normalized } }))
  return normalized
}

export async function setupI18n() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {}
  })
  await loadLocaleMessages(i18n, getSavedLocale())
  return i18n
}
