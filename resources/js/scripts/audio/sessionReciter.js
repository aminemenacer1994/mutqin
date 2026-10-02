export const DEFAULT_SESSION_RECITER_ID = 'ar.alafasy'

export function resolvePickedReciterId(eventValue, fallbackId = DEFAULT_SESSION_RECITER_ID) {
  const picked = String(eventValue || '').trim()
  if (picked) return picked
  return String(fallbackId || DEFAULT_SESSION_RECITER_ID).trim() || DEFAULT_SESSION_RECITER_ID
}

/**
 * User dropdown picks always win. Ignore only programmatic <select> writes
 * and the first paint before the native control has been synced.
 */
export function shouldApplyReciterSelectChange({
  syncing = false,
  selectReady = true,
  pickedId = '',
} = {}) {
  if (syncing) return false
  if (selectReady === false) return false
  return !!String(pickedId || '').trim()
}

export function isDuplicateReciterCommit(nextId, lastId, lastAt, now = Date.now(), windowMs = 80) {
  return String(nextId || '') === String(lastId || '')
    && Number(now) - Number(lastAt || 0) < Number(windowMs || 0)
}

export function ayahUrlMatchesReciter(audioUrl, reciterId) {
  const url = String(audioUrl || '').trim()
  const reciter = String(reciterId || '').trim()
  if (!url || !reciter) return false
  return url.includes(`/${reciter}/`) || url.includes(`${reciter}.`)
}

/**
 * Try the selected reciter on every host first. Alafasy is only a last-resort
 * fallback so a failed Sudais CDN hit cannot keep playing Mishary.
 */
export function orderAyahAudioCandidateUrls({
  reciterId,
  globalAyahNumber,
  bundledUrl = '',
  existingUrl = '',
} = {}) {
  const reciter = String(reciterId || DEFAULT_SESSION_RECITER_ID).trim() || DEFAULT_SESSION_RECITER_ID
  const global = Number(globalAyahNumber)
  const urls = []
  const push = (url) => {
    const value = String(url || '').trim()
    if (value && !urls.includes(value)) urls.push(value)
  }

  push(bundledUrl)
  if (existingUrl && ayahUrlMatchesReciter(existingUrl, reciter)) {
    push(existingUrl)
  }
  if (Number.isFinite(global) && global > 0) {
    push(`https://cdn.islamic.network/quran/audio/128/${reciter}/${global}.mp3`)
    push(`https://cdn.alquran.cloud/media/audio/ayah/${reciter}/${global}`)
    if (reciter !== DEFAULT_SESSION_RECITER_ID) {
      push(`https://cdn.islamic.network/quran/audio/128/${DEFAULT_SESSION_RECITER_ID}/${global}.mp3`)
      push(`https://cdn.alquran.cloud/media/audio/ayah/${DEFAULT_SESSION_RECITER_ID}/${global}`)
    }
  }
  return urls
}
