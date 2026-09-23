import assert from 'node:assert/strict'
import {
  cacheMadaniPageLeaf,
  clearMadaniPageDataCacheForTests,
  getCachedMadaniPageLeaf,
  madaniPageJsonUrl,
  prefetchMadaniPageData,
  preloadMadaniNavigationTargets,
} from '../../resources/js/scripts/mushaf/qpcMadaniPageData.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  nextMadaniSpread,
  previousMadaniSpread,
  resolveMadaniSpread,
} from '../../resources/js/scripts/mushaf/madaniPagePair.js'

clearMadaniPageDataCacheForTests()

assert.equal(madaniPageJsonUrl(1), '/quran/madani-v2/pages/001.json')
assert.equal(madaniPageJsonUrl(604), '/quran/madani-v2/pages/604.json')

cacheMadaniPageLeaf(563, {
  page: { page_number: 563, lines: [] },
  fontFamily: 'QCF2563',
  fontUrl: '/madani/font/p563.woff2',
})

const cached = getCachedMadaniPageLeaf(563)
assert.ok(cached)
assert.equal(cached.fontFamily, 'QCF2563')

prefetchMadaniPageData([563, 563, 564])
assert.equal(getCachedMadaniPageLeaf(563).fontFamily, 'QCF2563')

const spread = resolveMadaniSpread(564)
assert.deepEqual(spread.pages, [563, 564])
assert.equal(previousMadaniSpread(564), 561)
assert.equal(nextMadaniSpread(564), 565)

preloadMadaniNavigationTargets('spread', 564)

const fontLoaderSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../resources/js/scripts/mushaf/qpcMadaniFontLoader.js'),
  'utf8'
)
assert.doesNotMatch(fontLoaderSource, /document\.fonts\.check/, 'QCF page fonts must not trust fonts.check()')
assert.match(fontLoaderSource, /new FontFace/, 'QCF page fonts load through FontFace')

console.log('qpc-madani-caches.test.mjs: ok')
