/**
 * Join-ayahs-together (chaining) playback steps — linking pairs and cumulative blocks.
 * Used by the memorisation workspace queue and Mutqin persistence helpers.
 */

export function uniqueVerses(verses = []) {
  const seen = new Set()
  return (Array.isArray(verses) ? verses : []).filter(verse => {
    const key = verse?.key || verse?.id
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function verseKey(verse) {
  return verse?.key || verse?.id || ''
}

/**
 * Cumulative method groups: repeat ayah 1, then 1–2, then 1–2–3, …
 * @returns {Array<Array<object>>}
 */
export function buildCumulativeChainGroups(verses = []) {
  const unique = uniqueVerses(verses)
  const groups = []

  unique.forEach((_, endIndex) => {
    const chain = unique.slice(0, endIndex + 1)
    groups.push(chain.map((verse, chainIndex) => ({
      verse,
      phase: 'Cumulative',
      chainKey: `cumulative:${endIndex + 1}`,
      sequencePosition: chainIndex + 1,
      sequenceTotal: chain.length,
    })))
  })

  return groups
}

function linkingSingle(verse) {
  return [{
    verse,
    phase: 'Linking',
    chainKey: `linking:single:${verseKey(verse)}`,
    sequencePosition: 1,
    sequenceTotal: 1,
  }]
}

function linkingPair(current, next) {
  const pairKey = `linking:${verseKey(current)}->${verseKey(next)}`
  return [
    {
      verse: current,
      phase: 'Linking',
      chainKey: pairKey,
      sequencePosition: 1,
      sequenceTotal: 2,
    },
    {
      verse: next,
      phase: 'Linking',
      chainKey: pairKey,
      sequencePosition: 2,
      sequenceTotal: 2,
    },
  ]
}

/**
 * Linking method: for each neighbouring join, practise the current ayah,
 * then the next ayah, then both together.
 * @returns {Array<Array<object>>}
 */
export function buildLinkingChainGroups(verses = []) {
  const unique = uniqueVerses(verses)
  if (unique.length <= 1) {
    return unique.map((verse) => linkingSingle(verse))
  }

  const groups = []
  for (let index = 0; index < unique.length - 1; index += 1) {
    const current = unique[index]
    const next = unique[index + 1]
    groups.push(linkingSingle(current))
    groups.push(linkingSingle(next))
    groups.push(linkingPair(current, next))
  }

  return groups
}

/** Flat cumulative steps (legacy composable shape). */
export function buildCumulativeChainSteps(verses = []) {
  return buildCumulativeChainGroups(verses).flat()
}

export function buildLinkingChainSteps(verses = []) {
  return buildLinkingChainGroups(verses).flat()
}

/**
 * @param {'linking'|'cumulative'|string} method
 * @returns {Array<Array<object>>}
 */
export function buildChainingGroups(verses = [], method = 'linking') {
  if (method === 'cumulative') return buildCumulativeChainGroups(verses)
  return buildLinkingChainGroups(verses)
}

/**
 * True while the current queue entry is mid-block: the next entry is the rest
 * of the same linking pair or cumulative run, so playback should continue
 * straight into it instead of waiting the between-step gap.
 */
export function chainGroupContinues(entry = null) {
  if (!entry?.chainKey) return false
  const position = Number(entry.sequencePosition || 1)
  const total = Number(entry.sequenceTotal || 1)
  return total > 1 && position < total
}
