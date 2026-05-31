import { computed, reactive, toRaw, toRefs, watch } from 'vue'

export const MUTQIN_STATE_KEY = 'mutqin_state'
const MUTQIN_DEFAULT_OWNER = 'guest'
let lastSavedSnapshot = ''
const activeWatchers = new WeakMap()

function ownerKey(owner = MUTQIN_DEFAULT_OWNER) {
  return owner ? String(owner) : MUTQIN_DEFAULT_OWNER
}

function stateStorageKey(owner = MUTQIN_DEFAULT_OWNER) {
  return `${MUTQIN_STATE_KEY}:${ownerKey(owner)}`
}

function backupStorageKey(owner = MUTQIN_DEFAULT_OWNER) {
  return `${stateStorageKey(owner)}:backup`
}

function localDateKey(date = new Date()) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10)
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return localDateKey()
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function queueRecordKey(item = {}) {
  return `${item.phase}:${item.ayahId || item.verse?.key || ''}:${item.repeatCount || ''}`
}

function normaliseQueueRecord(item = {}) {
  const verse = item.verse || null
  const phase = item.phase === 'Review' ? 'Retention' : (item.phase || 'Takrar')
  return {
    ...item,
    phase,
    ayahId: item.ayahId || verse?.key || null,
    verse,
    repeatCount: Math.max(1, Number(item.repeatCount || 1)),
    totalRepeats: Math.max(1, Number(item.totalRepeats || 1)),
    prompt: item.prompt || ''
  }
}

