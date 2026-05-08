import axios from 'axios'

const ALQURAN_PROXY_BASE = '/api/alquran'

export function getAyahTajweed(ayahNumber) {
  return axios.get(`${ALQURAN_PROXY_BASE}/ayah/${ayahNumber}/quran-tajweed`)
}

export function getEditions(params = {}) {
  return axios.get(`${ALQURAN_PROXY_BASE}/edition`, { params })
}

export function getEditionsByLanguage(language, params = {}) {
  return axios.get(`${ALQURAN_PROXY_BASE}/edition/language/${language}`, { params })
}

export function getChapterRecitation(recitationId, normalizedSurah) {
  return axios.get(`https://api.quran.com/api/v4/chapter_recitations/${recitationId}/${normalizedSurah}`)
}

export function getSurahEdition(surahNumber, edition) {
  return axios.get(`${ALQURAN_PROXY_BASE}/surah/${surahNumber}/${edition}`)
}

export function getSurahEditions(surahNumber, reciterEdition) {
  const editions = `${reciterEdition},quran-tajweed`
  return axios.get(`${ALQURAN_PROXY_BASE}/surah/${surahNumber}/editions/${editions}`)
}

export function getSurahTransliteration(surahNumber, transliterationIdentifier) {
  return axios.get(`${ALQURAN_PROXY_BASE}/surah/${surahNumber}/${transliterationIdentifier}`)
}

export function getQuranEdition(edition) {
  return axios.get(`${ALQURAN_PROXY_BASE}/quran/${edition}`)
}
