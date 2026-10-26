import assert from 'node:assert/strict'
import { buildMadaniAyahArabicFromVerse } from '../../resources/js/scripts/mutashabihat/madaniAyahText.js'
import { getVerseLookup } from '../../resources/js/scripts/mutashabihat/pairRows.js'

const verse = {
  verse_key: '2:58',
  words: [
    { position: 1, char_type_name: 'word', text_qpc_hafs: 'وَإِذْ' },
    { position: 2, char_type_name: 'word', text_qpc_hafs: 'قُلْنَا' },
    { position: 3, char_type_name: 'end', text_qpc_hafs: '٥٨' },
  ],
}
assert.equal(buildMadaniAyahArabicFromVerse(verse), 'وَإِذْ قُلْنَا')

const ctx = {
  mutashabihatAyahRevision: 1,
  quranSearchIndex: [
    { key: '2:58', arabic: 'ٱلْحَمْدُ', translation: 'Praise' },
  ],
  mutashabihatAyahByKey: {
    '2:58': { key: '2:58', arabic: 'وَإِذْ قُلْنَا', translation: 'When We said' },
  },
}
const lookup = getVerseLookup(ctx)
assert.equal(lookup.get('2:58')?.arabic, 'وَإِذْ قُلْنَا')

console.log('mutashabihat-madani-text.test.mjs passed')
