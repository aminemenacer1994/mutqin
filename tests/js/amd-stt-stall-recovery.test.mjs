import assert from 'node:assert/strict'
import {
  AMD_STT_STALL,
  evaluateAmdSttStall,
  resolveAmdRecordingPillLabel,
  resolveLiveAlignmentWords,
  shouldShowAmdSttStallNotice,
} from '../../resources/js/scripts/memorisationDetection/sttStallRecovery.js'

// Natural pause: idle recognition but no speech → never tear down STT.
{
  const decision = evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS + 5000,
    providerOpen: true,
    recentSpeech: false,
    speechConfirmTicks: 0,
  })
  assert.equal(decision.action, 'none')
  assert.equal(decision.nextSpeechConfirmTicks, 0)
}

// Prior progress must not keep a zombie open socket "healthy" forever.
{
  const first = evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS + 1000,
    providerOpen: true,
    recentSpeech: true,
    speechConfirmTicks: 0,
  })
  assert.equal(first.action, 'wait_speech_confirm')
  assert.equal(first.nextSpeechConfirmTicks, 1)

  const second = evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS + 3000,
    providerOpen: true,
    recentSpeech: true,
    speechConfirmTicks: first.nextSpeechConfirmTicks,
  })
  assert.equal(second.action, 'reconnect_or_failover')
  assert.equal(second.nextSpeechConfirmTicks, 0)
}

// Recent committed finals — do not reconnect while utterance batches land.
{
  const decision = evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS + 5000,
    providerOpen: true,
    recentSpeech: true,
    speechConfirmTicks: 2,
    recentCommittedMs: 4000,
  })
  assert.equal(decision.action, 'none')
}

// Closed provider while Recording → start browser STT.
{
  const decision = evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS + 1,
    providerOpen: false,
    recentSpeech: false,
  })
  assert.equal(decision.action, 'start_browser_stt')
}

// Recovery in flight / browser STT already active → no thrash.
{
  assert.equal(evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS + 1,
    providerOpen: true,
    recentSpeech: true,
    recovering: true,
  }).action, 'none')
  assert.equal(evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS + 1,
    providerOpen: false,
    browserSttActive: true,
  }).action, 'none')
}

// Below idle threshold → stay put even with speech.
{
  const decision = evaluateAmdSttStall({
    idleRecognitionMs: AMD_STT_STALL.IDLE_MS - 1,
    providerOpen: true,
    recentSpeech: true,
  })
  assert.equal(decision.action, 'none')
  assert.equal(decision.nextSpeechConfirmTicks, 0)
}

// Unreliable diarization must not empty the live word stream.
{
  const previous = [{ word: 'بسم' }, { word: 'الله' }]
  const kept = resolveLiveAlignmentWords({
    selection: { reliable: false, words: [] },
    rawWords: [{ word: 'بسم' }, { word: 'الله' }, { word: 'الرحمن' }],
    previousWords: previous,
  })
  assert.deepEqual(kept, previous)

  const rawFallback = resolveLiveAlignmentWords({
    selection: { reliable: false, words: [] },
    rawWords: [{ word: 'الحمد' }],
    previousWords: [],
  })
  assert.equal(rawFallback[0].word, 'الحمد')

  const reliable = resolveLiveAlignmentWords({
    selection: { reliable: true, words: [{ word: 'فقط' }] },
    rawWords: [{ word: 'ignored' }],
    previousWords: previous,
  })
  assert.equal(reliable[0].word, 'فقط')
}

// Silent recovery is a product bug: the pill must leave "Recording".
{
  assert.equal(shouldShowAmdSttStallNotice({ recovering: true }), true)
  assert.equal(shouldShowAmdSttStallNotice({ stallNotice: true }), true)
  assert.equal(shouldShowAmdSttStallNotice({ speechConfirmTicks: 1 }), true)
  assert.equal(shouldShowAmdSttStallNotice({ action: 'wait_speech_confirm' }), true)
  assert.equal(shouldShowAmdSttStallNotice({ action: 'reconnect_or_failover' }), true)
  assert.equal(shouldShowAmdSttStallNotice({}), false)
  assert.equal(
    resolveAmdRecordingPillLabel({ recovering: true, reconnectingLabel: 'Catching up…' }),
    'Catching up…',
  )
  assert.equal(
    resolveAmdRecordingPillLabel({ recordingLabel: 'Recording' }),
    'Recording',
  )
}

console.log('amd-stt-stall-recovery: ok')
