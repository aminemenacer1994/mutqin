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
assert.match(css, /\.madani-word--end\.madani-word--unicode/)
assert.match(css, /\.madani-word--end\.madani-word--fallback/)
assert.match(css, /Unicode \/ fallback Quranic fonts: U\+06DD ornate marker/)
assert.match(css, /madani-word--end\.madani-word--unicode[\s\S]*?font-family:\s*"Amiri Quran"/)
assert.doesNotMatch(
  css,
  /\.madani-word--end\.madani-word--unicode,\s*\n\.main\.mushaf-mode-active \.madani-word--end\.madani-word--fallback \{\s*\n\s*display: inline-flex/
)

assert.match(js, /useMadaniQcfGlyphs/)
assert.match(js, /formatMadaniAyahEndLabel/)
assert.match(js, /getDefaultMushafBackgroundForTheme/)
assert.match(js, /mushafBackgroundTouched/)
assert.doesNotMatch(js, /Madani Mushaf uses the official QCF page font/)

const layoutPath = path.join(root, 'resources/js/scripts/mushaf/madaniPageLayout.js')
const layout = await fs.readFile(layoutPath, 'utf8')
assert.match(layout, /\\u06DD\$\{toEasternArabicDigits/)

console.log('Madani mushaf rendering tests passed')

