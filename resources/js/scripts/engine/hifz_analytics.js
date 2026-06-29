function clamp(value, min = 0, max = 1) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return min
  return Math.max(min, Math.min(max, numericValue))
}

function percent(value) {
  return `${Math.round(clamp(value) * 100)}%`
}

function parseAyahKey(key = '') {
  const match = String(key).match(/^(\d+):(\d+)$/)
  if (!match) return null
  return { surah: Number(match[1]), ayah: Number(match[2]), key: `${Number(match[1])}:${Number(match[2])}` }
}

function dateToken(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function normalizeProgressMap(ayahProgress = {}) {
  return Object.entries(ayahProgress || {})
    .map(([key, progress]) => {
      const ref = parseAyahKey(key)
      if (!ref) return null
      return {
        ...ref,
        masteryScore: clamp(progress?.masteryScore),
        repetitionCount: Math.max(0, Math.floor(Number(progress?.repetitionCount || 0))),
        lastReviewed: progress?.lastReviewed || null,
        nextReview: progress?.nextReview || null
      }
    })
    .filter(Boolean)
}

function groupBySurah(progressEntries = []) {
  const grouped = new Map()
  progressEntries.forEach(entry => {
    if (!grouped.has(entry.surah)) grouped.set(entry.surah, [])
    grouped.get(entry.surah).push(entry)
  })
  return [...grouped.entries()].map(([surah, entries]) => {
    const averageMastery = entries.reduce((sum, item) => sum + item.masteryScore, 0) / Math.max(1, entries.length)
    const mastered = entries.filter(item => item.masteryScore >= 0.9 && item.repetitionCount >= 3).length
    const weak = entries.filter(item => item.masteryScore < 0.65).length
    return {
      surah,
      label: `Surah ${surah}`,
      ayahsTracked: entries.length,
      averageMastery,
      mastered,
      weak
    }
  }).sort((a, b) => b.ayahsTracked - a.ayahsTracked || a.surah - b.surah)
}

function buildWeeklySeries({ savedSessions = [], progressEntries = [] } = {}) {
  const today = new Date()
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return {
      key: dateToken(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      sessions: 0,
      reviews: 0
    }
  })
  const dayMap = new Map(days.map(day => [day.key, day]))

  savedSessions.forEach(session => {
    const day = dayMap.get(dateToken(session?.savedAt || session?.createdAt))
    if (day) day.sessions += 1
  })

  progressEntries.forEach(entry => {
    const day = dayMap.get(dateToken(entry.lastReviewed))
    if (day) day.reviews += 1
  })

  return days
}

function buildRecitationQuality(recordingsLibrary = []) {
  const checks = (Array.isArray(recordingsLibrary) ? recordingsLibrary : [])
    .map(item => Number(item?.accuracyScore ?? item?.accuracy ?? item?.score))
    .filter(Number.isFinite)

  const average = checks.length
    ? checks.reduce((sum, score) => sum + (score > 1 ? score : score * 100), 0) / checks.length
    : 0

  return {
    averageAccuracy: average / 100,
    checksCompleted: checks.length,
    label: checks.length ? percent(average / 100) : 'Ready',
    summary: checks.length
      ? (average >= 90 ? 'Recitation quality steady' : average >= 70 ? 'Recitation quality building' : 'Recitation needs gentle practice')
      : 'Run a recitation check to start tracking quality.'
  }
}

function buildInsights({ memoryBreakdown, weeklyTrends, recitationQuality, spacedHealth } = {}) {
  const insights = []
  const firstHalfReviews = weeklyTrends.slice(0, 3).reduce((sum, day) => sum + day.reviews, 0)
  const secondHalfReviews = weeklyTrends.slice(4).reduce((sum, day) => sum + day.reviews, 0)

  if (secondHalfReviews > firstHalfReviews) insights.push('Revision consistency improving')
  if (memoryBreakdown.weak <= Math.max(1, memoryBreakdown.mastered)) insights.push('Weak ayahs decreasing')
  if (spacedHealth.averageMastery >= 0.7) insights.push('Retention improving')
  if (recitationQuality.averageAccuracy >= 0.85) insights.push('Recitation quality steady')
  if (!insights.length) insights.push('Keep today small and consistent')

  return insights.slice(0, 4)
}

