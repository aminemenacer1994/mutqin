import assert from 'node:assert/strict'
import {
  ACTIVE_SESSION_SNAPSHOT_KEY,
  clearSharedMutqinBrowserResidue,
  migrateTelawaLocalStorageKeys,
  mutqinStorageKey,
  offlineScopedLocalKey,
  readLocalJson,
  userScopedMutqinKey,
  writeLocalJson,
  activeSessionSnapshotKey,
} from '../../resources/js/utils/mutqinStorageKeys.js'
import {
  clearStashedDashboardEntryIntent,
  dashboardEntryIntentStorageKey,
  readStashedDashboardEntryIntent,
  stashDashboardEntryIntent,
  userScopedStorageKey,
} from '../../resources/js/scripts/session/sessionLifecycle.js'

assert.equal(mutqinStorageKey('telawa.uiState'), 'mutqin.uiState')
assert.equal(mutqinStorageKey('mutqin.uiState'), 'mutqin.uiState')
assert.equal(userScopedMutqinKey('bookmarks', 42), 'mutqin.bookmarks.42')
assert.equal(activeSessionSnapshotKey(7), `${ACTIVE_SESSION_SNAPSHOT_KEY}.7`)
assert.equal(offlineScopedLocalKey('mutqin.uiState', 9), 'mutqin.uiState.9')
assert.equal(offlineScopedLocalKey('mutqin.uiState.9', 9), 'mutqin.uiState.9')
assert.equal(
  dashboardEntryIntentStorageKey(11),
  userScopedStorageKey('mutqin.dashboardEntryIntent.v1', 11),
)

const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  key: (index) => Array.from(store.keys())[index] ?? null,
  get length() { return store.size },
}

store.set('telawa.uiState', JSON.stringify({ blur: true }))
store.set('telawa.schemaVersion', '2')

const result = migrateTelawaLocalStorageKeys()
assert.ok(result.migrated >= 2)
assert.equal(store.has('telawa.uiState'), false)
assert.equal(JSON.parse(store.get('mutqin.uiState')).blur, true)
assert.equal(store.get('mutqin.schemaVersion'), '2')

writeLocalJson('mutqin.continueSession', { id: 'sess-1' })
assert.equal(readLocalJson('mutqin.continueSession', null)?.id, 'sess-1')

// Isolation: clearing shared residue must not wipe other users' scoped caches.
store.set('mutqin_state:42', JSON.stringify({ stats: { sessions_completed: 3 } }))
store.set('mutqin_state:77', JSON.stringify({ stats: { sessions_completed: 1 } }))
store.set('mutqin.continueSession.u.42', JSON.stringify({ config: { chapterId: 112 } }))
store.set('mutqin.uiState', JSON.stringify({ theme: 'A' }))
store.set('mutqin_hifz_plan', JSON.stringify({ goal: 'A' }))
store.set('mutqin_sessions', JSON.stringify([{ id: 'a' }]))

const sessionStore = new Map()
sessionStore.set('mutqin.dashboardEntryIntent.v1', JSON.stringify({ resume: true }))
sessionStore.set(dashboardEntryIntentStorageKey(42), JSON.stringify({ resume: true, surah: 112 }))

const cleared = clearSharedMutqinBrowserResidue({
  localStorage: globalThis.localStorage,
  sessionStorage: {
    getItem: (key) => (sessionStore.has(key) ? sessionStore.get(key) : null),
    setItem: (key, value) => sessionStore.set(key, String(value)),
    removeItem: (key) => sessionStore.delete(key),
  },
})
assert.ok(cleared.localRemoved >= 3)
assert.equal(store.has('mutqin.uiState'), false)
assert.equal(store.has('mutqin_hifz_plan'), false)
assert.equal(store.has('mutqin_sessions'), false)
assert.equal(JSON.parse(store.get('mutqin_state:42')).stats.sessions_completed, 3)
assert.equal(JSON.parse(store.get('mutqin_state:77')).stats.sessions_completed, 1)
assert.equal(JSON.parse(store.get('mutqin.continueSession.u.42')).config.chapterId, 112)
assert.equal(sessionStore.has('mutqin.dashboardEntryIntent.v1'), false)
assert.ok(sessionStore.has(dashboardEntryIntentStorageKey(42)), 'scoped intent must survive shared residue clear')

const intentStore = new Map()
const intentStorage = {
  getItem: (key) => (intentStore.has(key) ? intentStore.get(key) : null),
  setItem: (key, value) => intentStore.set(key, String(value)),
  removeItem: (key) => intentStore.delete(key),
}
assert.equal(stashDashboardEntryIntent({ resume: true, surah: 108 }, intentStorage, 5), true)
assert.deepEqual(readStashedDashboardEntryIntent(intentStorage, 5), { resume: true, surah: 108 })
assert.equal(readStashedDashboardEntryIntent(intentStorage, 9), null, 'other user must not see intent')
assert.equal(intentStore.has('mutqin.dashboardEntryIntent.v1'), false)
clearStashedDashboardEntryIntent(intentStorage, 5)
assert.equal(readStashedDashboardEntryIntent(intentStorage, 5), null)

console.log('mutqin-storage-keys tests passed')
