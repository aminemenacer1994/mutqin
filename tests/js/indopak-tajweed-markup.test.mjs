/**
 * IndoPak mushaf tajweed paints Unicode text with stacked-style rule colours.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildIndopakTajweedTokenByLocation,
  collectTajweedBaseLetterRules,
  paintUnicodeTextWithTajweedToken,
} from '../../resources/js/scripts/mushaf/indopakTajweedMarkup.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')

const ghunnahToken = '<span class="tajweed-mark tajweed-ghn">مّ</span>ن'
const painted = paintUnicodeTextWithTajweedToken('مّن', ghunnahToken)
assert.match(painted, /tajweed-ghn/)
assert.match(painted, /مّ/)
assert.doesNotMatch(painted, /<script/)

const rules = collectTajweedBaseLetterRules(ghunnahToken)
assert.equal(rules.length, 2)
assert.deepEqual(rules[0], ['ghn'])

const map = buildIndopakTajweedTokenByLocation(
  [{
    key: '1:1',
    arabic_tajweed: '[gمّ]ن',
    words: [{ position: 1, location: '1:1:1' }],
  }],
  {
    normalizeMarkup: (text) => String(text || '')
      .replace(/\[g/g, '<span class="tajweed-mark tajweed-ghn">')
      .replace(/\]/g, '</span>'),
    splitIntoWordHtml: (markup) => [markup],
    sanitizeHtml: (html) => html,
  },
)
assert.match(map['1:1:1'], /tajweed-ghn/)

assert.match(memorisationJs, /qpcIndopakTajweedHtmlByLocation/)
assert.match(memorisationJs, /buildIndopakTajweedTokenByLocation/)
assert.match(memorisationJs, /isIndopakMushafLayout\(this\.mushafLayoutId\)[\s\S]{0,200}supported:\s*true/)
assert.match(wordVue, /paintUnicodeTextWithTajweedToken/)
assert.match(wordVue, /tajweedHtmlByLocation/)
assert.match(memorisationCss, /qpc-madani-page--indopak\.qpc-madani-page--tajweed \.tajweed-ghn/)
assert.match(
  memorisationCss,
  /\.qpc-madani-page--indopak\.qpc-madani-page--tajweed \.tajweed-mark[\s\S]*?background:\s*transparent/,
  'IndoPak tajweed must colour ink only — no background plates',
)
assert.match(
  memorisationCss,
  /qpc-madani-word--indopak-tajweed[\s\S]*?-webkit-text-fill-color:\s*unset/,
  'IndoPak tajweed words must not inherit the page ink fill override',
)
assert.match(
  memorisationCss,
  /qpc-madani-word--indopak-tajweed[\s\S]*?currentColor\s*!important/,
  'tajweed spans must paint via currentColor fill',
)
assert.doesNotMatch(memorisationVue, /top-card-menu-label--mushaf-edition/)
assert.doesNotMatch(memorisationVue, /top-card-menu-divider--mushaf-edition/)
assert.match(memorisationJs, /wordByWordAudioEnabled = true[\s\S]{0,80}ensureWordAudioHighlighting/)
assert.match(memorisationJs, /syncTopCardMenuPosition/)
assert.match(memorisationVue, /top-card-menu--fixed|ref="topCardMenu"/)
assert.match(
  memorisationVue,
  /top-card-menu-group--stacked-reading[\s\S]{0,120}readingViewMode === 'stacked'|readingViewMode === 'stacked'[\s\S]{0,120}top-card-menu-group--stacked-reading/,
)
assert.match(memorisationVue, /top-card-menu-row--mushaf-edition/)
assert.doesNotMatch(memorisationVue, /toggleKeyboardShortcuts[\s\S]{0,120}top-card-menu/)

console.log('indopak-tajweed-markup.test.mjs: ok')
