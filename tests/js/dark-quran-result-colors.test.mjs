import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')

assert.match(css, /Dark reading results: keep the Quran text calm and legible/)
assert.match(css, /--tajweed-colour:\s*#74d6a5/)
assert.match(css, /--tajweed-colour:\s*#ffada5/)
assert.match(css, /--tajweed-colour:\s*#f6cb78/)
assert.match(css, /quran-token\.is-incorrect[\s\S]{0,1500}background:\s*transparent !important/)

console.log('dark-quran-result-colors.test.mjs: ok')
