import { getDueReviews } from './useRetentionZones'

function getItemId(item = {}) {
  return item.ayahId || item.verse?.key || item.key || item.id || null
}

function getAudioSeconds(item = {}, audioDurations = {}, fallbackAudioSeconds = 30) {
  const id = getItemId(item)
  const verse = item.verse || item
  const value = Number(verse.duration || verse.audioDuration || audioDurations[id] || fallbackAudioSeconds)
  return Number.isFinite(value) && value > 0 ? value : fallbackAudioSeconds
}

function estimateActiveQueueSeconds(queue = [], options = {}) {
  const audioDurations = options.audioDurations || {}
  const fallbackAudioSeconds = Math.max(5, Number(options.averageAudioSeconds || 30))
  const reviewSeconds = Math.max(5, Number(options.reviewSeconds || 20))
  const speed = Math.max(0.25, Number(options.speed || 1))
  const currentAudioDuration = Number(options.currentAudioDuration || 0)
  const currentAudioTime = Number(options.currentAudioTime || 0)

  return queue.reduce((sum, item, index) => {
    if (item.phase === 'Planner') return sum
    if (item.phase === 'Retention') return sum + reviewSeconds
    if (item.phase === 'Recall') return sum + reviewSeconds

    const fullAudio = getAudioSeconds(item, audioDurations, fallbackAudioSeconds) / speed
    if (index === 0 && currentAudioDuration > 0) {
      return sum + Math.max(0, currentAudioDuration - currentAudioTime)
    }
    return sum + fullAudio
  }, 0)
}

export function createDailyPlan(state, verses = [], options = {}) {
  const newLimit = Math.max(3, Math.min(5, Number(options.newAyahs || 5)))
  const uniqueVerses = []
  const seenVerses = new Set()
  ;(Array.isArray(verses) ? verses : []).forEach(verse => {
    const id = verse?.key || verse?.id
    if (!id || seenVerses.has(id)) return
    seenVerses.add(id)
    uniqueVerses.push(verse)
  })
  const newAyahs = uniqueVerses
    .filter(verse => !state.ayahs?.[verse.key] || state.ayahs[verse.key].status === 'new')
    .slice(0, newLimit)
  const newIds = new Set(newAyahs.map(verse => verse.key))
  const dueReviews = getDueReviews(state).filter(ayah => !newIds.has(ayah.id))
  const chains = []
  for (let index = 1; index < newAyahs.length; index += 1) {
    chains.push({
      phase: 'Chaining',
      verse: newAyahs[index],
      ayahId: newAyahs[index].key,
      previousVerse: newAyahs[index - 1],
      fromAyahId: newAyahs[index - 1].key,
      chainStage: index
    })
  }
  const queue = [
    ...newAyahs.map(verse => ({ phase: 'Takrar', verse })),
    ...chains,
    ...newAyahs.map(verse => ({ phase: 'Recall', verse })),
    ...dueReviews.map(ayah => ({ phase: 'Retention', ayahId: ayah.id }))
  ]
  const repeats = Math.max(1, Number(options.repetitions || 1))
  const audioDurations = options.audioDurations || {}
  const fallbackAudioSeconds = Math.max(5, Number(options.averageAudioSeconds || 30))
  const reviewSeconds = Math.max(5, Number(options.reviewSeconds || 20))
  const audioSeconds = newAyahs.reduce((sum, verse) => {
    const duration = Number(verse.duration || verse.audioDuration || audioDurations[verse.key] || fallbackAudioSeconds)
    return sum + (Number.isFinite(duration) && duration > 0 ? duration : fallbackAudioSeconds) * repeats
  }, 0)
  const chainSeconds = chains.reduce((sum, item) => {
    return sum +
      getAudioSeconds(item.previousVerse || {}, audioDurations, fallbackAudioSeconds) +
      getAudioSeconds(item, audioDurations, fallbackAudioSeconds)
  }, 0)
  const dueReviewSeconds = dueReviews.length * reviewSeconds
  const generatedEtaSeconds = audioSeconds + chainSeconds + dueReviewSeconds
  const sessionQueue = Array.isArray(state.sessionState?.queue) ? state.sessionState.queue : []
  const activeIndex = Math.max(0, Math.min(Number(state.sessionState?.current_index || 0), Math.max(sessionQueue.length - 1, 0)))
  const activeEtaSeconds = state.sessionState?.active && sessionQueue.length
    ? estimateActiveQueueSeconds(sessionQueue.slice(activeIndex), options)
    : 0
  const etaMinutes = Math.max(1, Math.ceil((activeEtaSeconds || generatedEtaSeconds) / 60))

  return {
    new: newAyahs,
    new_ayahs: newAyahs,
    chains,
    reviews: dueReviews,
    due_reviews: dueReviews,
    ETA: etaMinutes,
    queue
  }
}
