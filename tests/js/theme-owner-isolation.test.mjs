import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_THEME,
  THEME_MODE_IDS,
  THEME_MODES,
  getSavedTheme,
  getThemeMode,
  getThemeOwnerId,
  isCurrentOwnerThemeStorageKey,
  setGlobalTheme,
  themeStorageKeyForOwner,
  SHARED_THEME_STORAGE_KEYS,
  cycleGlobalTheme,
  clearThemeDeviceCache,
  resolveThemeForLoad,
} from '../../resources/js/utils/theme.js'
import { clearSharedMutqinBrowserResidue } from '../../resources/js/utils/mutqinStorageKeys.js'

const store = new Map()
const cookieBag = { value: '' }

globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  key: (index) => Array.from(store.keys())[index] ?? null,
  get length() { return store.size },
}

function makeClassList() {
  const set = new Set()
  return {
    toggle(name, force) {
      if (force) set.add(name)
      else set.delete(name)
    },
    contains(name) { return set.has(name) },
    add(name) { set.add(name) },
    remove(name) { set.delete(name) },
  }
}

globalThis.document = {
  documentElement: {
    attrs: { 'data-theme': '' },
    style: {},
    classList: makeClassList(),
    getAttribute(name) { return this.attrs[name] || null },
    setAttribute(name, value) { this.attrs[name] = String(value) },
  },
  body: { classList: makeClassList() },
  cookie: '',
  querySelector() { return null },
  querySelectorAll() { return [] },
  head: { appendChild() {} },
  createElement() {
    return { setAttribute() {}, removeAttribute() {} }
  },
}

Object.defineProperty(globalThis.document, 'cookie', {
  get() { return cookieBag.value },
  set(value) {
    const [pair] = String(value).split(';')
    const [rawKey, ...rest] = pair.split('=')
    const key = rawKey.trim()
    const next = `${key}=${rest.join('=')}`
    const parts = cookieBag.value ? cookieBag.value.split('; ').filter(Boolean) : []
    const idx = parts.findIndex((part) => part.startsWith(`${key}=`))
    if (idx >= 0) parts[idx] = next
    else parts.push(next)
    cookieBag.value = parts.join('; ')
  },
  configurable: true,
})

globalThis.window = globalThis
window.mutqinAuthCheck = false
window.mutqinUserId = null
window.mutqinInitialTheme = null
window.mutqinInitialThemePreference = null
window.mutqinAccountTheme = null
window.dispatchEvent = () => {}
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ theme: 'dark' }),
})

assert.equal(themeStorageKeyForOwner(42), 'mutqin:theme:42')
assert.equal(themeStorageKeyForOwner('guest'), 'mutqin:theme:guest')
assert.deepEqual(SHARED_THEME_STORAGE_KEYS, ['mutqin-theme', 'mutqin-theme-preference'])

document.documentElement.setAttribute('data-theme', '')
setGlobalTheme('dark', { dispatchEvent: false, persist: true })
assert.equal(store.get('mutqin:theme:guest'), 'dark', 'guest writes mutqin:theme:guest')
assert.match(cookieBag.value, /mutqin_theme=dark/)
assert.equal(document.documentElement.classList.contains('dark-mode'), true)

store.clear()
clearThemeDeviceCache()
store.set('mutqin-theme', 'dark')
store.set('mutqin-theme.guest', 'dark')
store.set('mutqin-theme.99', 'sepia')
clearThemeDeviceCache()
assert.equal(store.has('mutqin-theme'), false)
assert.equal(store.has('mutqin-theme.guest'), false)
assert.equal(store.has('mutqin-theme.99'), false)

document.documentElement.setAttribute('data-theme', '')
window.mutqinAuthCheck = true
window.mutqinUserId = 7
window.mutqinAccountTheme = 'light'
store.set('mutqin:theme:7', 'dark')
store.set('mutqin:theme:guest', 'dark')

assert.equal(getThemeOwnerId(), '7')
assert.equal(resolveThemeForLoad(), 'light', 'account server theme wins over localStorage')
assert.equal(getSavedTheme(), 'light')
assert.equal(isCurrentOwnerThemeStorageKey('mutqin:theme:7'), true)
assert.equal(isCurrentOwnerThemeStorageKey('mutqin:theme:99'), false)

setGlobalTheme('dark', { dispatchEvent: false, persist: true })
assert.equal(store.get('mutqin:theme:7'), 'dark')
assert.equal(window.mutqinAccountTheme, 'dark')

document.documentElement.setAttribute('data-theme', 'dark')
window.mutqinAccountTheme = 'light'
assert.equal(cycleGlobalTheme(), 'light')
assert.equal(document.documentElement.getAttribute('data-theme'), 'light')

window.mutqinUserId = 99
window.mutqinAccountTheme = null
window.mutqinInitialTheme = null
window.mutqinInitialThemePreference = null
store.set('mutqin:theme:99', 'dark')
assert.equal(resolveThemeForLoad(), 'dark')

store.set('mutqin-theme', 'light')
store.set('mutqin-theme-preference', 'light-mode')
clearSharedMutqinBrowserResidue({ localStorage: globalThis.localStorage, sessionStorage: null })
assert.equal(store.has('mutqin-theme'), false)
assert.equal(store.get('mutqin:theme:99'), 'dark')

assert.equal(DEFAULT_THEME, 'light')
assert.deepEqual(THEME_MODE_IDS, ['light', 'sepia', 'dark'])
assert.equal(getThemeMode('sepia-mode').id, 'sepia')
assert.equal(getThemeMode('night').id, DEFAULT_THEME)
assert.equal(THEME_MODES.length, 3)

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const blade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')
assert.match(blade, /clearThemeDeviceCache/)
assert.match(blade, /X-XSRF-TOKEN/)
assert.match(blade, /window\.mutqinAccountTheme/)
assert.match(blade, /classList\.toggle\('dark-mode',\s*normalizedTheme === 'dark'\)/)
assert.match(blade, /mutqin:theme/)

const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
assert.match(memorisation, /isCurrentOwnerThemeStorageKey/)

const setLocale = readFileSync(join(root, 'app/Http/Middleware/SetLocale.php'), 'utf8')
assert.match(setLocale, /Signed-in accounts never inherit another person's cookie\/session/)

const login = readFileSync(join(root, 'app/Http/Controllers/Auth/LoginController.php'), 'utf8')
assert.match(login, /withCookie\(cookie\(Theme::COOKIE, Theme::DEFAULT_PREFERENCE/)
assert.match(login, /session\(\)->put\('mutqin_theme', \$theme\)/)

console.log('theme-owner-isolation: ok')