function normaliseSessionQueueRecords(queue = []) {
  const seen = new Set()
  return (Array.isArray(queue) ? queue : [])
    .filter(item => item && (item.ayahId || item.verse?.key))
    .map(normaliseQueueRecord)
    .filter(item => {
      const key = queueRecordKey(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function normaliseChainRecord(chain = {}) {
  return {
    ...chain,
    chain_strength: Math.max(0, Math.min(100, Number(chain.chain_strength || 0))),
    chain_errors: Math.max(0, Number(chain.chain_errors || 0)),
    attempts: Math.max(0, Number(chain.attempts || 0))
  }
}

const defaultState = () => ({
  version: 1,
  ayahs: {},
  chains: {},
  sessionState: {
    active: false,
    mode: 'beginner',
    phase: 'Takrar',
    queue: [],
    current_index: 0,
    config: null,
    planner: null,
    started_at: null,
    updated_at: null
  },
  stats: {
    sessions_completed: 0,
    last_completed_at: null,
    ayahs_memorised: 0,
    repetitions: 0,
    overdue_reviews: 0,
    streak: 0,
    average_session_time: 0,
    zone_distribution: {
      Fresh: 0,
      Stable: 0,
      Strong: 0
    }
  }
})

function clone(value) {
  const raw = toRaw(value)
  if (typeof structuredClone === 'function') {
    try { return structuredClone(raw) } catch {}
  }
  return JSON.parse(JSON.stringify(raw))
}

function mergeState(saved) {
  const base = defaultState()
  const mergedAyahs = { ...base.ayahs }
  Object.entries(saved?.ayahs || {}).forEach(([id, ayah]) => {
    mergedAyahs[id] = normaliseAyahRecord({ id, ...(ayah || {}) })
  })
  const mergedChains = { ...base.chains }
  Object.entries(saved?.chains || {}).forEach(([id, chain]) => {
    mergedChains[id] = normaliseChainRecord(chain || {})
  })
  const sessionState = {
    ...base.sessionState,
    ...(saved?.sessionState || {})
  }
  sessionState.queue = normaliseSessionQueueRecords(sessionState.queue)
  sessionState.current_index = Math.max(0, Math.min(Number(sessionState.current_index || 0), Math.max(sessionState.queue.length - 1, 0)))
  sessionState.phase = sessionState.queue[sessionState.current_index]?.phase || sessionState.phase || 'Takrar'

  return {
    ...base,
    ...(saved || {}),
    version: 1,
    ayahs: mergedAyahs,
    chains: mergedChains,
    sessionState,
    stats: {
      ...base.stats,
      ...(saved?.stats || {}),
      zone_distribution: {
        ...base.stats.zone_distribution,
        ...(saved?.stats?.zone_distribution || {})
      }
    },
    migrated_from: saved?.version && saved.version !== 1 ? saved.version : saved?.migrated_from || null
  }
}

export function loadMutqinState(owner = MUTQIN_DEFAULT_OWNER) {
  try {
    const primaryKey = stateStorageKey(owner)
    const raw = ownerKey(owner) === MUTQIN_DEFAULT_OWNER
      ? (localStorage.getItem(MUTQIN_STATE_KEY) ?? localStorage.getItem(primaryKey))
      : (localStorage.getItem(primaryKey) ?? localStorage.getItem(MUTQIN_STATE_KEY))
    const merged = mergeState(raw ? JSON.parse(raw) : null)
    lastSavedSnapshot = JSON.stringify(clone(merged))
    return reactive(merged)
  } catch {
    try {
      const backup = ownerKey(owner) === MUTQIN_DEFAULT_OWNER
        ? (localStorage.getItem(`${MUTQIN_STATE_KEY}:backup`) ?? localStorage.getItem(backupStorageKey(owner)))
        : (localStorage.getItem(backupStorageKey(owner)) ?? localStorage.getItem(`${MUTQIN_STATE_KEY}:backup`))
      const merged = mergeState(backup ? JSON.parse(backup) : null)
      lastSavedSnapshot = JSON.stringify(clone(merged))
      return reactive(merged)
    } catch {
      const fresh = defaultState()
      lastSavedSnapshot = JSON.stringify(fresh)
      return reactive(fresh)
    }
  }
}

export function useMutqinPersistence() {
  const globalState = loadMutqinState()
  return {
    ...toRefs(globalState),
    globalState: computed(() => globalState),
    sessionState: computed(() => globalState.sessionState)
  }
}

export function watchMutqinState(state, owner = MUTQIN_DEFAULT_OWNER, onSaved = null) {
  if (activeWatchers.has(state)) return activeWatchers.get(state)
  const stop = watch(
    state,
    () => {
      const changed = saveMutqinState(state, owner)
      if (changed && typeof onSaved === 'function') onSaved()
    },
    { deep: true, flush: 'post' }
  )
  const guardedStop = () => {
    activeWatchers.delete(state)
    stop()
  }
  activeWatchers.set(state, guardedStop)
  return guardedStop
}

export function saveMutqinState(state, owner = MUTQIN_DEFAULT_OWNER) {
  try {
    const snapshot = JSON.stringify(clone(state))
    if (snapshot === lastSavedSnapshot) return false
    const primaryKey = stateStorageKey(owner)
    const previous = localStorage.getItem(primaryKey)
    if (previous) localStorage.setItem(backupStorageKey(owner), previous)
    localStorage.setItem(primaryKey, snapshot)
    if (ownerKey(owner) === MUTQIN_DEFAULT_OWNER) {
      const legacyPrevious = localStorage.getItem(MUTQIN_STATE_KEY)
      if (legacyPrevious) localStorage.setItem(`${MUTQIN_STATE_KEY}:backup`, legacyPrevious)
      localStorage.setItem(MUTQIN_STATE_KEY, snapshot)
    }
    lastSavedSnapshot = snapshot
    return true
  } catch (error) {
    console.error('Failed to save mutqin_state', error)
    return false
  }
}

export function mutateMutqinState(state, mutator) {
  const result = mutator(state)
  state.sessionState.updated_at = new Date().toISOString()
  recomputeMutqinStats(state)
  return result
}

export function replaceMutqinState(targetState, nextState) {
  const merged = mergeState(nextState)
  Object.keys(targetState).forEach(key => {
    if (!(key in merged)) delete targetState[key]
  })
  Object.entries(merged).forEach(([key, value]) => {
    targetState[key] = value
  })
  lastSavedSnapshot = JSON.stringify(clone(targetState))
  return targetState
}

export function recomputeMutqinStats(state, today = localDateKey()) {
  const ayahs = Object.values(state.ayahs || {})
  const completed = Number(state.stats?.sessions_completed || 0)
  const totalSeconds = Number(state.stats?.total_session_seconds || 0)
  const zoneDistribution = { Fresh: 0, Stable: 0, Strong: 0 }
  ayahs.forEach(ayah => {
    if (zoneDistribution[ayah.zone] !== undefined) zoneDistribution[ayah.zone] += 1
  })

  state.stats = {
    ...state.stats,
    ayahs_memorised: ayahs.filter(ayah => ayah.status === 'mastered' || Number(ayah.mastery_level || 0) >= 5).length,
    repetitions: ayahs.reduce((sum, ayah) => sum + Number(ayah.repetition_count || 0), 0),
    chains_completed: 0,
    weak_transitions: 0,
    overdue_reviews: ayahs.filter(ayah => ayah.next_review && ayah.next_review <= today).length,
    average_session_time: completed ? Math.round(totalSeconds / completed / 60) : 0,
    zone_distribution: zoneDistribution
  }
  return state.stats
}

export function createAyahRecord(verse = {}) {
  const now = localDateKey()
  return normaliseAyahRecord({
    id: verse.key || verse.id || '',
    text: verse.arabic || verse.text || '',
    mastery_level: 1,
    repetition_count: 0,
    zone: 'Fresh',
    zone_step: 0,
    weak_count: 0,
    last_review: null,
    next_review: now,
    status: 'new'
  })
}

export function normaliseAyahRecord(ayah = {}) {
  const now = localDateKey()
  const zone = ['Fresh', 'Stable', 'Strong'].includes(ayah.zone) ? ayah.zone : 'Fresh'
  const status = ['new', 'learning', 'hidden_practice', 'reviewed', 'weak', 'mastered'].includes(ayah.status) ? ayah.status : 'new'
  return {
    id: ayah.id || '',
    text: ayah.text || '',
    mastery_level: Math.max(1, Math.min(5, Number(ayah.mastery_level || 1))),
    repetition_count: Math.max(0, Number(ayah.repetition_count || 0)),
    zone,
    zone_step: Math.max(0, Math.min(2, Number(ayah.zone_step || 0))),
    weak_count: Math.max(0, Number(ayah.weak_count || 0)),
    last_review: ayah.last_review || null,
    next_review: ayah.next_review ? localDateKey(ayah.next_review) : now,
    status
  }
}
