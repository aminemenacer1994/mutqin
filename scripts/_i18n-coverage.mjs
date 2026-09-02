/**
 * Shared rules for “still English” / untranslated locale coverage checks.
 */

/** True when the string is only vue-i18n placeholders plus punctuation/whitespace. */
export function isInterpolationOnly(value) {
  if (!value) return true
  const stripped = value
    .replace(/\{[a-z_]+\}/gi, '')
    .replace(/[\s«»"'`–—\-·.,:;!?()[\]/\\+&@#%*]/g, '')
  return stripped.length === 0
}

/** Islamic / product terms that stay Latin across locales. */
const UNIVERSAL_TERMS = new Set([
  'Alhamdulillah',
  'Bismillah',
  'Mutqin',
  'Tajweed',
  'Premium',
  'Qalqalah',
  'Idgham shafawi',
])

function isProductTermOnly(value) {
  if (!value) return true
  const stripped = String(value)
    .replace(/\{[a-z_]+\}/gi, '')
    .replace(/\b(ayahs?|sessions?|Ayahs?|notes|Sessions)\b/gi, '')
    .replace(/[\s«»"'`–—\-·.,:;!?()[\]/\\+&@#%*>0-9]/g, '')
  return stripped.length === 0
}

/**
 * Whether a locale value still needs translation relative to English.
 * Used by translate-100 and the full audit (same criterion).
 */
export function needsTranslationFill(enValue, localeValue) {
  if (localeValue !== enValue) return false
  if (!enValue || !/[A-Za-z]{3,}/.test(enValue)) return false
  if (isInterpolationOnly(enValue)) return false
  if (UNIVERSAL_TERMS.has(enValue)) return false
  return true
}

/** Audit-only skips (author names, CSS-ish tokens, known product keys). */
export function shouldSkipUntranslatedKey(key, value) {
  if (/\.author$/.test(key)) return true
  if (/^Assalamu alaikum\b/.test(value)) return true
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(value)) return true
  if (value.length <= 10 && !value.includes(' ')) return true
  if (isInterpolationOnly(value)) return true
  if (isProductTermOnly(value)) return true
  if (UNIVERSAL_TERMS.has(value)) return true
  if ([
    'memorisation.fonts.naskh',
    'memorisation.export.surahIdFallback',
    'memorisation.misc.surahName',
    'homepage.social.twitter',
    'homepage.social.instagram',
    'homepage.social.youtube',
    'homepage.social.facebook',
  ].includes(key)) return true
  return false
}
