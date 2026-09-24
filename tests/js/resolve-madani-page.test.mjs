import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  resolveMadaniPage,
  resolveQpcMadaniPageForVerseKey,
  verseKeyFromCoordinates,
} from '../../resources/js/scripts/mushaf/qpcMadaniVersePage.js'
import { resolveMadaniSpread } from '../../resources/js/scripts/mushaf/madaniPagePair.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const index = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/verse-pages.json'), 'utf8'))
const keys = Object.keys(index)

assert.equal(keys.length, 6236, 'resolver covers all 6,236 ayahs')
assert.equal(resolveMadaniPage(1, 1, index), 1)
assert.equal(resolveMadaniPage(2, 1, index), 2)
assert.equal(resolveMadaniPage(2, 30, index), 6)
assert.equal(resolveMadaniPage(2, 34, index), 6)
assert.equal(resolveMadaniPage(18, 54, index), 300)
assert.equal(resolveMadaniPage(109, 1, index), 603)
assert.equal(resolveMadaniPage(114, 6, index), 604)
assert.equal(resolveQpcMadaniPageForVerseKey('2:34:1', index), 6)
assert.equal(verseKeyFromCoordinates(2, 34), '2:34')

for (const key of keys) {
  const page = index[key]
  assert.ok(page >= 1 && page <= 604, `${key} mapped outside 1–604: ${page}`)
}

assert.deepEqual(resolveMadaniSpread(1).pages, [1, 2])
assert.deepEqual(resolveMadaniSpread(2).pages, [1, 2])
assert.deepEqual(resolveMadaniSpread(6).pages, [5, 6])
assert.deepEqual(resolveMadaniSpread(603).pages, [603, 604])
assert.deepEqual(resolveMadaniSpread(604).pages, [603, 604])

const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
assert.match(memorisationVue, /:active-ayah="qpcMadaniSelectionActiveAyah"/, 'reader exposes activeAyah to Madani')
assert.match(memorisationVue, /hide-dev-nav/, 'production Madani hides standalone pager')

console.log('resolve-madani-page.test.mjs: ok')
