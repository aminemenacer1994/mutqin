import { buildAuthoritativeWordTimings } from '../mushaf/madaniWordSync.js'

// These catalogue IDs refer to the same recitations in Quran.com's ayah API.
export const QURAN_COM_WORD_TIMING_RECITERS = Object.freeze({
  'ar.alafasy': 7,
  'ar.abdulbasitmurattal': 2,
  'ar.abdurrahmaansudais': 3,
  'ar.hanirifai': 5,
  'ar.husary': 6,
  'ar.minshawi': 9,
  'ar.saoodshuraym': 10,
  'ar.shaatree': 4,
  'ar.minshawimujawwad': 8,
  'ar.abdulsamad': 1,
})

const requests = new Map()

export function audioSourceMatchesWordTrack(source, track) {
  if (!source || !track?.audioUrl) return false
  try {
    const base = globalThis.location?.href || 'http://localhost/'
    return new URL(source, base).href === new URL(track.audioUrl, base).href
  } catch {
    return false
  }
}

export async function getAuthoritativeAyahWordTrack(reciterId, verseKey, expectedWordCount) {
  const recitationId = QURAN_COM_WORD_TIMING_RECITERS[String(reciterId || '')]
  const key = String(verseKey || '').trim()
  const count = Math.trunc(Number(expectedWordCount) || 0)
  if (!Number.isInteger(recitationId) || !/^\d{1,3}:\d{1,3}$/.test(key) || count < 1) return null

  const cacheKey = `${recitationId}:${key}:${count}`
  if (!requests.has(cacheKey)) {
    requests.set(cacheKey, import('../lib/quranApis.js')
      .then(({ getAyahRecitation }) => getAyahRecitation(recitationId, key, { fields: 'segments,duration,url' }))
      .then((response) => {
        const audio = response?.data?.audio_files?.find?.((item) => String(item?.verse_key || '') === key)
        const timings = buildAuthoritativeWordTimings(audio?.segments || [], count)
        const path = String(audio?.url || '').replace(/^\/+/, '')
        if (!timings.length || !path) return null
        return {
          timings,
          audioUrl: `https://verses.quran.com/${path}`,
          verseKey: key,
          reciterId: String(reciterId || ''),
          recitationId,
        }
      })
      .catch(() => {
        requests.delete(cacheKey)
        return null
      }))
  }
  return requests.get(cacheKey)
}
