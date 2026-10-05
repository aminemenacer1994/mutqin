import assert from 'node:assert/strict'
import {
  buildAskMutqinAyahHighlightParts,
  sanitizeAskMutqinAyahDisplay,
  resolvePlaybackWordIndex,
} from '../../resources/js/scripts/askMutqin/matchAyah.js'

const ayah = 'وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ وَبِئْسَ الْمَصِيرُ'
const parts = buildAskMutqinAyahHighlightParts(ayah, 'وللذين كفروا بربهم')
const highlighted = parts.filter((part) => part.highlight).map((part) => part.text)
assert.ok(highlighted.length >= 3, 'heard phrase highlights multiple non-contiguous words')
assert.ok(
  parts.every((part) => !String(part.text).includes('\n')),
  'parts stay on display tokens without injecting newlines',
)

const withOrnaments = 'وَقَٰتِلُوا۟ ۞ فِى سَبِيلِ ٱللَّهِ ۝190'
const cleaned = sanitizeAskMutqinAyahDisplay(withOrnaments)
assert.ok(!cleaned.includes('۞') && !cleaned.includes('۝'), 'search results drop rubʿ al-ḥizb and ayah-end circles')
assert.ok(
  !sanitizeAskMutqinAyahDisplay('كُلُوا۟ ۞ وَٱشْرَبُوا۟').includes('۞'),
  'filled ornament circles are removed from displayed ayahs',
)
const displayParts = buildAskMutqinAyahHighlightParts('وَقَٰتِلُوا۟ ۞ فِى سَبِيلِ ۚ ٱللَّهِ', '')
assert.ok(
  displayParts.every((part) => !/[۞۝●•]/.test(part.text) && /[\u0621-\u064A]/.test(part.text)),
  'ornament-only tokens never reach the ayah display',
)

const timed = [{ text: 'aa' }, { text: 'bbbb' }, { text: 'c' }]
assert.equal(resolvePlaybackWordIndex(timed, 0, 10), 0)
assert.equal(resolvePlaybackWordIndex(timed, 9.9, 10), 2)
assert.equal(resolvePlaybackWordIndex([], 1, 10), -1)

console.log('ask-mutqin-highlight.test.mjs: ok')
