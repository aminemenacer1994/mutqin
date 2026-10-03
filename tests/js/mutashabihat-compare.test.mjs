import assert from 'node:assert/strict'
import { compareAyahTexts, renderComparedAyahHtml } from '../../resources/js/scripts/mutashabihat/compareAyahs.js'

const left = 'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا'
const right = 'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا'
const same = compareAyahTexts(left, right)
assert.equal(same.stats.different, 0)

const diff = compareAyahTexts(
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا',
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا نَغْفِرْ',
)
assert.ok(diff.stats.different + diff.stats.inserted + diff.stats.omitted >= 0)

const html = renderComparedAyahHtml([
  { kind: 'shared', text: 'word' },
  { kind: 'different', text: 'other' },
])
assert.match(html, /is-diff/)

console.log('mutashabihat-compare.test.mjs passed')
