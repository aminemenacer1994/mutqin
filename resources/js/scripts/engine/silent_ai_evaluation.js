import { updateAyahProgress } from './spaced_repetition_memory'

const DEFAULT_HESITATION_SECONDS = 2.25

function clamp(value, min = 0, max = 1) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return min
  return Math.max(min, Math.min(max, numericValue))
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(Number(value || 0) * factor) / factor
}

function parseAyahRef(input = {}) {
  const key = String(input.ayahId || input.key || input.verse?.key || '').trim()
  const match = key.match(/^(\d+):(\d+)$/)
  if (match) return { surah: Number(match[1]), ayah: Number(match[2]), key }

  const surah = Number(input.surah || input.surahId || input.chapterId || input.verse?.surah || input.verse?.chapterId)
  const ayah = Number(input.ayah || input.ayahNumber || input.verse?.ayah || input.verse?.number)
  if (Number.isFinite(surah) && Number.isFinite(ayah) && surah > 0 && ayah > 0) {
    return { surah, ayah, key: `${surah}:${ayah}` }
  }

  return null
}

function extractAccuracyScore(payload = {}) {
  const rawScore = payload.recallAccuracy
    ?? payload.accuracyScore
    ?? payload.accuracy
    ?? payload.score
    ?? payload.result?.accuracyScore
    ?? payload.result?.accuracy

  const numericScore = Number(rawScore)
  if (!Number.isFinite(numericScore)) return null
  return numericScore > 1 ? clamp(numericScore / 100) : clamp(numericScore)
}

function scoreFromWordStatuses(payload = {}) {
  const statuses = Array.isArray(payload.wordStatuses)
    ? payload.wordStatuses
    : (Array.isArray(payload.statuses) ? payload.statuses : [])

  if (!statuses.length) return null

  const score = statuses.reduce((sum, item) => {
    const status = String(item?.status || '').toLowerCase()
    if (status === 'correct') return sum + 1
    if (status === 'partial' || status === 'close') return sum + 0.5
    return sum
  }, 0)

  return clamp(score / statuses.length)
}

function getRecallAccuracy(payload = {}) {
  return extractAccuracyScore(payload) ?? scoreFromWordStatuses(payload) ?? 0
}

function classifyStrength(accuracy = 0) {
  if (accuracy >= 0.9) return 'strong'
  if (accuracy >= 0.65) return 'steady'
  return 'needsPractice'
}

function scoreForSpacedRepetition(accuracy = 0) {
  if (accuracy >= 0.9) return 1
  if (accuracy >= 0.65) return 0.5
  return 0
}

function getGentleFeedback({ accuracy = 0, hesitationCount = 0, smoothness = 1 } = {}) {
  if (accuracy >= 0.9 && hesitationCount === 0 && smoothness >= 0.85) {
    return 'Strong recall. Keep the same calm pace.'
  }
  if (accuracy >= 0.65) {
    return hesitationCount > 0
      ? 'Good effort. Give this ayah one slower pass.'
      : 'Good recall. A short review will make it steadier.'
  }
  return 'Review this ayah gently before moving on.'
}

function normalizeTimedWords(words = []) {
  return (Array.isArray(words) ? words : [])
    .map((word, index) => ({
      index,
      start: Number(word?.start ?? word?.startTime),
      end: Number(word?.end ?? word?.endTime),
      confidence: Number(word?.confidence ?? 1)
    }))
    .filter(word => Number.isFinite(word.start) || Number.isFinite(word.end))
    .sort((a, b) => {
      const aTime = Number.isFinite(a.start) ? a.start : a.end
      const bTime = Number.isFinite(b.start) ? b.start : b.end
      return aTime - bTime
    })
}

function detectHesitations(payload = {}) {
  const threshold = Math.max(0.5, Number(payload.hesitationThresholdSeconds || DEFAULT_HESITATION_SECONDS))
  const timedWords = normalizeTimedWords(payload.words || payload.recognitionWords || payload.committedWords || [])
  const hesitations = []

  for (let index = 1; index < timedWords.length; index += 1) {
    const previousEnd = Number.isFinite(timedWords[index - 1].end) ? timedWords[index - 1].end : timedWords[index - 1].start
    const currentStart = Number.isFinite(timedWords[index].start) ? timedWords[index].start : timedWords[index].end
    const gapSeconds = currentStart - previousEnd
    if (Number.isFinite(gapSeconds) && gapSeconds >= threshold) {
      hesitations.push({
        afterWordIndex: timedWords[index - 1].index,
        seconds: round(gapSeconds)
      })
    }
  }

  const explicitCount = Number(payload.hesitationCount ?? payload.hesitations)
  const hesitationCount = Math.max(
    hesitations.length,
    Number.isFinite(explicitCount) ? Math.max(0, Math.floor(explicitCount)) : 0
  )

  return { hesitationCount, hesitations }
}

export function evaluateRecitationSilently(payload = {}) {
  const { hesitationCount, hesitations } = detectHesitations(payload)
  const accuracy = getRecallAccuracy(payload)
  const wordCount = Math.max(1, Number(payload.wordCount || payload.targetWordCount || payload.targetWords?.length || 1))
  const hesitationPenalty = Math.min(0.55, hesitationCount / Math.max(3, wordCount))
  const confidencePenalty = clamp(1 - Number(payload.averageConfidence ?? payload.confidence ?? 1))
  const smoothness = clamp(1 - hesitationPenalty - confidencePenalty * 0.25)

  return {
    kind: 'recitation',
    silent: true,
    smoothness: round(smoothness),
    hesitationCount,
    hesitations,
    feedback: getGentleFeedback({ accuracy, hesitationCount, smoothness })
  }
}

export function evaluateMemorisationSilently(payload = {}) {
  const accuracy = getRecallAccuracy(payload)
  const strength = classifyStrength(accuracy)
  const spacedRepetitionScore = scoreForSpacedRepetition(accuracy)
  const ayahRef = parseAyahRef(payload)
  const progress = ayahRef
    ? updateAyahProgress(ayahRef.surah, ayahRef.ayah, spacedRepetitionScore)
    : null

  return {
    kind: 'memorisation',
    silent: true,
    recallAccuracy: round(accuracy),
    strength,
    feedback: getGentleFeedback({ accuracy }),
    spacedRepetitionUpdated: !!progress,
    progress
  }
}

export function runSilentAiEvaluation(payload = {}) {
  const mode = String(payload.mode || payload.kind || payload.type || '').toLowerCase()
  const shouldEvaluateMemorisation = mode === 'memorisation'
    || mode === 'memory'
    || mode === 'recall'
    || payload.updateSpacedRepetition === true

  const recitation = evaluateRecitationSilently(payload)
  const memorisation = shouldEvaluateMemorisation
    ? evaluateMemorisationSilently(payload)
    : null

  return {
    silent: true,
    recitation,
    memorisation,
    feedback: memorisation?.feedback || recitation.feedback
  }
}

export default {
  evaluateRecitationSilently,
  evaluateMemorisationSilently,
  runSilentAiEvaluation
}
