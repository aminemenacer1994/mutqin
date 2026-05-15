import { mutateMutqinState } from './useMutqinPersistence'

function transitionKey(fromId, toId) {
  return `${fromId}->${toId}`
}

export function buildChainQueue(verses = []) {
  if (!Array.isArray(verses) || verses.length < 2) return []
  const seen = new Set()
  const orderedVerses = verses.filter(verse => {
    const id = verse?.key || verse?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
  if (orderedVerses.length < 2) return []
  const queue = []
  orderedVerses.forEach((_, endIndex) => {
    for (let index = 0; index <= endIndex; index += 1) {
      queue.push({
        phase: 'Chaining',
        verse: orderedVerses[index],
        chainStage: endIndex + 1,
        prompt: index === 0 ? `Start ayah ${orderedVerses[index]?.number || index + 1}` : `Continue after ayah ${orderedVerses[index - 1]?.number || index}`
      })
    }
  })
  return queue
}

export function recordChainResult(state, fromId, toId, success = true) {
  if (!fromId || !toId) return null
  return mutateMutqinState(state, draft => {
    const key = transitionKey(fromId, toId)
    if (!draft.chains[key]) {
      draft.chains[key] = { from: fromId, to: toId, chain_strength: 50, chain_errors: 0, attempts: 0 }
    }
    const chain = draft.chains[key]
    chain.attempts += 1
    if (success) chain.chain_strength = Math.min(100, Number(chain.chain_strength || 0) + 1)
    else {
      chain.chain_strength = Math.max(0, Number(chain.chain_strength || 0) - 10)
      chain.chain_errors = Number(chain.chain_errors || 0) + 1
    }
    if (draft.ayahs[toId]) {
      draft.ayahs[toId].chain_strength = chain.chain_strength
      draft.ayahs[toId].chain_errors = Number(draft.ayahs[toId].chain_errors || 0) + (success ? 0 : 1)
      if (!success) draft.ayahs[toId].weak_count = Number(draft.ayahs[toId].weak_count || 0) + 1
    }
    return chain
  })
}
