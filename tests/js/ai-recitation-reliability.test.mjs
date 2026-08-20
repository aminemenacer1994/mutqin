import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RECITATION_FAILURE_KIND,
  classifyRecitationFailure,
  createRecitationAttemptId,
  isStaleRecitationAttempt,
  validateRecordingBlob,
} from '../../resources/js/scripts/audio/recordingResilience.js'
import {
  RECITATION_RESULT_STATE,
  buildInsufficientAudioResult,
  resolveInsufficientAudioReason,
  resolveRecitationResultState,
  resultStateToLegacyOutcome,
} from '../../resources/js/scripts/recommendations/recitationResultState.js'
import {
  buildDeterministicRecitationResult,
} from '../../resources/js/scripts/engine/recitation_analysis.js'
import {
  applyRecitationTimingBuffer,
  buildRecitationAdaptivePaceContext,
  computeSilenceAutoStopThresholdMs,
  createRecitationPaceObserver,
  estimateRecitationPaceFactor,
  observeRecitationPaceFromRecognition,
  resolveAdaptiveLivePaceParams,
  RECITATION_MIN_SILENCE_STOP_MS,
  RECITATION_MAX_SILENCE_STOP_MS,
} from '../../resources/js/scripts/memorisationDetection/recitationTimingBuffer.js'
import {
  isPaintedLiveStatus,
  isSettledLiveStatus,
  resolveConfirmedWordIndex,
  resolveLivePaceLimit,
} from '../../resources/js/scripts/memorisationDetection/liveCursor.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationSource = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const ikhlas = 'قُلْ هُوَ ٱللَّهُ أَحَدٌ'

function statusMap(result) {
  return Object.fromEntries(
    (result.wordStatuses || []).map((word) => [word.targetWord || word.text, word.status]),
  )
}

function words(entries) {
  return entries.map((entry) => (
    typeof entry === 'string'
      ? { word: entry, confidence: 0.95 }
      : entry
  ))
}

