import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRealtimePreviewAlignment } from '../../resources/js/scripts/engine/recitation_analysis.js'
import {
  clampStatusesToConfirmedCursor,
  mergeLiveRecitationStatuses,
  resolveConfirmedWordIndex,
} from '../../resources/js/scripts/memorisationDetection/liveCursor.js'

const liveOpts = {
  lifecycle: 'live',
  strictProgression: true,
  lookahead: 0,
  exactSkipLookahead: 3,
  partialAdvances: true,
  advanceOnIncorrect: true,
  allowArticleMatch: true,
}

function words(arr) {
  return arr.map((w) => ({ word: w, confidence: 0.9, provider: 'speechmatics' }))
}

function statusesOf(alignment) {
  return (alignment.wordStatuses || []).map((word) => String(word?.status || 'pending'))
}

{
  const ayah = 'بسم الله الرحمن الرحيم'
  const alignment = buildRealtimePreviewAlignment(ayah, words(['الرحيم']), liveOpts)
  const painted = statusesOf(alignment)
  assert.equal(painted[0] === 'correct', false, 'first word stays unconfirmed')
  assert.equal(painted[3], 'pending', 'a lone last-word hear must not paint the other end')
}

{
  const fatiha = [
    'بسم الله الرحمن الرحيم',
    'الحمد لله رب العالمين',
    'الرحمن الرحيم',
    'مالك يوم الدين',
  ].join(' ')
  const alignment = buildRealtimePreviewAlignment(fatiha, words(['الرحيم']), liveOpts)
  const painted = statusesOf(alignment)
  assert.equal(painted[0] === 'correct', false)
  assert.equal(painted[3], 'pending', 'ayah-1 الرحيم must not light up from a first fragment')
  assert.equal(painted[9], 'pending', 'ayah-3 الرحمن الرحيم must not light up from the same fragment')
}

{
  const fatiha = [
    'بسم الله الرحمن الرحيم',
    'الحمد لله رب العالمين',
    'الرحمن الرحيم',
  ].join(' ')
  const alignment = buildRealtimePreviewAlignment(
    fatiha,
    words(['بسم', 'الله']),
    liveOpts,
  )
  const painted = statusesOf(alignment)
  assert.equal(painted[0], 'correct')
  assert.equal(painted[1], 'correct')
  assert.equal(painted[8] === 'correct', false, 'later الرحمن الرحيم must stay unpainted')
  assert.equal(painted[9] === 'correct', false)
}

{
  const bothEnds = [
    { status: 'correct' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'correct' },
  ]
  const confirmed = resolveConfirmedWordIndex(bothEnds)
  assert.ok(confirmed < 4, 'a far-ahead green must not pull the cursor to the other end')
  const merged = mergeLiveRecitationStatuses(bothEnds, bothEnds, { keepSettledAhead: true })
  assert.equal(merged[0].status, 'correct')
  assert.equal(merged[4].status, 'pending')
  const keptNearby = clampStatusesToConfirmedCursor(
    [
      { status: 'correct' },
      { status: 'correct' },
      { status: 'pending' },
      { status: 'pending' },
      { status: 'correct' },
      { status: 'correct' },
    ],
    1,
    { keepSettledAhead: true },
  )
  assert.equal(keptNearby[4].status, 'correct', 'a 2-word ASR hole still keeps later greens')
  assert.equal(keptNearby[5].status, 'correct')
}

{
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  assert.match(memorisation, /getRecitationMicrophoneConstraints/)
  assert.match(memorisation, /amdLive:\s*liveRecitation,/)
  assert.doesNotMatch(memorisation, /amdLive:\s*liveRecitation && this\.amdOpen/)
  assert.doesNotMatch(memorisation, /echoCancellation:\s*true/)
}

console.log('amd-both-ends-highlight: ok')
