import { createAyahRecord, mutateMutqinState, normaliseAyahRecord } from './useMutqinPersistence'

export function ensureAyah(state, verse) {
  const id = verse?.key || verse?.id
  if (!id) return null
  return mutateMutqinState(state, draft => {
    if (!draft.ayahs[id]) draft.ayahs[id] = createAyahRecord(verse)
    draft.ayahs[id].text = verse.arabic || draft.ayahs[id].text || ''
    return draft.ayahs[id]
  })
}

export function seedAyahs(state, verses = []) {
  return mutateMutqinState(state, draft => {
    verses.forEach(verse => {
      const id = verse?.key || verse?.id
      if (!id) return
      if (!draft.ayahs[id]) draft.ayahs[id] = createAyahRecord(verse)
      draft.ayahs[id].text = verse.arabic || draft.ayahs[id].text || ''
    })
  })
}

export function updateAyah(state, id, patch = {}) {
  if (!id) return null
  return mutateMutqinState(state, draft => {
    if (!draft.ayahs[id]) draft.ayahs[id] = createAyahRecord({ key: id })
    draft.ayahs[id] = normaliseAyahRecord({ ...draft.ayahs[id], ...patch, id })
    return draft.ayahs[id]
  })
}
