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

assert.match(vue, /madani-page-sheet/)
assert.match(vue, /currentMadaniLines/)
assert.match(vue, /madani-word/)
assert.match(vue, /madani-surah-name/)
assert.match(vue, /onMadaniWordClick/)
assert.doesNotMatch(vue, /class="mushaf-ayah-number"/)
assert.doesNotMatch(vue, /mushaf-ayah-number-visual/)

assert.match(css, /\.madani-page-sheet/)
assert.match(css, /\.madani-line/)
assert.match(css, /\.madani-word/)
assert.match(css, /--mushaf-line-rule/)

assert.match(js, /buildMadaniPageLayout/)
assert.match(js, /ensureMadaniPagesLoaded/)
assert.match(js, /getMadaniPageVerses/)
assert.match(js, /loadQcfPageFont/)
assert.match(js, /currentMadaniLines/)
assert.match(js, /Madani Mushaf uses the official QCF page font/)

console.log('Madani mushaf rendering tests passed')
