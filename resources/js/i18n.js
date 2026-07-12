import { createI18n } from 'vue-i18n'
import enMessages from './locales/en.json'

export const SUPPORT_LOCALES = ['en', 'ar', 'fr', 'id', 'tr', 'es']
export const RTL_LOCALES = ['ar']
const STORAGE_KEY = 'mutqin.locale'

function normalizeLocale(locale) {
  return SUPPORT_LOCALES.includes(locale) ? locale : 'en'
}

function getCookieLocale() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)mutqin_locale=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function getInitialLocale() {
  if (typeof window !== 'undefined' && window.mutqinInitialLocale) {
    return normalizeLocale(window.mutqinInitialLocale)
  }
  return normalizeLocale(getCookieLocale() || document.documentElement.getAttribute('lang') || 'en')
}

export function getSavedLocale() {
  try {
    if (typeof window !== 'undefined' && window.mutqinForceInitialLocale) return getInitialLocale()
    return normalizeLocale(localStorage.getItem(STORAGE_KEY) || getInitialLocale())
  } catch (e) {
    return getInitialLocale()
  }
}

function setDocumentLanguage(locale) {
  const normalized = normalizeLocale(locale)
  const isRtl = RTL_LOCALES.includes(normalized)
  document.documentElement.setAttribute('lang', normalized)
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
  document.body?.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
}

export async function loadLocaleMessages(i18n, locale) {
  const normalized = normalizeLocale(locale)
  if (!i18n.global.availableLocales.includes(normalized)) {
    try {
      const messages = normalized === 'en'
        ? { default: enMessages }
        : await import(`./locales/${normalized}.json`)
      i18n.global.setLocaleMessage(normalized, messages.default)
    } catch (error) {
      console.error(`Failed to load locale "${normalized}", falling back to English`, error)
      if (normalized !== 'en') {
        return loadLocaleMessages(i18n, 'en')
      }
    }
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
  document.cookie = `mutqin_locale=${normalized};path=/;max-age=31536000;samesite=lax`
  window.dispatchEvent(new CustomEvent('mutqin:locale-change', { detail: { locale: normalized } }))
  persistLocaleToServer(normalized)
  return normalized
}

async function persistLocaleToServer(locale) {
  if (typeof window === 'undefined' || !window.mutqinAuthCheck) return
  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    await fetch('/api/profile/locale', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ locale }),
    })
  } catch (e) {
    // non-blocking: cookie/localStorage still persist preference
  }
}

export async function setupI18n() {
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: enMessages }
  })
  await loadLocaleMessages(i18n, getSavedLocale())
  return i18n
}
