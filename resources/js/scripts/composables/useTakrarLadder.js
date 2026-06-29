import { mutateMutqinState } from './useMutqinPersistence'

export const TAKRAR_STEPS = [5, 10, 20, 'hidden', 'mastered']

export function getTakrarStep(ayah) {
  const level = Math.max(1, Math.min(5, Number(ayah?.mastery_level || 1)))
  return TAKRAR_STEPS[level - 1]
}

export function repeatAyah(state, id) {
  return mutateMutqinState(state, draft => {
    const ayah = draft.ayahs[id]
    if (!ayah) return null
    ayah.repetition_count = Number(ayah.repetition_count || 0) + 1
    ayah.status = 'learning'
    return ayah
  })
}

export function hideAyah(state, id) {
  return mutateMutqinState(state, draft => {
    const ayah = draft.ayahs[id]
    if (!ayah) return null
    ayah.weak_count = Number(ayah.weak_count || 0) + 1
    ayah.status = 'hidden_practice'
    return ayah
  })
}

export function scoreTakrar(state, id, score) {
  return mutateMutqinState(state, draft => {
    const ayah = draft.ayahs[id]
    if (!ayah) return null
    if (score === 'Easy') ayah.mastery_level = Math.min(5, Number(ayah.mastery_level || 1) + 1)
    if (score === 'Forgot') {
      ayah.mastery_level = Math.max(1, Number(ayah.mastery_level || 1) - 1)
      ayah.weak_count = Number(ayah.weak_count || 0) + 1
    }
    ayah.status = ayah.mastery_level >= 5 ? 'mastered' : 'learning'
    ayah.last_review = new Date().toISOString()
    return ayah
  })
}

export function completeTakrarStep(state, id, score = 'Shaky') {
  return mutateMutqinState(state, draft => {
    const ayah = draft.ayahs[id]
    if (!ayah) return null
    const step = getTakrarStep(ayah)
    const canAdvance = typeof step === 'number' ? Number(ayah.repetition_count || 0) >= step : true
    if (score === 'Easy' && canAdvance) ayah.mastery_level = Math.min(5, Number(ayah.mastery_level || 1) + 1)
    if (score === 'Forgot') {
      ayah.mastery_level = Math.max(1, Number(ayah.mastery_level || 1) - 1)
      ayah.weak_count = Number(ayah.weak_count || 0) + 1
      ayah.status = 'weak'
    } else {
      ayah.status = ayah.mastery_level >= 5 ? 'mastered' : 'learning'
    }
    ayah.last_review = new Date().toISOString()
    return ayah
  })
}
