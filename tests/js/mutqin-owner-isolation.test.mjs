import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const moduleCache = new Map()
const localStore = new Map()

const context = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  localStorage: {
    getItem: key => (localStore.has(key) ? localStore.get(key) : null),
    setItem: (key, value) => localStore.set(key, String(value)),
    removeItem: key => localStore.delete(key),
  },
  structuredClone: value => JSON.parse(JSON.stringify(value)),
})

async function loadModule(specifier, referrer = path.join(root, 'tests/js/mutqin-owner-isolation.test.mjs')) {
  if (specifier === 'vue') {
    if (!moduleCache.has('vue')) {
      const vueModule = new vm.SourceTextModule(`
        export function reactive(value) { return value }
        export function toRaw(value) { return value }
        export function computed(getter) { return { get value() { return getter() } } }
        export function toRefs(value) {
          return Object.fromEntries(Object.keys(value).map(key => [key, { get value() { return value[key] }, set value(next) { value[key] = next } }]))
        }
        export function watch() { return function unwatch() {} }
      `, { context, identifier: 'vue' })
      await vueModule.link(() => {})
      await vueModule.evaluate()
      moduleCache.set('vue', vueModule)
    }
    return moduleCache.get('vue')
  }

  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const persistence = await loadModule('resources/js/scripts/composables/useMutqinPersistence.js')
const {
  MUTQIN_STATE_KEY,
  loadMutqinState,
  saveMutqinState,
  replaceMutqinState,
} = persistence.namespace

const guestPayload = {
  version: 1,
  ayahs: { '1:1': { id: '1:1', status: 'mastered', mastery_level: 5, repetition_count: 9 } },
  chains: {},
  sessionState: { active: true, mode: 'advanced', phase: 'Takrar', queue: [], current_index: 0 },
  stats: { sessions_completed: 4, ayahs_memorised: 1, repetitions: 9 },
  workspaceState: { onboardingCompleted: true, continueSession: { config: { chapterId: 2 } } },
}

localStore.set(MUTQIN_STATE_KEY, JSON.stringify(guestPayload))
localStore.set('mutqin_state:42', JSON.stringify({
  ...guestPayload,
  ayahs: { '2:1': { id: '2:1', status: 'learning', mastery_level: 2, repetition_count: 1 } },
  stats: { sessions_completed: 1, ayahs_memorised: 0, repetitions: 1 },
}))

const guest = loadMutqinState('guest')
assert.equal(guest.stats.sessions_completed, 4)
assert.ok(guest.ayahs['1:1'])

const otherUser = loadMutqinState('42')
assert.equal(otherUser.stats.sessions_completed, 1)
assert.ok(otherUser.ayahs['2:1'])
assert.equal(otherUser.ayahs['1:1'], undefined)

// New registration must not inherit guest/shared progress by default.
const newUser = loadMutqinState('99')
assert.deepEqual(Object.keys(newUser.ayahs), [])
assert.equal(newUser.stats.sessions_completed || 0, 0)
assert.equal(newUser.sessionState?.active, false)

// Authenticated owners must NEVER silently adopt guest cache after flash expires.
const noFallback = loadMutqinState('99', { allowGuestFallback: false })
assert.deepEqual(Object.keys(noFallback.ayahs), [])

// Explicit legacy adopt remains available only when callers opt in.
const adopted = loadMutqinState('99', { allowGuestFallback: true })
assert.equal(adopted.stats.sessions_completed, 4)

// Saving a fresh signup must write only that owner's key.
const signupState = loadMutqinState('77')
replaceMutqinState(signupState, {})
signupState.stats.sessions_completed = 0
signupState.workspaceState = { deviceId: 'signup-only' }
saveMutqinState(signupState, '77')
assert.ok(localStore.get('mutqin_state:77'))
assert.equal(JSON.parse(localStore.get('mutqin_state:77')).workspaceState.deviceId, 'signup-only')
assert.equal(JSON.parse(localStore.get(MUTQIN_STATE_KEY)).stats.sessions_completed, 4, 'guest cache must stay intact')
assert.equal(JSON.parse(localStore.get('mutqin_state:42')).stats.sessions_completed, 1, 'other user cache must stay intact')

const memorisationSource = (await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8'))
assert.match(memorisationSource, /ensureSignupIsolation/, 'signup isolation must be durable beyond the flash')
assert.match(memorisationSource, /isSignupIsolationActive/, 'isolation gate must be reusable')
assert.match(memorisationSource, /resetIsolatedSignupWorkspace/, 'isolated signup must clear only this user workspace')
assert.match(memorisationSource, /allowGuestFallback:\s*false/, 'auth bind must never inherit guest cache')
assert.match(memorisationSource, /authenticatedWorkspace && !signupIsolated/, 'shared telawa hydrate must skip isolated signups')
assert.match(memorisationSource, /if \(this\.isSignupIsolationActive\(\)\) return/, 'push/migration must refuse isolated signups')
assert.match(memorisationSource, /mutqin\.signupIsolated\./, 'durable per-user isolation flag required')
assert.match(memorisationSource, /activeSessionSnapshotStorageKey/, 'resume snapshots must be user-scoped')
assert.doesNotMatch(
  memorisationSource,
  /allowGuestFallback:\s*true/,
  'authenticated bootstrap must not re-enable guest fallback'
)

console.log('mutqin-owner-isolation passed')
