import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  activeAyahRepeatProgress,
  appendRepeatedSessionEntries,
  countCompletedSessionRepeats,
  resolveSessionAyahRepeatCount,
} from '../../resources/js/scripts/session/sessionRepeatQueue.js'
import { selectCompleteSessionVerseRange } from '../../resources/js/scripts/session/sessionRecitationTargets.js'

const verse = (surah, ayah) => ({ key: `${surah}:${ayah}`, number: ayah, arabic: `ayah ${ayah}` })
const keys = (rows) => rows.map((row) => row.key)

// A finished 2:2–4 session keeps its exact window, even when Mushaf displays
// the whole surrounding page or the playback queue contains repeated entries.
{
  const selected = selectCompleteSessionVerseRange({
    chapterId: 2,
    rangeStart: 2,
    rangeEnd: 4,
    sources: [
      [verse(2, 2), verse(2, 3), verse(2, 4)],
      [verse(2, 1), verse(2, 2), verse(2, 3), verse(2, 4), verse(2, 5)],
    ],
  })
  assert.deepEqual(keys(selected), ['2:2', '2:3', '2:4'])
}

// A page slice may fill a missing verse, but an incomplete range cannot open
// a misleading recall test or fall through to ayahs from an old session.
{
  const config = { chapterId: 2, rangeStart: 2, rangeEnd: 4 }
  assert.deepEqual(keys(selectCompleteSessionVerseRange({
    ...config,
    sources: [[verse(2, 2), verse(2, 3)], [verse(2, 4)]],
  })), ['2:2', '2:3', '2:4'])
  assert.deepEqual(selectCompleteSessionVerseRange({
    ...config,
    sources: [[verse(2, 2), verse(2, 3)]],
  }), [])
  assert.deepEqual(selectCompleteSessionVerseRange({
    ...config,
    sources: [[verse(1, 2), verse(1, 3), verse(1, 4)]],
  }), [])
  assert.deepEqual(keys(selectCompleteSessionVerseRange({
    ...config,
    sources: [[verse(2, 1), verse(2, 2), verse(2, 3), verse(2, 4), verse(2, 5)]],
  })), ['2:2', '2:3', '2:4'])
}

// Playback queue uses the exact number of passes selected for each ayah.
{
  const queue = []
  appendRepeatedSessionEntries(queue, [{ verse: verse(2, 2) }], 5)
  appendRepeatedSessionEntries(queue, [{ verse: verse(2, 3) }], 2)
  assert.deepEqual(queue.map((entry) => entry.verse.key), [
    '2:2', '2:2', '2:2', '2:2', '2:2', '2:3', '2:3',
  ])
  assert.deepEqual(queue.map((entry) => entry.repeatCount), [1, 2, 3, 4, 5, 1, 2])
  assert.deepEqual(queue.map((entry) => entry.totalRepeats), [5, 5, 5, 5, 5, 2, 2])
  assert.deepEqual(activeAyahRepeatProgress({ queue, queueIndex: 0 }), { completed: 0, total: 5 })
  assert.deepEqual(activeAyahRepeatProgress({ queue, queueIndex: 3 }), { completed: 3, total: 5 })
  assert.deepEqual(activeAyahRepeatProgress({ queue, queueIndex: 5 }), { completed: 0, total: 2 })
  assert.deepEqual(activeAyahRepeatProgress({
    queue, queueIndex: 6, queuePlaybackExhausted: true,
  }), { completed: 2, total: 2 })
  assert.equal(countCompletedSessionRepeats({ queue, queueIndex: 0 }), 0)
  assert.equal(countCompletedSessionRepeats({ queue, queueIndex: 5 }), 5)
  assert.equal(countCompletedSessionRepeats({
    queue, queueIndex: 6, queuePlaybackExhausted: true,
  }), 7)
  assert.equal(countCompletedSessionRepeats({
    queue, queueIndex: 5, versePlayCounts: { '2:2': 3 },
  }), 3, 'manual skips are not counted as completed ayah plays')
}

// Linking groups repeat as complete passes; the second pass starts at ayah 1.
{
  const queue = appendRepeatedSessionEntries([], [
    { verse: verse(2, 2), phase: 'Linking', chainKey: 'linking:2:2->2:3' },
    { verse: verse(2, 3), phase: 'Linking', chainKey: 'linking:2:2->2:3' },
  ], 3)
  assert.deepEqual(queue.map((entry) => `${entry.verse.key}:${entry.repeatCount}`), [
    '2:2:1', '2:3:1', '2:2:2', '2:3:2', '2:2:3', '2:3:3',
  ])
  assert.deepEqual(activeAyahRepeatProgress({ queue, queueIndex: 4 }), { completed: 2, total: 3 })
}

// A new manual session after a 3× recommendation gets only its own 2×/4×
// per-ayah playback and its own recall targets.
{
  const queue = []
  const session = {
    chapterId: 3,
    repetitionsPerStep: 2,
    individualAyahRepeatCounts: { '3:3': 4 },
  }
  appendRepeatedSessionEntries(queue, [{ verse: verse(3, 2) }],
    resolveSessionAyahRepeatCount({ ...session, verse: verse(3, 2) }))
  appendRepeatedSessionEntries(queue, [{ verse: verse(3, 3) }],
    resolveSessionAyahRepeatCount({ ...session, verse: verse(3, 3) }))
  assert.deepEqual(queue.map((entry) => entry.verse.key), [
    '3:2', '3:2', '3:3', '3:3', '3:3', '3:3',
  ])
  const targets = selectCompleteSessionVerseRange({
    chapterId: 3,
    rangeStart: 2,
    rangeEnd: 3,
    sources: [queue, [verse(1, 1), verse(1, 2), verse(1, 3), verse(1, 4), verse(1, 5)]],
  })
  assert.deepEqual(keys(targets), ['3:2', '3:3'])
  assert.equal(resolveSessionAyahRepeatCount({
    ...session,
    verse: verse(3, 3),
    chainingEnabled: true,
    chainingRepetitions: 3,
  }), 3, 'chaining uses its own group repeat count')
}

// Guard the component wiring so these behaviors are used by actual playback
// and by AI Recite, rather than only the standalone helpers.
{
  const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  assert.match(source, /appendRepeatedSessionEntries\(q, \[entry\], repetitions\)/)
  assert.match(source, /appendRepeatedSessionEntries\(q, entries, repetitions\)/)
  assert.match(source, /return resolveSessionAyahRepeatCount\(\{/)
  assert.match(source, /sources: \[this\.verses, this\.mushafDisplayVerses\]/)
  assert.match(source, /sources: \[this\.getActiveSessionQueueForCheck\(\)\]/)
  assert.match(source, /this\.recitationCheckPendingTargets = \[\]/)
  assert.match(source, /const repeatValue = `\$\{repeatTotal\}x`/)
  assert.match(source, /activeAyahRepeatProgress\(\{/)
  assert.match(source, /countCompletedSessionRepeats\(\{/)
  assert.doesNotMatch(source, /Math\.max\(\s*numbers\[numbers\.length - 1\]/)
}

console.log('session-repetition-and-recite-scope: ok')
