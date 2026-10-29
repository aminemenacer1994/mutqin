import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const js = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')

assert.match(js, /mutashabihatHasMore\(\)/)
assert.match(js, /listMutashabihatRankedPairs\(this\)/)
assert.match(js, /countMutashabihatCardRows\(this\)/)
assert.match(js, /async loadMoreMutashabihatPairs\(\)/)
assert.match(js, /mutashabihatVisibleLimit \+= 4/)

console.log('mutashabihat-load-more.test.mjs passed')
