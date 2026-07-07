
const HIFZ_PLAN_STORAGE_KEY = 'mutqin_hifz_plan'
const AYAH_PROGRESS_STORAGE_KEY = 'mutqin_ayah_progress'
const LEGACY_AYAH_PROGRESS_STORAGE_KEY = 'mutqin_spaced_repetition_memory'
const HIFZ_PLAN_ARCHIVE_STORAGE_KEY = 'mutqin_hifz_plan_archives'
const HIFZ_APP_STATE_STORAGE_KEY = 'mutqin_hifz_app_state'

const QURAN_TOTALS = {
  ayahs: 6236,
  pages: 604,
  hizb: 60,
  juz: 30
}

const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98,
  135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11,
  11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25,
  22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6,
  3, 5, 4, 5, 6
]

const SURAH_NAMES = [
  'Al-Fatiha', 'Al-Baqarah', 'Aal-Imran', 'An-Nisa', 'Al-Maidah', 'Al-Anam', 'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus',
  'Hud', 'Yusuf', 'Ar-Rad', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha',
  'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur', 'Al-Furqan', 'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum',
  'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
  'Fussilat', 'Ash-Shuraa', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
  'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqiah', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahanah',
  'As-Saff', 'Al-Jumuah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Maarij',
  'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Naziat', 'Abasa',
  'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-Ala', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
  'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat',
  'Al-Qariah', 'At-Takathur', 'Al-Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Maun', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr',
  'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'
]

const DEFAULT_PLAN = {
  goalSettings: {
    dailyNewAyahs: { min: 1, max: 3 }
  },
  learningStyle: 'balanced',
  focusMode: 'mixed'
}

function hasLocalStorage() {
  return typeof localStorage !== 'undefined'
}

function getStorageAdapter() {
  const bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null
  if (bridge && typeof bridge.getItem === 'function') return bridge
  if (hasLocalStorage()) return localStorage
  return null
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = value ? JSON.parse(value) : fallback
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function readStorageObject(key, fallback = {}) {
  const storage = getStorageAdapter()
  if (!storage) return fallback
  const parsed = safeJsonParse(storage.getItem(key), fallback)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
}

function parseAyahKey(key) {
  const match = String(key || '').trim().match(/^(\d+):(\d+)$/)
  if (!match) return null
  const surah = Number(match[1])
  const ayah = Number(match[2])
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || surah > 114) return null
  const maxAyah = SURAH_AYAH_COUNTS[surah - 1] || 0
  if (ayah < 1 || ayah > maxAyah) return null
  return { key: `${surah}:${ayah}`, surah, ayah }
}

function compareAyahRefs(a, b) {
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.ayah - b.ayah
}

