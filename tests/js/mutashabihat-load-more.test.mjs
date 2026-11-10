import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const bridge = readFileSync(join(root, 'resources/js/scripts/mutashabihat/workspaceBridge.js'), 'utf8')

assert.match(js, /mutashabihatVisibleLimit: 8/)
assert.match(js, /listMutashabihatCardRows\(this, \{ limit: this\.mutashabihatVisibleLimit/)
assert.match(js, /onMutashabihatListScroll/)
assert.match(js, /if \(!ready \|\| !this\.sectionOpen\?\.mutashabihat\) return/)
assert.match(vue, /@scroll\.passive="onMutashabihatListScroll"/)
assert.match(bridge, /mapWithLimit/)
assert.match(bridge, /arabicOnly/)
assert.doesNotMatch(bridge, /scan \+ 8/)

console.log('mutashabihat-load-more.test.mjs passed')
