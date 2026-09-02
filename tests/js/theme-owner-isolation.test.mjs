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
  themePreferenceStorageKeyForOwner,
  themeStorageKeyForOwner,
  SHARED_THEME_STORAGE_KEYS,
  cycleGlobalTheme,
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

globalThis.document = {
  documentElement: {
    attrs: { 'data-theme': '' },
    style: {},
    getAttribute(name) { return this.attrs[name] || null },
    setAttribute(name, value) { this.attrs[name] = String(value) },
  },
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
window.dispatchEvent = () => {}

assert.equal(themeStorageKeyForOwner(42), 'mutqin-theme.42')
assert.equal(themePreferenceStorageKeyForOwner('guest'), 'mutqin-theme-preference.guest')
assert.deepEqual(SHARED_THEME_STORAGE_KEYS, ['mutqin-theme', 'mutqin-theme-preference'])

// Guest A preference stays in guest bucket
document.documentElement.setAttribute('data-theme', '')
setGlobalTheme('dark', { dispatchEvent: false, persist: false })
assert.equal(store.get('mutqin-theme.guest'), 'dark')
assert.equal(store.get('mutqin-theme'), 'dark', 'guest still mirrors legacy key')

// Switch to user 7 — must not read guest dark; uses account theme
document.documentElement.setAttribute('data-theme', '')
window.mutqinAuthCheck = true
window.mutqinUserId = 7
window.mutqinInitialTheme = 'light'
window.mutqinInitialThemePreference = 'light-mode'
store.set('mutqin-theme', 'dark')
store.set('mutqin-theme.guest', 'dark')
store.set('mutqin-theme.99', 'sepia')

assert.equal(getThemeOwnerId(), '7')
assert.equal(getSavedTheme(), 'light', 'auth users follow account theme, not shared/guest storage')
assert.equal(isCurrentOwnerThemeStorageKey('mutqin-theme.7'), true)
assert.equal(isCurrentOwnerThemeStorageKey('mutqin-theme.99'), false)
assert.equal(isCurrentOwnerThemeStorageKey('mutqin-theme'), false)

setGlobalTheme('sepia', { dispatchEvent: false, persist: false })
assert.equal(store.get('mutqin-theme.7'), 'sepia')
assert.equal(store.has('mutqin-theme'), false, 'auth writes must clear legacy shared keys')
assert.equal(store.get('mutqin-theme.guest'), 'dark', 'other owners untouched')
assert.equal(store.get('mutqin-theme.99'), 'sepia', 'other owners untouched')
assert.equal(window.mutqinInitialTheme, 'sepia')

// Cycle advances from live DOM, not a stale snapshot
document.documentElement.setAttribute('data-theme', 'sepia')
window.mutqinInitialTheme = 'light'
assert.equal(cycleGlobalTheme(), 'dark')
assert.equal(document.documentElement.getAttribute('data-theme'), 'dark')

// User 99 keeps their own bucket when “logged in”
document.documentElement.setAttribute('data-theme', '')
window.mutqinUserId = 99
window.mutqinInitialTheme = 'sepia'
assert.equal(getSavedTheme(), 'sepia')
assert.equal(store.get('mutqin-theme.7'), 'dark')

// Logout residue clear drops shared theme keys but keeps per-user buckets
store.set('mutqin-theme', 'light')
store.set('mutqin-theme-preference', 'light-mode')
clearSharedMutqinBrowserResidue({ localStorage: globalThis.localStorage, sessionStorage: null })
assert.equal(store.has('mutqin-theme'), false)
assert.equal(store.has('mutqin-theme-preference'), false)
assert.equal(store.get('mutqin-theme.7'), 'dark')
assert.equal(store.get('mutqin-theme.99'), 'sepia')

assert.equal(DEFAULT_THEME, 'light')
assert.deepEqual(THEME_MODE_IDS, ['light', 'sepia', 'dark'])
assert.equal(getThemeMode('sepia-mode').id, 'sepia')
assert.equal(getThemeMode('night').id, 'light')
assert.equal(THEME_MODES.length, 3)

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const blade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')
assert.match(blade, /ownerThemeKey|mutqin-theme\.\$\{/)
assert.match(blade, /safeRemove\('mutqin-theme'\)/)
assert.match(blade, /window\.mutqinInitialTheme/)

const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
assert.match(memorisation, /isCurrentOwnerThemeStorageKey/)
assert.doesNotMatch(
  memorisation,
  /event\.key !== 'mutqin-theme'/,
)

const setLocale = readFileSync(join(root, 'app/Http/Middleware/SetLocale.php'), 'utf8')
assert.match(setLocale, /Signed-in accounts never inherit another person's cookie\/session/)

const login = readFileSync(join(root, 'app/Http/Controllers/Auth/LoginController.php'), 'utf8')
assert.match(login, /withCookie\(cookie\('mutqin_theme', Theme::DEFAULT_PREFERENCE/)
assert.match(login, /session\(\)->put\('mutqin_theme', \$theme\)/)

console.log('theme-owner-isolation: ok')
