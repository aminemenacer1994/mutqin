import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const recovery = await import(pathToFileURL(join(root, 'resources/js/utils/chunkLoadRecovery.js')).href)
const appSource = readFileSync(join(root, 'resources/js/app.js'), 'utf8')

function memoryStore(initial = {}) {
  const data = { ...initial }
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      data[key] = String(value)
    },
    removeItem(key) {
      delete data[key]
    },
    _data: data,
  }
}

test('isChunkLoadError detects webpack and dynamic import failures', () => {
  assert.equal(recovery.isChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 12 failed' }), true)
  assert.equal(
    recovery.isChunkLoadError({ message: 'Failed to fetch dynamically imported module: https://x/a.js' }),
    true
  )
  assert.equal(
    recovery.isChunkLoadError({
      name: 'ChunkLoadError',
      type: 'error',
      request: 'https://app.mutqin.ai/js/dashboard.20283d40.js',
      message: 'Loading chunk dashboard failed.\n(error: https://app.mutqin.ai/js/dashboard.20283d40.js)',
    }),
    true
  )
  assert.equal(recovery.isChunkLoadError({ message: 'Network Error' }), false)
  assert.equal(recovery.isChunkLoadError({ message: 'Failed to fetch' }), false)
  assert.equal(recovery.isChunkLoadError({ message: 'Speechmatics connection failed' }), false)
  assert.equal(recovery.isChunkLoadError(null), false)
})

test('isLikelyStaleDeploymentError ignores offline, timeouts, and API noise', () => {
  const mix404 = {
    name: 'ChunkLoadError',
    type: 'error',
    request: 'https://app.mutqin.ai/js/memorisation.aaaaaaaa.js',
    message: 'Loading chunk memorisation failed.\n(error: https://app.mutqin.ai/js/memorisation.aaaaaaaa.js)',
  }
  assert.equal(recovery.isLikelyStaleDeploymentError(mix404, { offline: false }), true)
  assert.equal(recovery.isLikelyStaleDeploymentError(mix404, { offline: true }), false)
  assert.equal(
    recovery.isLikelyStaleDeploymentError({
      name: 'ChunkLoadError',
      type: 'timeout',
      message: 'Loading chunk homepage failed.\n(timeout: https://app.mutqin.ai/js/homepage.bbbbbbbb.js)',
    }, { offline: false }),
    false
  )
  assert.equal(
    recovery.isLikelyStaleDeploymentError({ message: 'Request failed with status code 500' }, { offline: false }),
    false
  )
  assert.equal(
    recovery.isStaleMixAssetUrl('https://app.mutqin.ai/js/homepage.20283d40.js'),
    true
  )
  assert.equal(
    recovery.isStaleMixAssetUrl('https://cdn.speechmatics.com/runtime.js'),
    false
  )
})

test('recoverFromStaleChunk reloads at most once then gives up', async () => {
  const store = memoryStore()
  const reloads = []
  const clears = []

  const first = recovery.recoverFromStaleChunk(
    { name: 'ChunkLoadError', message: 'Loading chunk memorisation failed' },
    {
      store,
      locationHref: 'https://app.mutqin.ai/memorisation?mutqin_force=old',
      clearCaches: async () => { clears.push(1) },
      showNotice: () => {},
      reload: (url) => { reloads.push(url) },
    }
  )
  assert.equal(first, 'reloading')
  assert.match(store.getItem(recovery.CHUNK_RELOAD_SESSION_KEY), /attemptedAt/)
  assert.equal(recovery.hasAttemptedChunkReload(store), true)

  // Allow the async clearCaches().finally(reload) microtask to run.
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(clears.length, 1)
  assert.equal(reloads.length, 1)
  assert.match(reloads[0], /mutqin_chunk_reload=1/)
  assert.doesNotMatch(reloads[0], /mutqin_force=/)

  const second = recovery.recoverFromStaleChunk(
    { name: 'ChunkLoadError', message: 'Loading chunk memorisation failed' },
    {
      store,
      clearCaches: async () => { clears.push(1) },
      showNotice: () => {},
      reload: (url) => { reloads.push(url) },
    }
  )
  assert.equal(second, 'give_up')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(reloads.length, 1, 'second failure must not reload again')
})

test('offline chunk failure does not auto-reload', async () => {
  const store = memoryStore()
  const reloads = []
  const outcome = recovery.recoverFromStaleChunk(
    {
      name: 'ChunkLoadError',
      message: 'Failed to fetch dynamically imported module: https://app.mutqin.ai/js/about.deadbeef.js',
    },
    {
      store,
      offline: true,
      clearCaches: async () => {},
      showNotice: () => {},
      reload: (url) => { reloads.push(url) },
    }
  )
  assert.equal(outcome, 'give_up')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(reloads.length, 0)
  assert.equal(store.getItem(recovery.CHUNK_RELOAD_SESSION_KEY), null)
})

test('before-chunk-reload persist hook runs and session keys are left intact', async () => {
  const store = memoryStore({
    'mutqin.activeSession.v1': JSON.stringify({ config: { chapterId: 1 }, current_index: 3 }),
  })
  const persisted = []
  const reloads = []

  const outcome = recovery.recoverFromStaleChunk(
    { name: 'ChunkLoadError', message: 'Loading chunk hifz-plan-modal failed' },
    {
      store,
      persist: () => {
        persisted.push(store.getItem('mutqin.activeSession.v1'))
      },
      locationHref: 'https://app.mutqin.ai/memorisation',
      clearCaches: async () => {},
      showNotice: () => {},
      reload: (url) => { reloads.push(url) },
    }
  )
  assert.equal(outcome, 'reloading')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(persisted.length, 1)
  assert.match(persisted[0], /chapterId/)
  assert.match(store.getItem('mutqin.activeSession.v1'), /chapterId/)
  assert.equal(reloads.length, 1)
})

test('wrapChunkImport does not retry-reload when offline', async () => {
  let attempts = 0
  const reloads = []
  await assert.rejects(
    () => recovery.wrapChunkImport(() => {
      attempts += 1
      return Promise.reject({ name: 'ChunkLoadError', message: 'Loading chunk 9 failed' })
    }, {
      maxRetries: 2,
      retryDelayMs: 1,
      offline: true,
      recover: (error) => recovery.recoverFromStaleChunk(error, {
        offline: true,
        store: memoryStore(),
        reload: (url) => { reloads.push(url) },
        clearCaches: async () => {},
        showNotice: () => {},
      }),
    }),
    (err) => err?.name === 'ChunkLoadError'
  )
  assert.equal(attempts, 1)
  assert.equal(reloads.length, 0)
})

test('wrapChunkImport retries then reloads once; second give-up throws', async () => {
  const store = memoryStore()
  let attempts = 0
  const reloads = []

  const failing = () => {
    attempts += 1
    return Promise.reject({ name: 'ChunkLoadError', message: 'Loading chunk 9 failed' })
  }

  const hung = recovery.wrapChunkImport(failing, {
    maxRetries: 1,
    retryDelayMs: 1,
    recover: (error) => recovery.recoverFromStaleChunk(error, {
      store,
      locationHref: '/dashboard',
      clearCaches: async () => {},
      showNotice: () => {},
      reload: (url) => { reloads.push(url) },
    }),
  })

  // First recovery hangs the loader promise while reload starts.
  let settled = false
  hung.then(() => { settled = true }).catch(() => { settled = true })
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(settled, false)
  assert.equal(attempts, 2)
  assert.equal(reloads.length, 1)

  // Simulate post-reload failure with flag already set.
  await assert.rejects(
    () => recovery.wrapChunkImport(failing, {
      maxRetries: 0,
      recover: (error) => recovery.recoverFromStaleChunk(error, {
        store,
        clearCaches: async () => {},
        showNotice: () => {},
        reload: (url) => { reloads.push(url) },
      }),
    }),
    (err) => err?.name === 'ChunkLoadError'
  )
  assert.equal(reloads.length, 1)
})

test('successful import clears nothing and clearChunkReloadFlag resets recovery', () => {
  const store = memoryStore({ [recovery.CHUNK_RELOAD_SESSION_KEY]: JSON.stringify({ attemptedAt: Date.now() }) })
  recovery.clearChunkReloadFlag(store)
  assert.equal(store.getItem(recovery.CHUNK_RELOAD_SESSION_KEY), null)
})

test('expired reload guard clears itself', () => {
  const store = memoryStore({
    [recovery.CHUNK_RELOAD_SESSION_KEY]: JSON.stringify({
      attemptedAt: Date.now() - recovery.CHUNK_RELOAD_TTL_MS - 1000,
    }),
  })
  assert.equal(recovery.hasAttemptedChunkReload(store), false)
  assert.equal(store.getItem(recovery.CHUNK_RELOAD_SESSION_KEY), null)
})

test('buildFreshReloadUrl strips legacy force params', () => {
  const url = recovery.buildFreshReloadUrl('https://app.mutqin.ai/memorisation?mutqin_force=1&_=9&keep=1')
  assert.match(url, /keep=1/)
  assert.match(url, /mutqin_chunk_reload=1/)
  assert.doesNotMatch(url, /mutqin_force=/)
  assert.doesNotMatch(url, /_=9/)
})

test('app mount does not clear chunk reload guard before async pages resolve', () => {
  assert.doesNotMatch(
    appSource,
    /mutqin:app-mounted['"][\s\S]{0,160}clearChunkReloadFlag\(\)/,
    'clearing the guard at shell mount can cause homepage chunk reload loops',
  )
})

test('stable lazy chunks are cache-busted beyond memorisation', () => {
  assert.match(appSource, /patchStableChunkBust/)
  assert.doesNotMatch(
    appSource,
    /memorisation\/i\.test\(url\)/,
    'chunk URL cache busting must cover homepage and other lazy pages too',
  )
})

test('existing recovery is wired for pages, bootstrap, locales, and workspace', () => {
  const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  const i18n = readFileSync(join(root, 'resources/js/i18n.js'), 'utf8')
  assert.match(appSource, /installChunkLoadRecovery/)
  assert.match(appSource, /recoverFromStaleChunk\(error/)
  assert.match(appSource, /errorComponent: PageLoadError/)
  assert.match(memorisation, /BEFORE_CHUNK_RELOAD_EVENT/)
  assert.match(memorisation, /errorComponent: PageLoadError/)
  assert.match(memorisation, /webpackChunkName: "ask-mutqin-index"/)
  assert.match(i18n, /wrapChunkImport\(loader/)
})
