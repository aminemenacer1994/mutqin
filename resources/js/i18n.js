import { createI18n } from 'vue-i18n'
import enMessages from './locales/en.json'

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

/** English stays in the shell so boot fallbacks never wait on a locale chunk. */
const STATIC_MESSAGES = {
  en: enMessages,
}

/**
 * Named Mix chunks so language switching does not depend on numeric ids
 * that the watch/prod prune pass can drop.
 */
const LOCALE_LOADERS = {
  fr: () => import(/* webpackChunkName: "locale-fr" */ './locales/fr.json'),
  es: () => import(/* webpackChunkName: "locale-es" */ './locales/es.json'),
  ar: () => import(/* webpackChunkName: "locale-ar" */ './locales/ar.json'),
  id: () => import(/* webpackChunkName: "locale-id" */ './locales/id.json'),
  tr: () => import(/* webpackChunkName: "locale-tr" */ './locales/tr.json'),
  ur: () => import(/* webpackChunkName: "locale-ur" */ './locales/ur.json'),
}

const pendingLocaleLoads = new Map()

function normalizeLocale(locale) {
  return SUPPORT_LOCALES.includes(locale) ? locale : 'en'
}

export function resolveEnMessage(key) {
  return key.split('.').reduce(
    (node, part) => (node && node[part] !== undefined ? node[part] : undefined),
    enMessages
  ) ?? key
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

function unwrapLocaleModule(mod) {
  return (mod && (mod.default || mod)) || enMessages
}

async function importLocaleMessages(locale) {
  if (STATIC_MESSAGES[locale]) return STATIC_MESSAGES[locale]
  const loader = LOCALE_LOADERS[locale]
  if (!loader) return enMessages
  if (pendingLocaleLoads.has(locale)) return pendingLocaleLoads.get(locale)

  const pending = loader()
    .then((mod) => {
      const pack = unwrapLocaleModule(mod)
      STATIC_MESSAGES[locale] = pack
      return pack
    })
    .finally(() => {
      pendingLocaleLoads.delete(locale)
    })
  pendingLocaleLoads.set(locale, pending)
  return pending
}

export async function loadLocaleMessages(i18n, locale) {
  const normalized = normalizeLocale(locale)
  if (!i18n.global.availableLocales.includes(normalized)) {
    const pack = await importLocaleMessages(normalized)
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
    messages: { en: enMessages },
  })
  await loadLocaleMessages(i18n, getSavedLocale())
  return i18n
}
