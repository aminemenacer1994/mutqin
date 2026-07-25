import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimatePracticeDuration,
  formatAboutMinutes,
  buildPostPracticeGuidance,
  normaliseWeakWordRecords,
} from '../../resources/js/scripts/session/sessionPracticeCoach.js'

test('buildLiveSessionGuidance uses technique-specific Islamic cues', async () => {
  const {
    buildLiveSessionGuidance,
    resolveLiveTechniqueGuide,
  } = await import('../../resources/js/scripts/session/sessionPracticeCoach.js')

  const playing = buildLiveSessionGuidance({
    isPlaying: true,
    technique: 'talqin',
    ayahNumber: 3,
  })
  assert.match(playing, /Listen carefully|Āyah 3/i)

  const paused = buildLiveSessionGuidance({
    isPaused: true,
    technique: 'anchor',
  })
  assert.match(paused, /key words|full āyah/i)

  const guide = resolveLiveTechniqueGuide('blur')
  assert.match(guide.label, /Hide the text/i)
  assert.match(guide.hint, /Allah|memory/i)
})

test('estimatePracticeDuration uses audio, speed and repetitions', () => {
  const slow = estimatePracticeDuration({
    audioDurationSeconds: 60,
    playbackSpeed: 0.75,
    repetitions: 4,
    pauseBetweenRepeats: 1.5,
    technique: 'talqin',
    ayahCount: 2,
  })
  const fast = estimatePracticeDuration({
    audioDurationSeconds: 60,
    playbackSpeed: 1.25,
    repetitions: 2,
    pauseBetweenRepeats: 1.5,
    technique: 'focus',
    ayahCount: 2,
  })
  assert.ok(slow.minutes >= 3)
  assert.ok(slow.seconds > fast.seconds)
})

test('formatAboutMinutes is friendly', () => {
  assert.equal(formatAboutMinutes(1), 'About 1 minute')
  assert.equal(formatAboutMinutes(3), 'About 3 minutes')
})

test('buildPostPracticeGuidance never invents ayah numbers without evidence', () => {
  const generic = buildPostPracticeGuidance({ completed: true })
  assert.match(generic, /ready to test|completed/i)
  const focused = buildPostPracticeGuidance({ replayHeavyAyah: 4 })
  assert.match(focused, /4/)
})

test('normaliseWeakWordRecords keeps stable indices', () => {
  const words = normaliseWeakWordRecords([
    { text: 'وَالضُّحَىٰ', wordIndex: 0, ayahNumber: 1, surahId: 93, reason: 'pronunciation' },
    { text: 'وَالضُّحَىٰ', wordIndex: 0, ayahNumber: 1, surahId: 93, reason: 'pronunciation' },
  ])
  assert.equal(words.length, 1)
  assert.equal(words[0].wordIndex, 0)
  assert.equal(words[0].ayahNumber, 1)
})
