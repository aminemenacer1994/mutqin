import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const vue = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const compare = fs.readFileSync(path.join(root, 'resources/js/components/MutashabihatCompareModal.vue'), 'utf8')
const card = fs.readFileSync(path.join(root, 'resources/js/components/MutashabihatPairCard.vue'), 'utf8')
const cardCss = fs.readFileSync(path.join(root, 'resources/js/components/MutashabihatPairCard.css'), 'utf8')

assert.match(vue, /mutashabihatVisibleRows/)
assert.match(vue, /mutashabihatPanelInitialLoading/)
assert.match(vue, /v-else-if="mutashabihatVisibleRows.length"/)
assert.doesNotMatch(card, /mutashabihat-card__ref/)
assert.match(card, /mutashabihat-card__compare/)
assert.doesNotMatch(card, /v-if="row\.leftPreviewHtml"/)
assert.match(card, /mutashabihat-card__stack/)
assert.match(card, /mutashabihat-card__passage/)
assert.doesNotMatch(cardCss, /grid-template-columns:\s*1fr\s+1fr/)
assert.match(cardCss, /flex-direction:\s*column/)
assert.match(compare, /leftOpen: true/)
assert.match(compare, /audio-control/)
assert.match(compare, /bi-pause-fill/)
assert.match(compare, /bi-stop-fill/)

console.log('mutashabihat-panel.test.mjs passed')
