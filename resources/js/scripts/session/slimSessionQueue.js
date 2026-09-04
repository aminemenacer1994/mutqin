/**
 * Drop bulky verse/audio blobs from session queue items.
 * Long ranges (especially cumulative chaining) otherwise clone/stringify
 * the same ayah payload thousands of times on persist and sync.
 */

export function slimSessionQueueItem(item) {
  if (!item || typeof item !== 'object') return item
  const ayahId = item.ayahId || item.verse?.key || item.key || null
  return {
    phase: item.phase || null,
    ayahId,
    chainKey: item.chainKey || null,
    sequencePosition: item.sequencePosition ?? null,
    sequenceTotal: item.sequenceTotal ?? null,
    repeatCount: item.repeatCount ?? null,
    totalRepeats: item.totalRepeats ?? null,
    prompt: item.prompt || '',
    segment: item.segment || null,
    plannerType: item.plannerType || null,
    chainStage: item.chainStage || null,
  }
}

export function slimSessionQueue(queue) {
  if (!Array.isArray(queue)) return []
  return queue.map(slimSessionQueueItem)
}
