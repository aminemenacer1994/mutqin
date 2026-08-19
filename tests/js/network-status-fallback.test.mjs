import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function installFakeWindow() {
  const listeners = new Map()
  const fakeWindow = {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn)
    },
    dispatchEvent(event) {
      const type = event?.type
      for (const fn of listeners.get(type) || []) fn(event)
      return true
    },
  }
  globalThis.window = fakeWindow
  if (typeof globalThis.Event !== 'function') {
    globalThis.Event = class Event {
      constructor(type) { this.type = type }
    }
  }
  if (!globalThis.navigator) globalThis.navigator = { onLine: true }
  return fakeWindow
}

const fakeWindow = installFakeWindow()
const networkStatus = await import(pathToFileURL(join(root, 'resources/js/utils/networkStatus.js')).href)

test('networkStatus helpers classify offline, network, and server failures', () => {
  assert.equal(networkStatus.isAbortError({ code: 'ERR_CANCELED' }), true)
  assert.equal(networkStatus.isNetworkError({ code: 'ERR_NETWORK', message: 'Network Error' }), true)
  assert.equal(networkStatus.isNetworkError({ response: { status: 500 } }), false)
  assert.equal(networkStatus.isServerError({ response: { status: 503 } }), true)
  assert.equal(networkStatus.isServerError({ response: { status: 404 } }), false)

  Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => false })
  assert.equal(networkStatus.classifyRequestFailure({ response: { status: 500 } }), 'offline')

  Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true })
  assert.equal(
    networkStatus.classifyRequestFailure({ code: 'ERR_NETWORK', message: 'Network Error' }),
    'offline'
  )
  assert.equal(networkStatus.classifyRequestFailure({ response: { status: 500 } }), 'failure')
  assert.equal(networkStatus.classifyRequestFailure({ response: { status: 422 } }), 'failure')

  const dirty = networkStatus.sanitizeUserFacingError(
    'SQLSTATE[HY000] Exception at app/Http/Controllers/Foo.php:12',
    'Something went wrong. Please try again.'
  )
  assert.equal(dirty, 'Something went wrong. Please try again.')
  assert.equal(
    networkStatus.sanitizeUserFacingError('Mic permission denied', 'fallback'),
    'Mic permission denied'
  )
})

test('onReconnect fires when online event arrives', () => {
  let calls = 0
  const cancel = networkStatus.onReconnect(() => { calls += 1 })
  fakeWindow.dispatchEvent(new Event('online'))
  assert.equal(calls, 1)
  fakeWindow.dispatchEvent(new Event('online'))
  assert.equal(calls, 1, 'reconnect handler is one-shot')
  cancel()
})

test('AppStatus and NetworkFallback expose offline/error UI with retry + home', () => {
  const status = read('resources/js/components/AppStatus.vue')
  const fallback = read('resources/js/components/NetworkFallback.vue')
  const banner = read('resources/js/components/NetworkStatusBanner.vue')
  const css = read('resources/js/styles/app-status.css')
  const en = JSON.parse(read('resources/js/locales/en.json'))

  assert.match(status, /offline:\s*'bi-wifi-off'/)
  assert.match(css, /\.app-status--offline/)
  assert.match(fallback, /name:\s*'NetworkFallback'/)
  assert.match(fallback, /autoRetryOnReconnect/)
  assert.match(fallback, /common\.status\.returnHome/)
  assert.match(fallback, /common\.status\.retry/)
  assert.match(banner, /name:\s*'NetworkStatusBanner'/)
  assert.match(banner, /subscribeNetworkStatus/)
  assert.match(banner, /common\.status\.offlineBanner/)
  assert.match(banner, /NETWORK_UNREACHABLE_EVENT/)
  assert.match(banner, /effectivelyOffline/)
  assert.match(banner, /position:\s*fixed/)

  assert.equal(en.common.status.offlineBanner, "No internet connection. Mutqin will resume when you're back online.")
  assert.equal(en.common.status.offlineTitle, 'You appear to be offline.')
  assert.match(en.common.status.errorDesc, /Something went wrong\. Please try again/)
  assert.equal(en.common.status.returnHome, 'Return Home')
  assert.equal(en.common.status.retry, 'Retry')
})

test('dashboard and admin boot failures use NetworkFallback and reconnect retry', () => {
  const dash = read('resources/js/views/Dashboard.vue')
  const admin = read('resources/js/views/AdminDashboard.vue')
  const app = read('resources/js/app.js')
  const layout = read('resources/views/layouts/app.blade.php')

  assert.match(dash, /NetworkFallback/)
  assert.match(dash, /classifyRequestFailure/)
  assert.match(dash, /subscribeNetworkStatus/)
  assert.match(admin, /NetworkFallback/)
  assert.match(admin, /subscribeNetworkStatus/)
  assert.match(app, /You appear to be offline/)
  assert.match(app, /Return Home/)
  assert.match(app, /network-status-banner/)
  assert.match(layout, /<network-status-banner>/)
})

test('Laravel error pages stay friendly and avoid exception dumps', () => {
  const page500 = read('resources/views/errors/500.blade.php')
  const offline = read('resources/views/errors/offline.blade.php')
  const layout = read('resources/views/layouts/error.blade.php')
  const enUi = read('lang/en/ui.php')

  assert.match(page500, /ui\.error_message/)
  assert.match(page500, /ui\.error_retry/)
  assert.match(page500, /ui\.error_return_home/)
  assert.doesNotMatch(page500, /\$exception|getMessage\(|stack/)
  assert.match(offline, /ui\.error_offline_title/)
  assert.match(layout, /navigator\.onLine === false/)
  assert.match(enUi, /Something went wrong\. Please try again/)
  assert.match(enUi, /You appear to be offline/)
})
