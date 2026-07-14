export const POST_SESSION_ENCOURAGEMENT_COUNT = 6

export const STREAK_MILESTONES = [3, 7, 14, 21, 30]

const MS_PER_DAY = 86400000

export function hashSeed(input = '') {
  const text = String(input)
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function pickEncouragementIndex(seed = Date.now(), count = POST_SESSION_ENCOURAGEMENT_COUNT) {
  const safeCount = Math.max(1, Number(count) || 1)
  return hashSeed(seed) % safeCount
}

export function getActivityDayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10)
}

export function getDaysSinceLastActivity(events = [], now = Date.now()) {
  if (!Array.isArray(events) || !events.length) return null

  const todayKey = getActivityDayKey(now)
  let lastTs = 0

  for (const event of events) {
    const ts = Number(event?.ts || 0)
    if (!ts) continue
    if (getActivityDayKey(ts) === todayKey) continue
    if (ts > lastTs) lastTs = ts
  }

  if (!lastTs) return null
  return Math.max(1, Math.floor((now - lastTs) / MS_PER_DAY))
}

export function detectSurahCompletion(snapshot = {}, chapter = null) {
  if (!snapshot?.completedAll) return null

  const versesCount = Number(chapter?.verses_count || snapshot?.versesInSurah || 0)
  if (!versesCount) return null

  const rangeStart = Math.max(1, Number(snapshot.rangeStart || 1))
  const rangeEnd = Math.max(rangeStart, Number(snapshot.rangeEnd || rangeStart))

  if (rangeStart !== 1 || rangeEnd < versesCount) return null

  return {
    type: 'surah_complete',
    chapterName: snapshot.chapterName || chapter?.name_simple || ''
  }
}

export function detectStreakMilestone(previousStreak = 0, currentStreak = 0) {
  const prev = Math.max(0, Number(previousStreak) || 0)
  const next = Math.max(0, Number(currentStreak) || 0)
  const milestone = STREAK_MILESTONES.find((value) => prev < value && next >= value)
  if (!milestone) return null
  return { type: 'streak', days: milestone }
}

export function resolveConsistencyNudgeKey(daysAway = 0) {
  const days = Math.max(0, Number(daysAway) || 0)
  if (days < 2) return null
  if (days < 5) return 'memorisation.emotional.consistency.nudgeShort'
  if (days < 10) return 'memorisation.emotional.consistency.nudgeMedium'
  return 'memorisation.emotional.consistency.nudgeLong'
}

export function buildPostSessionEmotionalContext({
  snapshot = {},
  chapter = null,
  previousStreak = 0,
  currentStreak = 0,
  seed = '',
  t = (key) => key
} = {}) {
  const encouragementIndex = pickEncouragementIndex(seed) + 1
  const encouragement = t(`memorisation.emotional.postSession.encouragement${encouragementIndex}`)

  const surahMilestone = detectSurahCompletion(snapshot, chapter)
  const streakMilestone = detectStreakMilestone(previousStreak, currentStreak)

  let milestone = ''
  if (surahMilestone?.chapterName) {
    milestone = t('memorisation.emotional.milestone.surahComplete', {
      chapter: surahMilestone.chapterName
    })
  } else if (streakMilestone?.days) {
    milestone = t(`memorisation.emotional.milestone.streak${streakMilestone.days}`)
  }

  return {
    encouragement,
    milestone
  }
}

export function buildWelcomeBackConsistencyNudge(events = [], now = Date.now(), t = (key) => key) {
  const daysAway = getDaysSinceLastActivity(events, now)
  const key = resolveConsistencyNudgeKey(daysAway)
  if (!key) return ''
  return t(key)
}
