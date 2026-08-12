const FALLBACK_QURAN_EDITIONS = {
  translation: {
    default_edition: 'en.asad',
    editions: {
      'en.asad': {
        reference: 'Muhammad Asad',
        english_name: 'Muhammad Asad — The Message of the Qur\'an',
      },
    },
  },
  transliteration: {
    default_edition: 'en.transliteration',
    editions: {
      'en.transliteration': {
        reference: 'English Transliteration',
        english_name: 'English Transliteration',
      },
    },
  },
}

export const DEFAULT_TRANSLATION_EDITION = 'en.asad'
export const DEFAULT_TRANSLITERATION_EDITION = 'en.transliteration'

function readConfig(override = null) {
  if (override && typeof override === 'object') return override
  if (typeof window !== 'undefined' && window.mutqinQuranEditions && typeof window.mutqinQuranEditions === 'object') {
    return window.mutqinQuranEditions
  }
  return FALLBACK_QURAN_EDITIONS
}

function resolveEditionMeta(config, kind, editionId) {
  const section = config?.[kind]
  const editions = section?.editions
  if (!section || !editions || typeof editions !== 'object') return null

  const id = editionId || section.default_edition
  const meta = editions[id]
  if (!meta || typeof meta !== 'object') return null

  return { id, ...meta }
}

export function getDefaultEditionId(kind, configOverride = null) {
  const config = readConfig(configOverride)
  const section = config?.[kind]
  const fallback = kind === 'transliteration'
    ? DEFAULT_TRANSLITERATION_EDITION
    : DEFAULT_TRANSLATION_EDITION

  return String(section?.default_edition || fallback)
}

export function getEditionMeta(kind, editionId = null, configOverride = null) {
  return resolveEditionMeta(readConfig(configOverride), kind, editionId)
}

export function getEditionReference(kind, editionId = null, configOverride = null) {
  const meta = getEditionMeta(kind, editionId, configOverride)
  if (!meta) return ''

  const reference = String(meta.reference || '').trim()
  if (reference) return reference

  return String(meta.english_name || meta.name || '').trim()
}
