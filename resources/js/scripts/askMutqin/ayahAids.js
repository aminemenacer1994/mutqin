import { getSurahEdition } from '../lib/quranApis.js'
import { getDefaultEditionId, getEditionReference } from '../quran/editions.js'

export const ASK_MUTQIN_AID_KINDS = Object.freeze([
  'translation',
  'transliteration',
])

/** Arabic Jalalayn from AlQuran Cloud. */
export const ASK_MUTQIN_TAFSEER_EDITIONS = Object.freeze({
  ar: 'ar.jalalayn',
})

export const ASK_MUTQIN_TAFSEER_EDITION = ASK_MUTQIN_TAFSEER_EDITIONS.ar

const TAFSEER_REFERENCES = Object.freeze({
  ar: 'تفسير الجلالين',
})

const editionCache = new Map()

function editionIdForKind(kind) {
  if (kind === 'transliteration') return getDefaultEditionId('transliteration')
  return getDefaultEditionId('translation')
}

function parseAyahs(response) {
  return response?.data?.data?.ayahs
    || response?.data?.ayahs
    || response?.ayahs
    || []
}

function loadEdition(surah, editionId) {
  const key = `${Number(surah) || 0}:${editionId}`
  const hit = editionCache.get(key)
  if (hit) return hit
  const pending = getSurahEdition(surah, editionId)
    .then((response) => {
      const byAyah = new Map()
      for (const ayah of parseAyahs(response)) {
        const number = Number(ayah?.numberInSurah || 0)
        if (number < 1) continue
        byAyah.set(number, String(ayah?.text || '').trim())
      }
      return byAyah
    })
    .catch((error) => {
      editionCache.delete(key)
      throw error
    })
  editionCache.set(key, pending)
  return pending
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function cleanPlainText(text) {
  return decodeEntities(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function formatTafsirParagraphs(text, lang) {
  let value = cleanPlainText(text)
    .replace(/`+/g, "'")
    .replace(/\s+\n/g, '\n')
    .trim()
  if (!value) return []

  if (lang === 'ar') {
    value = value
      .replace(/\s*«/g, '\n«')
      .replace(/»\s*/g, '»\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } else {
    value = value
      .replace(/\s+(?=\d+\.\s)/g, '\n\n')
      .replace(/\s+(?=(?:Allah|The Prophet|Imam|This Ayah|This Hadith)\b)/g, (match, offset) => (offset > 180 ? '\n\n' : ' '))
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return value
    .split(/\n+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function referenceForKind(kind) {
  if (kind === 'transliteration') return getEditionReference('transliteration')
  if (kind === 'translation') return getEditionReference('translation')
  return ''
}

/**
 * Fetch one reading aid for a matched ayah.
 * @returns {Promise<{ kind: string, text: string, html: string, dir: string, reference: string, sections: Array }>}
 */
export async function loadAskMutqinAyahAid(kind, surah, ayah) {
  const aid = String(kind || '').trim()
  const chapter = Number(surah || 0)
  const verse = Number(ayah || 0)
  const empty = { kind: aid, text: '', html: '', dir: 'ltr', reference: '', sections: [] }
  if (!ASK_MUTQIN_AID_KINDS.includes(aid) || chapter < 1 || verse < 1) return empty

  if (aid === 'tafseer') {
    const arabicMap = await loadEdition(chapter, ASK_MUTQIN_TAFSEER_EDITIONS.ar)
    const sections = [
      {
        lang: 'ar',
        dir: 'rtl',
        label: 'العربية',
        paragraphs: formatTafsirParagraphs(arabicMap.get(verse) || '', 'ar'),
        reference: TAFSEER_REFERENCES.ar,
      },
    ].filter((section) => section.paragraphs.length)
    return {
      kind: aid,
      text: sections.flatMap((section) => section.paragraphs).join('\n\n'),
      html: '',
      dir: 'ltr',
      reference: sections.map((section) => section.reference).filter(Boolean).join(' · '),
      sections,
    }
  }

  const byAyah = await loadEdition(chapter, editionIdForKind(aid))
  const raw = byAyah.get(verse) || ''

  return {
    kind: aid,
    text: cleanPlainText(raw),
    html: '',
    dir: 'ltr',
    reference: referenceForKind(aid),
    sections: [],
  }
}

export function resetAskMutqinAyahAidCache() {
  editionCache.clear()
}
