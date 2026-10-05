import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import test from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Staging-style two-generation Mix deploy:
 * Version A HTML still requests dashboard.<oldhash>.js after Version B
 * replaced it with dashboard.<newhash>.js.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const recovery = await import(pathToFileURL(join(root, 'resources/js/utils/chunkLoadRecovery.js')).href)

function memoryStore() {
  const data = {}
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
  }
}

function mixChunkError(name, url, type = 'error') {
  return {
    name: 'ChunkLoadError',
    type,
    request: url,
    message: `Loading chunk ${name} failed.\n(${type}: ${url})`,
  }
}

async function withStagingAssets(run) {
  const versionA = '/js/dashboard.aaa11111.js'
  const versionB = '/js/dashboard.bbb22222.js'
  const files = new Map([
    [versionB, '/* Version B dashboard chunk */'],
    ['/js/app.js', `/* requests ${versionB} */`],
    ['/memorisation', '<html>Version B shell</html>'],
    ['/dashboard', '<html>Version B dashboard</html>'],
  ])

  const server = http.createServer((req, res) => {
    const path = req.url.split('?')[0]
    if (files.has(path)) {
      res.writeHead(200, { 'Content-Type': path.endsWith('.js') ? 'text/javascript' : 'text/html' })
      res.end(files.get(path))
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  const origin = `http://127.0.0.1:${port}`
  try {
    await run({ origin, versionA, versionB })
  } finally {
    server.close()
    await once(server, 'close')
  }
}

test('stale Version A tab hits 404 on old hashed chunk then recovers once to Version B', async () => {
  await withStagingAssets(async ({ origin, versionA, versionB }) => {
    const missing = await fetch(`${origin}${versionA}`)
    assert.equal(missing.status, 404, 'old hashed chunk must be gone after Version B deploy')

    const current = await fetch(`${origin}${versionB}`)
    assert.equal(current.status, 200)

    const shell = await fetch(`${origin}/memorisation`)
    assert.equal(shell.status, 200)
    assert.match(await shell.text(), /Version B/)

    const store = memoryStore()
    const reloads = []
    const error = mixChunkError('dashboard', `${origin}${versionA}`)

    const first = recovery.recoverFromStaleChunk(error, {
      store,
      offline: false,
      locationHref: `${origin}/dashboard`,
      clearCaches: async () => {},
      showNotice: () => {},
      persist: () => {},
      reload: (url) => { reloads.push(url) },
    })
    assert.equal(first, 'reloading')
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(reloads.length, 1)
    assert.match(reloads[0], /\/dashboard/)
    assert.match(reloads[0], /mutqin_chunk_reload=1/)

    const afterReload = await fetch(reloads[0].replace(/mutqin_chunk_reload=1/, ''))
    assert.equal(afterReload.status, 200)

    const second = recovery.recoverFromStaleChunk(error, {
      store,
      offline: false,
      clearCaches: async () => {},
      showNotice: () => {},
      reload: (url) => { reloads.push(url) },
    })
    assert.equal(second, 'give_up')
    assert.equal(reloads.length, 1)
  })
})

test('stale Mushaf/memorisation/homepage chunk URLs are Mix assets', () => {
  for (const path of [
    '/js/memorisation.11111111.js',
    '/js/madani-page.22222222.js',
    '/js/homepage.33333333.js',
    '/js/user-dashboard-audio-1.44444444.js',
    '/js/hifz-plan-modal.55555555.js',
    '/js/251.6212f075.js',
  ]) {
    assert.equal(recovery.isStaleMixAssetUrl(`https://staging.example${path}`), true)
  }
})
