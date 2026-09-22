import assert from 'node:assert/strict'
import { buildQuranAlignment, buildRealtimePreviewAlignment } from '../../resources/js/scripts/engine/recitation_analysis.js'

const ayahs = [
  { key: '1:1', number: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  { key: '1:2', number: 2, text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
  { key: '1:3', number: 3, text: 'الرَّحْمَٰنِ الرَّحِيمِ' },
  { key: '1:4', number: 4, text: 'مَالِكِ يَوْمِ الدِّينِ' },
]
const targetText = ayahs.map((a) => a.text).join(' ')
const meta = ayahs.map((a) => ({ ayahKey: a.key, number: a.number, text: a.text }))
const opts = {
  lifecycle: 'live',
  strictProgression: true,
  targetAyahs: meta,
  partialAdvances: true,
  exactSkipLookahead: 3,
  allowArticleMatch: true,
}

const heardSequence = [
  'بسم', 'الله', 'الرحمن', 'الرحيم',
  'الحمد', 'لله', 'رب', 'العالمين',
  'الرحمن', 'الرحيم',
  'مالك', 'يوم', 'الدين',
]

function words(arr) {
  return arr.map((w) => ({ word: w, confidence: 0.9, provider: 'speechmatics' }))
}

function lastSettled(statuses = []) {
  let last = -1
  for (let i = 0; i < statuses.length; i += 1) {
    if (['correct', 'partial'].includes(String(statuses[i]?.status || ''))) last = i
  }
  return last
}

for (const build of [buildQuranAlignment, buildRealtimePreviewAlignment]) {
  for (let n = 1; n <= heardSequence.length; n += 1) {
    const al = build(targetText, words(heardSequence.slice(0, n)), opts)
    const settled = lastSettled(al.wordStatuses || [])
    assert.ok(settled >= 0, `${build.name} n=${n} should settle at least one word`)
    if (n >= 10) {
      assert.ok(settled >= 8, `${build.name} n=${n} must not snap back to ayah 1 after ayah 3 phrase (settled=${settled})`)
    }
  }
}

console.log('amd-al-fatiha-live-alignment: ok')
