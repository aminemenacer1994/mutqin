import assert from 'node:assert/strict'
import {
  ACTIVE_SESSION_SNAPSHOT_KEY,
  migrateTelawaLocalStorageKeys,
  mutqinStorageKey,
  readLocalJson,
  userScopedMutqinKey,
  writeLocalJson,
  activeSessionSnapshotKey,
} from '../../resources/js/utils/mutqinStorageKeys.js'

assert.equal(mutqinStorageKey('telawa.uiState'), 'mutqin.uiState')
assert.equal(mutqinStorageKey('mutqin.uiState'), 'mutqin.uiState')
assert.equal(userScopedMutqinKey('bookmarks', 42), 'mutqin.bookmarks.42')
assert.equal(activeSessionSnapshotKey(7), `${ACTIVE_SESSION_SNAPSHOT_KEY}.7`)

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

console.log('mutqin-storage-keys tests passed')
