import assert from 'node:assert/strict'
import { buildQuranAlignment, buildRealtimePreviewAlignment } from '../../resources/js/scripts/engine/recitation_analysis.js'
import { resolveConfirmedWordIndex } from '../../resources/js/scripts/memorisationDetection/liveCursor.js'

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

{
  const weakAyah = ['كتاب', 'قلم', 'مدرسة', 'شارع', 'حديقة', 'سيارة', 'جسر', 'نهر', 'جبل', 'بحر', 'قمر', 'نجم']
  const nextAyah = ['مالك', 'يوم', 'الدين']
  const set = [
    { key: '1:1', number: 1, text: 'بسم الله الرحمن الرحيم' },
    { key: '1:2', number: 2, text: weakAyah.join(' ') },
    { key: '1:3', number: 3, text: nextAyah.join(' ') },
  ]
  const heard = ['بسم', 'الله', 'الرحمن', 'الرحيم', ...nextAyah]
  const alignment = buildRealtimePreviewAlignment(
    set.map((ayah) => ayah.text).join(' '),
    words(heard),
    {
      lifecycle: 'live',
      strictProgression: true,
      targetAyahs: set.map((ayah) => ({ ayahKey: ayah.key, number: ayah.number, text: ayah.text })),
      lookahead: 0,
      exactSkipLookahead: 3,
      partialAdvances: true,
      advanceOnIncorrect: true,
      allowArticleMatch: false,
    },
  )
  const statuses = alignment.wordStatuses || []
  const ayahOf = (ayah) => statuses.filter((word) => Number(word.ayahNumber) === ayah)
  assert.ok(ayahOf(1).every((word) => word.status === 'correct'), 'the ayah before the weak one stays green')
  assert.ok(ayahOf(2).every((word) => word.status === 'omitted'), 'the skipped ayah is the weak one')
  assert.ok(ayahOf(3).every((word) => word.status === 'correct'), 'recitation continues through the ayah after it')
  assert.equal(
    resolveConfirmedWordIndex(statuses),
    statuses.length - 1,
    'the live cursor reaches the end of the set',
  )
}

console.log('amd-al-fatiha-live-alignment: ok')
