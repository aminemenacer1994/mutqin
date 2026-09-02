/**
 * Session exit modal shows surah/range inside the progress card, not as a header pill.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')

assert.match(js, /resolveSessionExitScope/)
assert.match(js, /sessionExitSurahLabel/)
assert.match(js, /sessionExitRangeLabel/)

assert.match(vue, /session-exit-scope/)
assert.match(vue, /session-exit-scope-surah/)
assert.match(vue, /session-exit-scope-range/)
assert.match(vue, /session-exit-progress-metrics/)
assert.match(vue, /sessionExitSurahLabel/)
assert.match(vue, /sessionExitRangeLabel/)

assert.doesNotMatch(
  vue,
  /showSessionExitModal[\s\S]{0,1400}modal-context-badge[\s\S]{0,400}sessionExitTitle/,
  'session exit header should not render the context pill',
)

assert.match(css, /\.session-exit-scope-surah/)
assert.match(css, /\.session-exit-progress-metrics/)

console.log('session-exit-layout.test.mjs: ok')
