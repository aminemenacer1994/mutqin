import assert from 'node:assert/strict'
import { buildAskMutqinAyahHighlightParts } from '../../resources/js/scripts/askMutqin/matchAyah.js'

const ayah = 'وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ وَبِئْسَ الْمَصِيرُ'
const parts = buildAskMutqinAyahHighlightParts(ayah, 'وللذين كفروا بربهم')
const highlighted = parts.filter((part) => part.highlight).map((part) => part.text)
assert.ok(highlighted.length >= 3, 'heard phrase highlights multiple non-contiguous words')
assert.ok(
  parts.every((part) => !String(part.text).includes('\n')),
  'parts stay on display tokens without injecting newlines',
)

console.log('ask-mutqin-highlight.test.mjs: ok')
