import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const recovery = await import(pathToFileURL(join(root, 'resources/js/utils/chunkLoadRecovery.js')).href)

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
  assert.equal(recovery.isChunkLoadError({ message: 'Network Error' }), false)
  assert.equal(recovery.isChunkLoadError(null), false)
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
  assert.equal(store.getItem(recovery.CHUNK_RELOAD_SESSION_KEY), '1')

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
  const store = memoryStore({ [recovery.CHUNK_RELOAD_SESSION_KEY]: '1' })
  recovery.clearChunkReloadFlag(store)
  assert.equal(store.getItem(recovery.CHUNK_RELOAD_SESSION_KEY), null)
})

test('buildFreshReloadUrl strips legacy force params', () => {
  const url = recovery.buildFreshReloadUrl('https://app.mutqin.ai/memorisation?mutqin_force=1&_=9&keep=1')
  assert.match(url, /keep=1/)
  assert.match(url, /mutqin_chunk_reload=1/)
  assert.doesNotMatch(url, /mutqin_force=/)
  assert.doesNotMatch(url, /_=9/)
})
