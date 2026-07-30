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

/** Authentic, short remembrance verses shown on the welcome-back modal. */
export const WELCOME_BACK_REMEMBRANCE_COUNT = 8

const WELCOME_BACK_REMEMBRANCE_FALLBACKS = Object.freeze([
  {
    translation: 'My Lord, increase me in knowledge.',
    source: "Qur'an 20:114",
    intention: 'Even a few ayahs, done consistently, are beloved to Allah.',
  },
  {
    translation: 'As for those who strive for Us, We shall guide them to Our paths.',
    source: "Qur'an 29:69",
    intention: 'Returning to your ayahs with steadiness is part of the path — take it one verse at a time.',
  },
  {
    translation: 'So remember Me; I will remember you.',
    source: "Qur'an 2:152",
    intention: 'A quiet return to the Qur’an is already a form of remembrance.',
  },
  {
    translation: 'Indeed, with hardship comes ease.',
    source: "Qur'an 94:6",
    intention: 'If today’s session feels hard, keep it small and sincere.',
  },
  {
    translation: 'And We have certainly made the Qur’an easy for remembrance.',
    source: "Qur'an 54:17",
    intention: 'Repetition with calm attention is enough for today.',
  },
  {
    translation: 'And be patient, for indeed Allah does not allow the reward of those who do good to be lost.',
    source: "Qur'an 11:115",
    intention: 'Showing up again matters more than finishing quickly.',
  },
  {
    translation: 'Our Lord, give us good in this world and good in the Hereafter.',
    source: "Qur'an 2:201",
    intention: 'Ask Allah for benefit in what you memorise, then begin gently.',
  },
  {
    translation: 'And whoever puts their trust in Allah — He is sufficient for them.',
    source: "Qur'an 65:3",
    intention: 'Begin with trust, then take the next ayah with care.',
  },
])

/**
 * Pick a stable daily remembrance for the welcome-back modal.
 * Changes once per calendar day (and by mode) so the card feels fresh without flickering.
 *
 * @param {{ mode?: 'fresh'|'resume', now?: number|Date, userId?: string|number|null, t?: Function }} [options]
 */
export function buildWelcomeBackRemembrance({
  mode = 'fresh',
  now = Date.now(),
  userId = null,
  t = null,
} = {}) {
  const dayKey = getActivityDayKey(now)
  const seed = `${dayKey}|${mode}|${userId || 'guest'}`
  const index = pickEncouragementIndex(seed, WELCOME_BACK_REMEMBRANCE_COUNT)
  const fallback = WELCOME_BACK_REMEMBRANCE_FALLBACKS[index] || WELCOME_BACK_REMEMBRANCE_FALLBACKS[0]
  const n = index + 1

  const translate = (key, fallbackValue) => {
    if (typeof t !== 'function') return fallbackValue
    const value = t(key)
    if (!value || value === key || String(value).includes(key)) return fallbackValue
    return String(value)
  }

  return {
    index: n,
    translation: translate(`memorisation.welcomeBack.reminders.${n}.translation`, fallback.translation),
    source: translate(`memorisation.welcomeBack.reminders.${n}.source`, fallback.source),
    intention: translate(`memorisation.welcomeBack.reminders.${n}.intention`, fallback.intention),
  }
}

