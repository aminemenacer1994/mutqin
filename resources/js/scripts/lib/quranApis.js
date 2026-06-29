import axios from 'axios'

const alquranClient = axios.create({
  baseURL: 'https://api.alquran.cloud/v1',
  headers: {
    Accept: 'application/json'
  }
})

delete alquranClient.defaults.headers.common['X-Requested-With']
delete alquranClient.defaults.headers.common['X-CSRF-TOKEN']

export function getAyahTajweed(ayahNumber) {
  return alquranClient.get(`/ayah/${ayahNumber}/quran-tajweed`)
}

export function getEditions(params = {}) {
  return alquranClient.get('/edition', { params })
}

export function getEditionsByLanguage(language, params = {}) {
  return alquranClient.get(`/edition/language/${language}`, { params })
}

export function getChapterRecitation(recitationId, normalizedSurah) {
  return axios.get(`https://api.quran.com/api/v4/chapter_recitations/${recitationId}/${normalizedSurah}`)
}

export function getSurahEdition(surahNumber, edition) {
  return alquranClient.get(`/surah/${surahNumber}/${edition}`)
}

export function getSurahEditions(surahNumber, reciterEdition) {
  const editions = `${reciterEdition},quran-tajweed`
  return alquranClient.get(`/surah/${surahNumber}/editions/${editions}`)
}

export function getSurahTransliteration(surahNumber, transliterationIdentifier) {
  return alquranClient.get(`/surah/${surahNumber}/${transliterationIdentifier}`)
}

export function getQuranEdition(edition) {
  return alquranClient.get(`/quran/${edition}`)
}
