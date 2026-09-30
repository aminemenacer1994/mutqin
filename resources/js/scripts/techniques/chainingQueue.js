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

/**
 * Linking method: each ayah alone, then each adjacent pair as one step.
 * @returns {Array<Array<object>>}
 */
export function buildLinkingChainGroups(verses = []) {
  const unique = uniqueVerses(verses)
  const groups = []

  for (let index = 0; index < unique.length; index += 1) {
    const verse = unique[index]
    groups.push([{
      verse,
      phase: 'Linking',
      chainKey: `linking:single:${verseKey(verse)}`,
      sequencePosition: 1,
      sequenceTotal: 1,
    }])

    const nextVerse = unique[index + 1]
    if (nextVerse) {
      const pairKey = `linking:${verseKey(verse)}->${verseKey(nextVerse)}`
      groups.push([
        {
          verse,
          phase: 'Linking',
          chainKey: pairKey,
          sequencePosition: 1,
          sequenceTotal: 2,
        },
        {
          verse: nextVerse,
          phase: 'Linking',
          chainKey: pairKey,
          sequencePosition: 2,
          sequenceTotal: 2,
        },
      ])
    }
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
