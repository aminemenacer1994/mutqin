import assert from 'node:assert/strict'
import { tokenizeDisplayText } from '../../resources/js/scripts/memorisation/quranTextNormalizer.js'
import { sanitizeMutashabihatAyahText } from '../../resources/js/scripts/mutashabihat/displayText.js'
import { buildAyahComparison } from '../../resources/js/scripts/mutashabihat/compareAyahs.js'

const r = await globalThis.fetch('https://api.alquran.cloud/v1/ayah/2:58/quran-unicode')
const broken = (await r.json()).data.text
const brokenTokens = tokenizeDisplayText(broken)
assert.ok(brokenTokens.length > 21, 'unicode edition splits words')

const r2 = await globalThis.fetch('https://api.alquran.cloud/v1/ayah/2:58/quran-simple')
const simple = sanitizeMutashabihatAyahText((await r2.json()).data.text)
const tokens = tokenizeDisplayText(simple)
assert.ok(tokens.length >= 19 && tokens.length <= 22, `expected ~21 words, got ${tokens.length}`)
assert.ok(tokens.some((w) => w.includes('قُلْنَا') || w.includes('قلنا')))
assert.ok(!tokens.some((w) => w === '۟' || w === 'ࣰ'))

const r3 = await globalThis.fetch('https://api.alquran.cloud/v1/ayah/7:161/quran-simple')
const right = sanitizeMutashabihatAyahText((await r3.json()).data.text)
const cmp = buildAyahComparison(simple, right)
assert.match(cmp.leftHtml, /mutashabihat-diff/)
assert.doesNotMatch(cmp.leftHtml, /<word\b/)

console.log('mutashabihat-display-text.test.mjs passed')