// --- Source contracts: stuck state / cancel / session handoff ---
{
  assert.match(
    memorisationSource,
    /const assessmentExtras = \{[\s\S]*?applyLocalRecitationMasteryFromPostSession\(outcome, assessmentExtras, result\)/,
  )
  assert.doesNotMatch(
    memorisationSource,
    /applyLocalRecitationMasteryFromPostSession\(outcome, extras, result\)/,
  )
  assert.match(memorisationSource, /this\.recitationAttemptId = ''/)
  assert.match(memorisationSource, /cancelledDuringPrepare/)
  assert.match(memorisationSource, /recitationCheckDiscardOnStop = true/)
  assert.match(
    memorisationSource,
    /if \(this\.recitationCheckRecording \|\| this\.recitationCheckPreparing\) \{\s*this\.stopRecitationCheckRecording\(\)/,
  )
  assert.match(memorisationSource, /maybeApplyPostSessionAiAssessmentFromResult\(result\)/)
  assert.match(memorisationSource, /estimateSessionRecitationPaceFactor/)
}

// --- Normal recitation ---
{
  const result = buildDeterministicRecitationResult(
    ikhlas,
    words(['قل', 'هو', 'الله', 'أحد']),
  )
  const map = statusMap(result)
  assert.equal(map['قل'], 'correct')
  assert.equal(map['هو'], 'correct')
  assert.equal(map['الله'], 'correct')
  assert.ok(result.accuracyScore >= 90)
  assert.equal(resolveRecitationResultState(result), RECITATION_RESULT_STATE.STRONG)
  assert.equal(resultStateToLegacyOutcome(RECITATION_RESULT_STATE.STRONG), 'strong')
}

// --- Slow / tajweed-heavy pace ---
{
  const slow = estimateRecitationPaceFactor({
    recognitionWords: [
      { start: 0.0, end: 0.9 },
      { start: 2.4, end: 3.4 },
      { start: 5.2, end: 6.4 },
    ],
  })
  assert.ok(slow > 1.2, 'long gaps imply slower pace')

  const observer = createRecitationPaceObserver()
  observeRecitationPaceFromRecognition(observer, {
    recognitionWords: [
      { start: 0, end: 0.8 },
      { start: 2.0, end: 3.1 },
    ],
    targetUnits: [{ display: 'الۤمۤ' }, { display: 'ذلك' }],
  })
  const pace = buildRecitationAdaptivePaceContext({
    observer,
    recognitionWords: [
      { start: 0, end: 0.8 },
      { start: 2.0, end: 3.1 },
      { start: 4.2, end: 5.4 },
    ],
  })
  assert.ok(pace.paceFactor >= 1)
  const live = resolveAdaptiveLivePaceParams({
    paceFactor: pace.paceFactor,
    tajweedHeavy: true,
  })
  assert.ok(live.dripMs >= 120)
  assert.ok(live.maxWordsPerSecond <= 4.2)

  const silenceMs = computeSilenceAutoStopThresholdMs({
    wordIndex: 0,
    targetUnits: [{ display: 'الۤمۤ', ayahNumber: 1 }],
    paceFactor: 2.2,
  })
  assert.ok(silenceMs >= RECITATION_MIN_SILENCE_STOP_MS)
  assert.ok(silenceMs <= RECITATION_MAX_SILENCE_STOP_MS)
}

// --- Fast-paced recitation ---
{
  const fast = estimateRecitationPaceFactor({
    recognitionWords: [
      { start: 0.0, end: 0.18 },
      { start: 0.2, end: 0.35 },
      { start: 0.38, end: 0.52 },
      { start: 0.55, end: 0.7 },
    ],
  })
  assert.ok(fast < 1, 'tight ASR timings imply faster pace')
  const live = resolveAdaptiveLivePaceParams({ paceFactor: fast })
  assert.ok(live.maxAdvancePerUpdate >= 2, 'fast sessions may advance more than one word per update')
  assert.ok(live.maxWordsPerSecond >= 1.7)

  // Burst brake still caps runaway paint relative to prior cursor.
  const limit = resolveLivePaceLimit({
    spokenWordCount: 8,
    elapsedMs: 900,
    previousConfirmed: 2,
    maxWordsPerSecond: live.maxWordsPerSecond,
    maxAdvancePerUpdate: live.maxAdvancePerUpdate,
    slack: live.slack,
  })
  assert.ok(limit <= 2 + live.maxAdvancePerUpdate)
}

// --- Natural pauses must not paint as omissions during grace ---
{
  const buffered = applyRecitationTimingBuffer(
    [
      { status: 'correct', text: 'قل' },
      { status: 'omitted', text: 'هو' },
      { status: 'pending', text: 'الله' },
    ],
    {
      nowMs: 5000,
      lastSpeechAtMs: 4800,
      confirmedWordIndex: 1,
      recognitionWords: [{ start: 0.1, end: 0.4 }],
      targetUnits: [
        { display: 'قل', ayahNumber: 1 },
        { display: 'هو', ayahNumber: 1 },
        { display: 'الله', ayahNumber: 1 },
      ],
      paceFactor: 1.4,
    },
  )
  assert.equal(buffered[1].status, 'pending', 'omission during pause grace must soften to pending')
  assert.equal(buffered[1].timingBuffered, true)
}

// --- Uncertain STT must not become a definite mistake / freeze the cursor ---
{
  const result = buildDeterministicRecitationResult(ikhlas, words([
    { word: 'قل', confidence: 0.95, start: 0.1, end: 0.3 },
    { word: 'هي', confidence: 0.4, start: 0.35, end: 0.5 },
    { word: 'الله', confidence: 0.9, start: 0.55, end: 0.8 },
    { word: 'أحد', confidence: 0.92, start: 0.85, end: 1.1 },
  ]))
  assert.equal(statusMap(result)['هو'], 'uncertain')
  assert.ok(!(result.mistakes?.incorrect || []).some((item) => item.expected === 'هو'))

  assert.equal(isSettledLiveStatus('uncertain'), true)
  assert.equal(isPaintedLiveStatus('uncertain'), true)
  assert.equal(
    resolveConfirmedWordIndex([
      { status: 'correct' },
      { status: 'uncertain' },
      { status: 'pending' },
    ]),
    2,
    'uncertain recognition must advance the live cursor',
  )
}

{
  // Soft omitted last word is not "heard through end" in Memorisation.js
  assert.match(
    memorisationSource,
    /return \['correct', 'partial', 'incorrect', 'uncertain'\]\.includes\(String\(lastWord\?\.status \|\| ''\)\)/,
  )
}

// --- Failed / insufficient / cancelled semantics ---
{
  const insufficient = buildInsufficientAudioResult({
    reason: 'no_speech',
    durationSeconds: 3,
    noSpeech: true,
  })
  assert.equal(resolveRecitationResultState(insufficient), RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.equal(resultStateToLegacyOutcome(RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO), null)
  assert.ok(insufficient.noSpeech === true || resolveInsufficientAudioReason(insufficient))
  assert.notEqual(resultStateToLegacyOutcome(resolveRecitationResultState(insufficient)), 'weak')

  const mic = classifyRecitationFailure({ name: 'NotAllowedError', message: 'Permission denied' })
  assert.equal(mic.kind, RECITATION_FAILURE_KIND.MICROPHONE)
  assert.equal(mic.retryable, false)

  const timeout = classifyRecitationFailure({ message: 'This is taking longer than expected' })
  assert.equal(timeout.kind, RECITATION_FAILURE_KIND.TIMEOUT)
  assert.equal(timeout.retryable, true)

  const provider = classifyRecitationFailure({ message: 'Speechmatics websocket closed' })
  assert.equal(provider.kind, RECITATION_FAILURE_KIND.PROVIDER)

  const emptyBlob = validateRecordingBlob(null)
  assert.equal(emptyBlob.valid, false)

  const shortBlob = validateRecordingBlob(
    new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }),
    { durationSeconds: 0.4 },
  )
  assert.equal(shortBlob.valid, false)
  assert.equal(shortBlob.reason, 'short_recording')
}

// --- Attempt / cancel identity ---
{
  const first = createRecitationAttemptId()
  const second = createRecitationAttemptId()
  assert.notEqual(first, second)
  assert.equal(isStaleRecitationAttempt(first, first), false)
  assert.equal(isStaleRecitationAttempt(first, second), true)
  // Callers must treat empty active ids as inactive (Memorisation.isActiveRecitationAttempt).
  assert.match(
    memorisationSource,
    /Cleared \/ missing attempt ids must never accept late mic\/onstop\/submit work/,
  )
}

// AI Recite must keep the practised session range (e.g. onboarding 1–3),
// not expand short surahs to full length (Al-Fatiha → 1–7).
{
  assert.doesNotMatch(
    memorisationSource,
    /Ensure AI Recite uses the completed session range[\s\S]{0,400}expandShortSurahSessionRange\(\)/,
    'post-session AI Recite must not expand short-surah ranges',
  )
  assert.doesNotMatch(
    memorisationSource,
    /Keep the practised session window[\s\S]{0,80}expandShortSurahSessionRange\(\)/,
  )
  assert.match(
    memorisationSource,
    /never expand short surahs to full/,
  )
}

// --- Silence auto-stop never waits forever and never cuts instantly ---
{
  const floor = computeSilenceAutoStopThresholdMs({
    wordIndex: 0,
    targetUnits: [{ display: 'قل' }],
    paceFactor: 0.6,
  })
  const ceiling = computeSilenceAutoStopThresholdMs({
    wordIndex: 0,
    targetUnits: [{ display: 'الۤمۤ', ayahNumber: 1 }, { display: 'ذلك', ayahNumber: 2 }],
    paceFactor: 3,
    ayahBounds: [{ start: 0, end: 1 }, { start: 1, end: 2 }],
  })
  assert.equal(floor, RECITATION_MIN_SILENCE_STOP_MS)
  assert.ok(ceiling <= RECITATION_MAX_SILENCE_STOP_MS)
  assert.ok(ceiling >= floor)
}

console.log('AI recitation reliability tests passed')
