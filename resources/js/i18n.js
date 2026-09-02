import { createI18n } from 'vue-i18n'
import enMessages from './locales/en.json'
import frMessages from './locales/fr.json'
import esMessages from './locales/es.json'
import arMessages from './locales/ar.json'
import idMessages from './locales/id.json'
import trMessages from './locales/tr.json'
import urMessages from './locales/ur.json'

export const SUPPORT_LOCALES = ['en', 'ar', 'fr', 'id', 'tr', 'es', 'ur']
/** Locales shown in the UI language switcher. */
export const SWITCHER_LOCALES = ['en', 'fr', 'es']
export const SWITCHER_LOCALE_LABELS = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
}
export const RTL_LOCALES = ['ar', 'ur']
const STORAGE_KEY = 'mutqin.locale'

/** Eager message packs so locale switching never depends on async chunks Mix may prune. */
const STATIC_MESSAGES = {
  en: enMessages,
  fr: frMessages,
  es: esMessages,
  ar: arMessages,
  id: idMessages,
  tr: trMessages,
  ur: urMessages,
}

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
    // Signed-in accounts: server-resolved locale is the per-user source of truth.
    if (typeof window !== 'undefined' && window.mutqinAuthCheck && window.mutqinInitialLocale) {
      return getInitialLocale()
    }
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
    const pack = STATIC_MESSAGES[normalized] || STATIC_MESSAGES.en
    i18n.global.setLocaleMessage(normalized, pack)
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
    missingWarn: false,
    fallbackWarn: false,
    messages: { ...STATIC_MESSAGES },
  })
  await loadLocaleMessages(i18n, getSavedLocale())
  return i18n
}
