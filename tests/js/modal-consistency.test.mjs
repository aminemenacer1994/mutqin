import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const css = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const vue = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

const sharedTokens = [
  '--mutqin-modal-radius',
  '--mutqin-modal-backdrop',
  '--mutqin-modal-backdrop-blur',
  '--mutqin-modal-surface-bg',
  '--mutqin-modal-surface-border',
  '--mutqin-modal-shadow',
  '--mutqin-modal-hero-bg',
  '--mutqin-modal-enter-duration',
  '--mutqin-modal-btn-radius',
  '--mutqin-modal-btn-min-height',
]

for (const token of sharedTokens) {
  assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing token ${token}`)
}

assert.match(css, /\.post-session-simple__dialog[\s\S]*?var\(--mutqin-modal-surface-bg\)/)
assert.match(css, /\.post-session-simple__dialog[\s\S]*?var\(--mutqin-modal-radius\)/)
assert.match(css, /\.post-session-simple__backdrop[\s\S]*?var\(--mutqin-modal-backdrop\)/)
assert.match(css, /\.modal-content\.mutqin-modal-surface[\s\S]*?var\(--mutqin-modal-radius\)/)
assert.match(css, /\.mutqin-modal-btn[\s\S]*?var\(--mutqin-modal-btn-radius/)
assert.match(css, /\.post-session-simple__btn[\s\S]*?var\(--mutqin-modal-btn-radius\)/)
assert.match(css, /\.post-session-simple__btn--primary[\s\S]*?linear-gradient\(135deg, var\(--accent\), var\(--accent-strong\)\)/)
assert.match(css, /\.mutqin-modal-btn--primary[\s\S]*?linear-gradient\(135deg, var\(--accent\), var\(--accent-strong\)\)/)
assert.match(css, /\.session-exit-backdrop[\s\S]*?backdrop-filter:\s*blur\(var\(--mutqin-modal-backdrop-blur\)/)
assert.match(css, /\.modal-content\.self-check-modal[\s\S]*?var\(--mutqin-modal-surface-bg\)/)
assert.doesNotMatch(
  css,
  /\.modal-content\.self-check-modal,\s*\.modal-content\.memorisation-checker-modal\s*\{[^}]*background:\s*#fff\s*!important/,
  'self-check should not force flat white surfaces'
)

const modalSurfaces = [
  'mutqin-modal-surface',
  'session-exit-modal',
  'welcome-back-modal',
  'post-onboarding-modal',
  'confirm-modal',
  'save-name-modal',
  'self-check-modal',
  'help-learning-modal',
  'recordings-library-modal',
]

for (const surface of modalSurfaces) {
  assert.match(vue, new RegExp(surface), `vue should include ${surface}`)
}

console.log('modal-consistency.test.mjs: ok')
