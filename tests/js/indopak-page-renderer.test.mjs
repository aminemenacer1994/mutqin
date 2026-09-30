import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildIndopakPageLeaf,
  normalizeIndopakPage,
} from '../../resources/js/scripts/mushaf/indopakPageAdapter.js'
import { MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH } from '../../resources/js/scripts/mushaf/mushafLayouts.js'
import { INDOPAK_NASTALEEQ_FONT_FAMILY } from '../../resources/js/scripts/mushaf/indopakNastaleeqFont.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const page1 = JSON.parse(
  readFileSync(join(root, 'resources/quran/indopak-15-qudratullah/generated/pages/1.json'), 'utf8'),
)
const page2 = JSON.parse(
  readFileSync(join(root, 'resources/quran/indopak-15-qudratullah/generated/pages/2.json'), 'utf8'),
)

const normalized = normalizeIndopakPage(page1)
assert.equal(normalized.page_number, 1)
assert.equal(normalized.layout_id, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
assert.ok(normalized.lines.length >= 2)

const numbers = normalized.lines.map((line) => line.line_number)
assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b), 'lines sorted by lineNumber')

assert.equal(normalized.lines[0].line_type, 'surah_name')
assert.equal(normalized.lines[0].is_centered, 1)
assert.equal(normalized.lines[0].surah_number, 1)
assert.deepEqual(normalized.lines[0].words, [])

const ayahLine = normalized.lines.find((line) => line.line_type === 'ayah')
assert.ok(ayahLine)
assert.ok(ayahLine.words.length > 0)

const firstWord = ayahLine.words[0]
assert.equal(firstWord.location, '1:1:1')
assert.equal(firstWord.verseKey, '1:1')
assert.equal(firstWord.wordPosition, 1)
assert.equal(firstWord.surah, 1)
assert.equal(firstWord.ayah, 1)
assert.equal(firstWord.word, 1)
assert.equal(firstWord.page, 1)
assert.equal(firstWord.isEnd, false)
assert.ok(String(firstWord.text).length > 0)

const endWord = ayahLine.words.find((word) => word.location === '1:1:5')
assert.ok(endWord)
assert.equal(endWord.isEnd, true)
assert.equal(endWord.charType, 'end')

// Do not redistribute words — preserve source order within the printed line.
const sourceLine = page1.lines.find((line) => line.lineNumber === ayahLine.line_number)
assert.deepEqual(
  ayahLine.words.map((word) => word.location),
  sourceLine.words.map((word) => word.location),
)

const leaf = buildIndopakPageLeaf(page2)
assert.equal(leaf.layoutId, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
assert.equal(leaf.fontFamily, INDOPAK_NASTALEEQ_FONT_FAMILY)
assert.equal(leaf.page.lines[0].line_type, 'surah_name')
assert.equal(leaf.page.lines[1].line_type, 'basmallah')
assert.equal(leaf.page.lines[1].is_centered, 1)
assert.equal(leaf.page.lines[1].words.length, 0)

const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')
assert.match(wordVue, /data-verse-key/)
assert.match(wordVue, /data-word-position/)
assert.match(wordVue, /data-location/)
assert.match(wordVue, /isIndopakLayout/)

const lineVue = readFileSync(join(root, 'resources/js/components/madani/MadaniLine.vue'), 'utf8')
assert.match(lineVue, /MadaniSurahHeading/)
assert.match(lineVue, /isIndopakLayout/)
assert.match(lineVue, /line\.words/)

const pageVue = readFileSync(join(root, 'resources/js/components/madani/MadaniPage.vue'), 'utf8')
assert.match(pageVue, /ensureIndopakNastaleeqFontForLayout/)
assert.match(pageVue, /layoutId/)

console.log('indopak-page-renderer.test.mjs: ok')
