import { createAyahRecord, mutateMutqinState } from './useMutqinPersistence'

function uniqueVerses(verses = []) {
  const seen = new Set()
  return (Array.isArray(verses) ? verses : []).filter(verse => {
    const key = verse?.key || verse?.id
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildChainQueue(verses = []) {
  const unique = uniqueVerses(verses)
  const queue = []

  unique.forEach((_, endIndex) => {
    unique.slice(0, endIndex + 1).forEach((verse, chainIndex) => {
      queue.push({
        phase: 'Cumulative',
        ayahId: verse.key || verse.id,
        verse,
        chainKey: `cumulative:${endIndex + 1}`,
        sequencePosition: chainIndex + 1,
        sequenceTotal: endIndex + 1
      })
    })
  })

  return queue
}

export function recordChainResult(state, fromAyahId, toAyahId, success = true) {
  if (!state || !fromAyahId || !toAyahId) return null

  return mutateMutqinState(state, draft => {
    if (!draft.chains) draft.chains = {}
    if (!draft.ayahs[fromAyahId]) draft.ayahs[fromAyahId] = createAyahRecord({ key: fromAyahId })
    if (!draft.ayahs[toAyahId]) draft.ayahs[toAyahId] = createAyahRecord({ key: toAyahId })

    const key = `${fromAyahId}->${toAyahId}`
    const current = draft.chains[key] || {
      from: fromAyahId,
      to: toAyahId,
      chain_strength: 50,
      chain_errors: 0,
      attempts: 0,
      last_result_at: null
    }

    current.attempts = Number(current.attempts || 0) + 1
    current.last_result_at = new Date().toISOString()

    if (success) {
      current.chain_strength = Math.min(100, Number(current.chain_strength || 50) + 1)
    } else {
      current.chain_errors = Number(current.chain_errors || 0) + 1
      current.chain_strength = Math.max(0, Number(current.chain_strength || 50) - 5)
      draft.ayahs[toAyahId].chain_errors = Number(draft.ayahs[toAyahId].chain_errors || 0) + 1
      draft.ayahs[toAyahId].weak_count = Number(draft.ayahs[toAyahId].weak_count || 0) + 1
    }

    draft.chains[key] = current
    return current
  })
}
