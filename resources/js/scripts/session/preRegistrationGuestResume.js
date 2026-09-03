import {
  ACTIVE_SESSION_SNAPSHOT_KEY,
  CENTRAL_SESSION_STORAGE_KEY,
  MODE_STORAGE_KEYS,
  SESSION_STORAGE_KEYS,
  STORAGE,
  activeSessionSnapshotKey,
} from '../../utils/mutqinStorageKeys.js'
import { userScopedStorageKey } from './sessionLifecycle.js'

const MUTQIN_STATE_KEY = 'mutqin_state'
const GUEST_OWNER = 'guest'

function deepClone(value) {
  if (value == null) return value
  return JSON.parse(JSON.stringify(value))
}

function readJsonFromStore(store, key, fallback = null) {
  if (!store || !key) return fallback
  try {
    const raw = store.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // try legacy telawa key
  }
  try {
    const legacyKey = key.startsWith('mutqin.')
      ? key.replace(/^mutqin\./, 'telawa.')
      : null
    if (legacyKey) {
      const raw = store.getItem(legacyKey)
      if (raw) return JSON.parse(raw)
    }
  } catch {
    // ignore
  }
  return fallback
}

function readGuestLocalJson(store, baseKey) {
  const candidates = [
    userScopedStorageKey(baseKey, GUEST_OWNER),
    `${baseKey}.u.${GUEST_OWNER}`,
    `${baseKey}.${GUEST_OWNER}`,
    baseKey,
  ]
  for (const key of candidates) {
    const value = readJsonFromStore(store, key, null)
    if (value != null) return value
  }
  return null
}

function readGuestMutqinStateRaw(store) {
  if (!store) return null
  const keys = [`${MUTQIN_STATE_KEY}:${GUEST_OWNER}`, MUTQIN_STATE_KEY]
  for (const key of keys) {
    const parsed = readJsonFromStore(store, key, null)
    if (parsed) return parsed
  }
  return null
}

function readGuestActiveSnapshot(store = typeof window !== 'undefined' ? window.sessionStorage : null) {
  if (!store) return null
  const keys = [
    activeSessionSnapshotKey(GUEST_OWNER),
    ACTIVE_SESSION_SNAPSHOT_KEY,
  ]
  for (const key of keys) {
    try {
      const raw = store.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
      // try next key
    }
  }
  return null
}

function hasModeProgress(modeStates = {}) {
  return Object.values(modeStates).some((state) => Number(state?.chapterId || 0) > 0)
}

/**
 * Capture anonymous/guest progress from shared browser storage before a brand-new
 * account workspace is isolated. Guest keys stay on disk; this snapshot is the
 * only copy offered for one-time import after registration.
 *
 * @param {{ localStorage?: Storage|null, sessionStorage?: Storage|null }} [stores]
 */
export function capturePreRegistrationGuestResumeSnapshot(stores = {}) {
  const local = stores.localStorage
    ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  const session = stores.sessionStorage
    ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)

  const mutqinState = readGuestMutqinStateRaw(local)
  const continueSession = readGuestLocalJson(local, STORAGE.continueSession)
  const centralSession = readGuestLocalJson(local, CENTRAL_SESSION_STORAGE_KEY)
  const activeSnapshot = readGuestActiveSnapshot(session)
  const modeStates = Object.fromEntries(
    Object.entries(MODE_STORAGE_KEYS).map(([mode, key]) => [mode, readGuestLocalJson(local, key)]),
  )
  const sessionStates = Object.fromEntries(
    Object.entries(SESSION_STORAGE_KEYS).map(([mode, key]) => [mode, readGuestLocalJson(local, key)]),
  )

  const snapshot = {
    mutqinState: mutqinState ? deepClone(mutqinState) : null,
    mutqinSession: mutqinState?.sessionState ? deepClone(mutqinState.sessionState) : null,
    continueSession: continueSession ? deepClone(continueSession) : null,
    centralSession: centralSession ? deepClone(centralSession) : null,
    activeSnapshot: activeSnapshot ? deepClone(activeSnapshot) : null,
    modeStates: deepClone(modeStates),
    sessionStates: deepClone(sessionStates),
    timestamp: Date.now(),
  }

  return hasPreRegistrationGuestResumeEvidence(snapshot) ? snapshot : null
}

export function hasPreRegistrationGuestResumeEvidence(snapshot) {
  if (!snapshot) return false
  const mutqinSession = snapshot.mutqinSession
  const centralSession = snapshot.centralSession
  const continueSession = snapshot.continueSession
  const activeSnapshot = snapshot.activeSnapshot
  return !!mutqinSession?.active
    || centralSession?.sessionStatus === 'active'
    || centralSession?.sessionStatus === 'paused'
    || !!continueSession?.config?.chapterId
    || !!activeSnapshot?.config?.chapterId
    || hasModeProgress(snapshot.modeStates)
    || hasModeProgress(snapshot.sessionStates)
}

export function pickPreRegistrationGuestContinuePayload(snapshot) {
  if (!snapshot) return null
  const candidates = [
    snapshot.continueSession,
    snapshot.activeSnapshot,
    buildContinuePayloadFromGuestModeStates(snapshot),
  ].filter((payload) => Number(payload?.config?.chapterId || 0) > 0)
  return candidates[0] || null
}

function buildContinuePayloadFromGuestModeStates(snapshot) {
  const modeOrder = ['advanced', 'beginner', 'planner']
  for (const mode of modeOrder) {
    const config = snapshot.modeStates?.[mode]
    if (!Number(config?.chapterId || 0)) continue
    const sessionState = snapshot.sessionStates?.[mode] || {}
    const rangeStart = Math.max(1, Number(config.rangeStart || 1))
    const rangeEnd = Math.max(rangeStart, Number(config.rangeEnd || rangeStart))
    const queueIndex = Math.max(0, Number(sessionState.queueIndex ?? config.queueIndex ?? 0))
    const fallbackAyah = Math.min(rangeEnd, rangeStart + queueIndex)
    const activeVerseKey = sessionState.activeVerseKey
      || sessionState.activeKey
      || config.activeKey
      || `${config.chapterId}:${fallbackAyah}`
    return {
      timestamp: Number(snapshot.timestamp || Date.now()),
      mode,
      tab: 'tools',
      activeKey: activeVerseKey,
      activeVerseKey,
      queueIndex,
      config: {
        ...config,
        chapterId: Number(config.chapterId),
        rangeStart,
        rangeEnd,
      },
      fromPreRegistrationGuest: true,
    }
  }
  return null
}
