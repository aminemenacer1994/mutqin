#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { slimSessionQueue, slimSessionQueueItem } from '../../resources/js/scripts/session/slimSessionQueue.js'
import { buildCheckpointPayload } from '../../resources/js/scripts/session/sessionAutosave.js'

const fatVerse = {
  key: '2:255',
  arabic: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ',
  words: Array.from({ length: 40 }, (_, i) => ({ ar: `w${i}`, en: `m${i}` })),
  audio: 'https://example.test/2-255.mp3',
}

{
  const slim = slimSessionQueueItem({
    phase: 'Cumulative',
    verse: fatVerse,
    chainKey: 'cumulative:12',
    sequencePosition: 3,
    sequenceTotal: 12,
    repeatCount: 2,
    totalRepeats: 3,
  })
  assert.equal(slim.ayahId, '2:255')
  assert.equal(slim.phase, 'Cumulative')
  assert.equal(slim.chainKey, 'cumulative:12')
  assert.equal('verse' in slim, false)
  assert.equal('words' in slim, false)
  assert.equal('audio' in slim, false)
}

{
  const queue = slimSessionQueue([
    { ayahId: '2:1', verse: fatVerse, phase: 'Memorise' },
    { ayahId: '2:2', verse: { ...fatVerse, key: '2:2' }, phase: 'Memorise' },
  ])
  assert.equal(queue.length, 2)
  assert.ok(queue.every((item) => !('verse' in item) && item.ayahId))
}

{
  const payload = buildCheckpointPayload({
    sessionId: 7,
    surahNumber: 2,
    ayahNumber: 255,
    currentStep: 0,
    active: true,
    sessionState: {
      queue: [{ ayahId: '2:255', verse: fatVerse, phase: 'Takrar' }],
    },
    nowIso: '2026-09-04T12:00:00.000Z',
  })
  assert.equal(payload.metadata.queue[0].ayahId, '2:255')
  assert.equal('verse' in payload.metadata.queue[0], false)
}

{
  const engine = readFileSync(new URL('../../resources/js/scripts/composables/useSessionEngine.js', import.meta.url), 'utf8')
  const persistence = readFileSync(new URL('../../resources/js/scripts/composables/useMutqinPersistence.js', import.meta.url), 'utf8')
  const quranApis = readFileSync(new URL('../../resources/js/scripts/lib/quranApis.js', import.meta.url), 'utf8')
  assert.match(engine, /slimSessionQueueItem/)
  assert.match(persistence, /slimSessionQueueItem/)
  assert.doesNotMatch(engine, /ayahId: item\.ayahId \|\| verse\?\.key \|\| null,\s*verse,/)
  assert.match(quranApis, /surahEditionCache/)
  assert.match(quranApis, /cachedRequest\(/)
  assert.match(quranApis, /await Promise\.all\(pageNumbers\.map/)
}

console.log('slim-session-queue.test.mjs: ok')
