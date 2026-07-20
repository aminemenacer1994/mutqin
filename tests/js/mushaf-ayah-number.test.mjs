import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const vuePath = path.join(root, 'resources/js/views/Memorisation.vue')
const cssPath = path.join(root, 'resources/js/views/Memorisation.css')
const jsPath = path.join(root, 'resources/js/views/Memorisation.js')

const [vue, css, js] = await Promise.all([
  fs.readFile(vuePath, 'utf8'),
  fs.readFile(cssPath, 'utf8'),
  fs.readFile(jsPath, 'utf8'),
])

assert.match(vue, /class="mushaf-ayah-number"/)
assert.match(vue, /mushaf-ayah-number-visual/)
assert.match(vue, /getMushafAyahNumberAriaLabel\(row\.verse\.number\)/)
assert.match(vue, /mushaf-ayah-number-paren/)
assert.match(vue, /mushaf-ayah-number-digit/)
assert.doesNotMatch(vue, /class="mushaf-ayah-number"[^>]*>\{\{\s*row\.verse\.number\s*\}\}/)

assert.match(css, /--mushaf-ayah-badge-bg/)
assert.match(css, /unicode-bidi:\s*isolate/)
assert.doesNotMatch(css, /conic-gradient\(from 20deg, #b0175a/)
assert.match(js, /getMushafAyahNumberAriaLabel/)
assert.match(js, /ayahNumberLabel/)

console.log('Mushaf ayah number marker tests passed')