export function buildHifzAnalyticsSnapshot(input = {}) {
  const progressEntries = normalizeProgressMap(input.ayahProgress || {})
  const today = dateToken()
  const todayQueue = Array.isArray(input.todayQueue) ? input.todayQueue : []
  const savedSessions = Array.isArray(input.savedSessions) ? input.savedSessions : []
  const recordingsLibrary = Array.isArray(input.recordingsLibrary) ? input.recordingsLibrary : []
  const currentSession = input.currentSession || {}
  const lastEvaluation = input.mutqinState?.sessionState?.lastSilentEvaluation || null

  const due = progressEntries.filter(item => item.nextReview && dateToken(item.nextReview) <= today).length
  const upcoming = progressEntries.filter(item => item.nextReview && dateToken(item.nextReview) > today).length
  const weak = progressEntries.filter(item => item.masteryScore < 0.65).length
  const mastered = progressEntries.filter(item => item.masteryScore >= 0.9 && item.repetitionCount >= 3).length
  const averageMastery = progressEntries.length
    ? progressEntries.reduce((sum, item) => sum + item.masteryScore, 0) / progressEntries.length
    : 0

  const currentIndex = Math.max(0, Number(currentSession.currentPosition || currentSession.queueIndex || 0))
  const totalVerses = Math.max(0, Number(currentSession.totalVerses || todayQueue.length || 0))
  const todayProgressRatio = totalVerses > 0 ? clamp(currentIndex / totalVerses) : 0
  const completedAyahs = Math.max(currentIndex, Number(currentSession.completedAyahs || 0))
  const memoryStrength = lastEvaluation?.memorisation?.strength
    ? lastEvaluation.memorisation.strength
    : (averageMastery >= 0.9 ? 'strong' : averageMastery >= 0.65 ? 'steady' : 'building')
  const streak = Math.max(
    0,
    Number(input.analytics?.currentStreak || 0),
    buildWeeklySeries({ savedSessions, progressEntries }).filter(day => day.sessions > 0 || day.reviews > 0).length
  )

  const memoryBreakdown = {
    new: todayQueue.filter(item => item?.type === 'new').length,
    due,
    weak,
    mastered,
    steady: Math.max(0, progressEntries.length - weak - mastered)
  }
  const spacedHealth = {
    dueNow: due,
    upcoming,
    averageMastery,
    reviewLoad: due >= 8 ? 'heavy' : due >= 3 ? 'steady' : 'light'
  }
  const recitationQuality = buildRecitationQuality(recordingsLibrary)
  const weeklyTrends = buildWeeklySeries({ savedSessions, progressEntries })
  const surahPerformance = groupBySurah(progressEntries)
  const insights = buildInsights({ memoryBreakdown, weeklyTrends, recitationQuality, spacedHealth })

  return {
    simple: {
      todayProgress: {
        label: 'Today',
        value: totalVerses > 0 ? `${completedAyahs}/${totalVerses}` : `${todayQueue.length} ready`,
        detail: percent(todayProgressRatio)
      },
      memoryStrength: {
        label: 'Memory',
        value: memoryStrength === 'strong' ? 'Strong' : memoryStrength === 'steady' ? 'Steady' : 'Building',
        detail: percent(averageMastery)
      },
      streak: {
        label: 'Streak',
        value: `${streak}`,
        detail: streak === 1 ? 'day' : 'days'
      },
      completedAyahs: {
        label: 'Completed',
        value: `${completedAyahs}`,
        detail: 'ayahs'
      }
    },
    detailed: {
      surahPerformance,
      memoryBreakdown,
      spacedHealth,
      recitationQuality,
      weeklyTrends
    },
    insights
  }
}

export default {
  buildHifzAnalyticsSnapshot
}