function getTodayDateToken(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateToken(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return getTodayDateToken(date)
}

function isDueToday(progress = {}, todayToken = getTodayDateToken()) {
  if (!progress.nextReview) return true
  const reviewToken = getDateToken(progress.nextReview)
  return !reviewToken || reviewToken <= todayToken
}

function normalizeProgress(progress = {}) {
  const masteryScore = Number(progress.masteryScore)
  const repetitionCount = Number(progress.repetitionCount)
  const attempts = Number(progress.attempts)
  const lastScore = Number(progress.lastScore)
  return {
    surah: Number.isFinite(Number(progress.surah)) ? Number(progress.surah) : 0,
    ayah: Number.isFinite(Number(progress.ayah)) ? Number(progress.ayah) : 0,
    attempts: Number.isFinite(attempts) ? Math.max(0, Math.floor(attempts)) : 0,
    lastScore: lastScore === 1 || lastScore === 0.5 ? lastScore : 0,
    masteryScore: Number.isFinite(masteryScore) ? Math.max(0, Math.min(1, masteryScore)) : 0,
    repetitionCount: Number.isFinite(repetitionCount) ? Math.max(0, Math.floor(repetitionCount)) : 0,
    lastReviewed: progress.lastReviewed || null,
    nextReview: progress.nextReview || null
  }
}

function getProgressEntries(ayahProgress = {}) {
  return Object.entries(ayahProgress)
    .map(([key, progress]) => {
      const ref = parseAyahKey(key)
      if (!ref) return null
      return {
        ...ref,
        progress: normalizeProgress(progress)
      }
    })
    .filter(Boolean)
    .sort(compareAyahRefs)
}

function normalizeDailyNewAyahCount(plan = DEFAULT_PLAN) {
  const dailyNewAyahs = plan.goalSettings?.dailyNewAyahs
  if (typeof dailyNewAyahs === 'number') return Math.max(1, Math.min(10, Math.floor(dailyNewAyahs)))
  const max = Number(dailyNewAyahs?.max)
  const min = Number(dailyNewAyahs?.min)
  const value = Number.isFinite(max) ? max : min
  return Number.isFinite(value) ? Math.max(1, Math.min(10, Math.floor(value))) : 3
}

function addDays(date, days = 0) {
  const next = new Date(date)
  next.setDate(next.getDate() + Number(days || 0))
  return next
}

function formatDateToken(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

function formatDuration(days = 0) {
  const safeDays = Math.max(0, Math.ceil(Number(days || 0)))
  const years = Math.floor(safeDays / 365)
  const months = Math.floor((safeDays % 365) / 30)
  const remainingDays = (safeDays % 365) % 30
  const parts = []
  if (years) parts.push(`${years} Year${years === 1 ? '' : 's'}`)
  if (months) parts.push(`${months} Month${months === 1 ? '' : 's'}`)
  if (remainingDays || !parts.length) parts.push(`${remainingDays} Day${remainingDays === 1 ? '' : 's'}`)
  return parts.join(' ')
}

function normalizeSurahName(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\bsurah\s+/g, ' ')
    .replace(/^al\s+/, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSurahIndexByName(name = '') {
  const normalized = normalizeSurahName(name)
  if (!normalized) return -1
  return SURAH_NAMES.findIndex(surahName => {
    const candidate = normalizeSurahName(surahName)
    return candidate === normalized || candidate.replace(/\s+/g, '') === normalized.replace(/\s+/g, '')
  })
}

function getSurahIdByName(name = '') {
  const index = getSurahIndexByName(name)
  return index >= 0 ? index + 1 : 0
}

function resolvePlanScope(plan = DEFAULT_PLAN) {
  const surah = Number(plan.selectedSurahId || getSurahIdByName(plan.selectedSurah || plan.surah || ''))
  if (!surah) return null
  const maxAyah = Number(SURAH_AYAH_COUNTS[surah - 1] || 0)
  const selectedFrom = Number(plan.selectedRange?.from || plan.range?.from || 0)
  const selectedTo = Number(plan.selectedRange?.to || plan.range?.to || 0)
  const startAyah = Number.isFinite(selectedFrom) && selectedFrom > 0 ? selectedFrom : 1
  const endAyah = Number.isFinite(selectedTo) && selectedTo >= startAyah ? Math.min(selectedTo, maxAyah) : maxAyah
  return {
    surah,
    startAyah,
    endAyah,
    totalAyahs: Math.max(1, endAyah - startAyah + 1)
  }
}

function getPlanAyahTotal(plan = DEFAULT_PLAN) {
  const scope = resolvePlanScope(plan)
  if (scope) return scope.totalAyahs
  const from = Number(plan.selectedRange?.from || plan.range?.from || 0)
  const to = Number(plan.selectedRange?.to || plan.range?.to || 0)
  if (Number.isFinite(from) && Number.isFinite(to) && from > 0 && to >= from) {
    return Math.max(1, Math.floor(to - from + 1))
  }

  const surahIndex = getSurahIndexByName(plan.selectedSurah || plan.surah || '')
  if (surahIndex >= 0) return SURAH_AYAH_COUNTS[surahIndex] || QURAN_TOTALS.ayahs

  return QURAN_TOTALS.ayahs
}

function scaleQuranMetric(totalAyahs = QURAN_TOTALS.ayahs, metric = QURAN_TOTALS.pages) {
  if (totalAyahs >= QURAN_TOTALS.ayahs) return metric
  return Math.max(1, Number(((totalAyahs / QURAN_TOTALS.ayahs) * metric).toFixed(metric > 100 ? 0 : 1)))
}

function calculatePlanForecast(plan = DEFAULT_PLAN, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date()
  const totalAyahs = Math.max(1, Number(options.totalAyahs || getPlanAyahTotal(plan)))
  const completedAyahs = Math.max(0, Math.min(totalAyahs, Number(options.completedAyahs || 0)))
  const dailyTarget = normalizeDailyNewAyahCount(plan)
  const remainingAyahs = Math.max(0, totalAyahs - completedAyahs)
  const adjustmentDays = Math.max(0, Number(plan.completionAdjustmentDays || 0))
  const estimatedDays = (remainingAyahs === 0 ? 0 : Math.ceil(remainingAyahs / dailyTarget)) + adjustmentDays
  const completionDate = addDays(now, estimatedDays)

  return {
    totalAyahs,
    totalPages: scaleQuranMetric(totalAyahs, QURAN_TOTALS.pages),
    totalHizb: scaleQuranMetric(totalAyahs, QURAN_TOTALS.hizb),
    totalJuz: scaleQuranMetric(totalAyahs, QURAN_TOTALS.juz),
    dailyTarget,
    completedAyahs,
    remainingAyahs,
    estimatedDays,
    estimatedDuration: formatDuration(estimatedDays),
    estimatedCompletionDate: formatDateToken(completionDate),
    generatedAt: now.toISOString()
  }
}

function getRevisionLimit(plan = DEFAULT_PLAN) {
  const baseByStyle = {
    light: 2,
    balanced: 4,
    intensive: 6
  }
  const base = baseByStyle[plan.learningStyle] || baseByStyle.balanced
  if (plan.focusMode === 'revisionPriority') return base * 2
  if (plan.focusMode === 'weakAyahFocus') return base * 2
  if (plan.focusMode === 'newPriority') return Math.max(1, Math.floor(base / 2))
  return base
}

function compareByNextReview(a, b) {
  const aTime = Date.parse(a.progress.nextReview || '')
  const bTime = Date.parse(b.progress.nextReview || '')
  const safeATime = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER
  const safeBTime = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER
  return safeATime - safeBTime
}

function compareByWeakness(a, b) {
  if (a.progress.masteryScore !== b.progress.masteryScore) {
    return a.progress.masteryScore - b.progress.masteryScore
  }
  if (a.progress.repetitionCount !== b.progress.repetitionCount) {
    return a.progress.repetitionCount - b.progress.repetitionCount
  }
  return compareByNextReview(a, b)
}

function sortRevisionEntries(entries = [], plan = DEFAULT_PLAN) {
  const sorted = [...entries]
  if (plan.focusMode === 'weakAyahFocus') return sorted.sort(compareByWeakness)
  if (plan.focusMode === 'revisionPriority') return sorted.sort((a, b) => compareByNextReview(a, b) || compareByWeakness(a, b))
  if (plan.focusMode === 'newPriority') return sorted.sort(compareByNextReview)
  return sorted.sort((a, b) => compareByWeakness(a, b) || compareByNextReview(a, b))
}

function getNextAyahRef(ref) {
  if (!ref) return { surah: 1, ayah: 1, key: '1:1' }
  const maxAyah = SURAH_AYAH_COUNTS[ref.surah - 1] || 0
  if (ref.ayah < maxAyah) {
    return { surah: ref.surah, ayah: ref.ayah + 1, key: `${ref.surah}:${ref.ayah + 1}` }
  }
  if (ref.surah < 114) {
    return { surah: ref.surah + 1, ayah: 1, key: `${ref.surah + 1}:1` }
  }
  return null
}

function getHighestKnownAyah(entries = []) {
  return entries.reduce((highest, entry) => {
    if (!highest) return entry
    return compareAyahRefs(entry, highest) > 0 ? entry : highest
  }, null)
}

function buildQueueItem(entry, type) {
  return {
    key: entry.key,
    surah: entry.surah,
    ayah: entry.ayah,
    type,
    chapterId: entry.surah,
    number: entry.ayah,
    progress: entry.progress || null
  }
}

function getNewAyahEntries(progressEntries = [], count = 3, scope = null) {
  const knownKeys = new Set(progressEntries.map(entry => entry.key))
  if (scope?.surah) {
    const newAyahs = []
    for (let ayah = scope.startAyah; ayah <= scope.endAyah && newAyahs.length < count; ayah += 1) {
      const key = `${scope.surah}:${ayah}`
      if (knownKeys.has(key)) continue
      newAyahs.push({
        surah: scope.surah,
        ayah,
        key
      })
    }
    return newAyahs
  }

  const newAyahs = []
  let nextRef = getNextAyahRef(getHighestKnownAyah(progressEntries))

  while (nextRef && newAyahs.length < count) {
    if (!knownKeys.has(nextRef.key)) newAyahs.push(nextRef)
    nextRef = getNextAyahRef(nextRef)
  }

  return newAyahs
}

export function loadHifzPlan() {
  const storedPlan = readStorageObject(HIFZ_PLAN_STORAGE_KEY, DEFAULT_PLAN)
  return {
    ...DEFAULT_PLAN,
    ...storedPlan,
    goalSettings: {
      ...DEFAULT_PLAN.goalSettings,
      ...(storedPlan.goalSettings || {})
    }
  }
}

export function loadAyahProgress() {
  return {
    ...readStorageObject(LEGACY_AYAH_PROGRESS_STORAGE_KEY, {}),
    ...readStorageObject(AYAH_PROGRESS_STORAGE_KEY, {})
  }
}

export function generateTodaySession() {
  const plan = loadHifzPlan()
  if (plan.status === 'paused' || plan.lifecycle?.status === 'paused') return []

  const scope = resolvePlanScope(plan)
  const progressEntries = getProgressEntries(loadAyahProgress())
    .filter(entry => {
      if (!scope) return true
      return entry.surah === scope.surah && entry.ayah >= scope.startAyah && entry.ayah <= scope.endAyah
    })
  const todayToken = getTodayDateToken()

  const dueAyahs = progressEntries
    .filter(entry => isDueToday(entry.progress, todayToken))
    .sort((a, b) => compareByNextReview(a, b) || compareByWeakness(a, b))
    .map(entry => buildQueueItem(entry, 'due'))

  const dueKeys = new Set(dueAyahs.map(item => item.key))
  const revisionLimit = getRevisionLimit(plan)
  const revisionAyahs = sortRevisionEntries(
    progressEntries.filter(entry => !dueKeys.has(entry.key)),
    plan
  )
    .slice(0, revisionLimit)
    .map(entry => buildQueueItem(entry, 'revision'))

  const existingQueueKeys = new Set([...dueAyahs, ...revisionAyahs].map(item => item.key))
  const newAyahLimit = normalizeDailyNewAyahCount(plan)
  const newAyahs = getNewAyahEntries(progressEntries, newAyahLimit, scope)
    .filter(entry => !existingQueueKeys.has(entry.key))
    .map(entry => buildQueueItem(entry, 'new'))

  return [
    ...dueAyahs,
    ...revisionAyahs,
    ...newAyahs
  ]
}

export function createHifzAppState() {
  return {
    mode: 'none',
    sessionActive: false,
    activePlanId: null,
    todaySession: [],
    progress: {},
    plannerReady: false,
    lastEvent: '',
    updatedAt: null
  }
}

export function buildHifzPlannerSessionState(options = {}) {
  const plan = options.plan || loadHifzPlan()
  const progress = options.progress || loadAyahProgress()
  const appState = options.appState || createHifzAppState()
  const todaySession = Array.isArray(options.todaySession) ? options.todaySession : generateTodaySession()
  const progressEntries = getProgressEntries(progress)
  const scope = resolvePlanScope(plan)
  const scopeEntries = scope
    ? progressEntries.filter(entry => entry.surah === scope.surah && entry.ayah >= scope.startAyah && entry.ayah <= scope.endAyah)
    : progressEntries
  const dueToday = todaySession.filter(item => item.type === 'due' || item.type === 'revision')
  const newToday = todaySession.filter(item => item.type === 'new')
  const firstItem = todaySession[0] || null
  const lastItem = todaySession[todaySession.length - 1] || firstItem
  const confidenceAverage = scopeEntries.length
    ? scopeEntries.reduce((sum, entry) => sum + Number(entry.progress?.masteryScore || 0), 0) / scopeEntries.length
    : 0
  const memoryConfidence = confidenceAverage >= 0.8 ? 'High' : confidenceAverage >= 0.45 ? 'Medium' : 'Low'
  const nextReviewDate = dueToday[0]?.progress?.nextReview || scopeEntries
    .map(entry => entry.progress?.nextReview || '')
    .filter(Boolean)
    .sort()[0] || ''

  let nextAction = 'Today: Memorise your next ayahs'
  let why = 'We will guide today’s memorisation one ayah at a time.'
  if (dueToday.length) {
    nextAction = `Next: Revise ${dueToday.length} ayah${dueToday.length === 1 ? '' : 's'}`
    why = 'Because these ayahs are scheduled for review today.'
  } else if (newToday.length) {
    nextAction = `Today: Memorise ${newToday.length} ayah${newToday.length === 1 ? '' : 's'}`
    why = 'Because this is your daily Hifz goal.'
  }

  return {
    mode: 'planner',
    sessionActive: !!appState.sessionActive,
    activePlanId: plan.id || null,
    todaySession,
    plannerReady: !!todaySession.length && !!firstItem,
    sessionRange: firstItem
      ? {
          chapterId: firstItem.surah,
          rangeStart: firstItem.ayah,
          rangeEnd: lastItem?.ayah || firstItem.ayah
        }
      : null,
    todayGoalLabel: newToday.length
      ? `${newToday.length} new ayah${newToday.length === 1 ? '' : 's'}`
      : `${Math.max(1, dueToday.length)} ayah${Math.max(1, dueToday.length) === 1 ? '' : 's'} to review`,
    dueCount: dueToday.length,
    newCount: newToday.length,
    completedAyahs: scopeEntries.length,
    memoryConfidence,
    nextAction,
    why,
    nextReviewLabel: nextReviewDate ? formatDateToken(new Date(nextReviewDate)) : 'Tomorrow',
    retentionLabel: dueToday.length
      ? `${dueToday.length} ayah${dueToday.length === 1 ? '' : 's'} scheduled for revision today`
      : 'Retention system active'
  }
}

export {
  HIFZ_PLAN_STORAGE_KEY,
  AYAH_PROGRESS_STORAGE_KEY,
  LEGACY_AYAH_PROGRESS_STORAGE_KEY,
  HIFZ_PLAN_ARCHIVE_STORAGE_KEY,
  HIFZ_APP_STATE_STORAGE_KEY,
  QURAN_TOTALS,
  SURAH_AYAH_COUNTS,
  SURAH_NAMES,
  normalizeDailyNewAyahCount,
  getProgressEntries,
  getPlanAyahTotal,
  calculatePlanForecast,
  formatDuration,
  formatDateToken,
  resolvePlanScope
}

export default {
  generateTodaySession,
  loadHifzPlan,
  loadAyahProgress,
  HIFZ_PLAN_STORAGE_KEY,
  AYAH_PROGRESS_STORAGE_KEY,
  LEGACY_AYAH_PROGRESS_STORAGE_KEY,
  HIFZ_PLAN_ARCHIVE_STORAGE_KEY,
  HIFZ_APP_STATE_STORAGE_KEY,
  QURAN_TOTALS,
  calculatePlanForecast,
  buildHifzPlannerSessionState
}
