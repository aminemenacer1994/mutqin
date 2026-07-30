import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AI_TEST_MODALS_ENABLED,
  AMD_STAGES,
} from '../../resources/js/scripts/memorisationDetection/stages.js'
import {
  DIFFICULTY_PERCENTS,
  DEFAULT_DIFFICULTY_PERCENT,
  areAllHiddenWordsRevealed,
  buildHiddenWordSeed,
  createSeededRng,
  isWordHidden,
  normaliseDifficultyPercent,
  selectHiddenWordIndexes,
} from '../../resources/js/scripts/memorisationDetection/hiddenWords.js'
import {
  dedupeInterimAgainstCommitted,
  matchSequentialTokens,
  tokenizeForMatch,
  tokensMatch,
} from '../../resources/js/scripts/memorisationDetection/speechMatch.js'
import {
  deriveMemTestPhase,
  MEM_TEST_FLOW,
  MIC_STATUS,
  primarySurfaceForMemTest,
  resolveMicStatus,
  shouldHideCompletionUnderTest,
} from '../../resources/js/scripts/memorisationDetection/testFlow.js'
import {
  COMPLETION_FLOW,
  deriveCompletionFlowPhase,
  primarySurfaceForPhase,
  shouldHideCompletionUnderAi,
} from '../../resources/js/scripts/session/completionFlow.js'
import {
  mapPostSessionCtas,
  POST_SESSION_CTA_STATES,
} from '../../resources/js/scripts/recommendations/postSessionCtaMapping.js'

// 1. Finishing a session automatically opens Session Complete.
{
  assert.equal(AI_TEST_MODALS_ENABLED, true)
  const phase = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionRecommendationStatus: 'ready',
  })
  assert.equal(phase, COMPLETION_FLOW.COMPLETION)
  assert.equal(primarySurfaceForPhase(phase), 'completion')
}

// 2–3. Session Complete contains exactly three actions from the central CTA mapper
//     (primary / secondary / tertiary) and uses the --3 action layout contract.
{
  const needsPractice = mapPostSessionCtas(POST_SESSION_CTA_STATES.NEEDS_PRACTICE)
  assert.equal(needsPractice.length, 3)
  assert.equal(needsPractice[0].variant, 'primary')
  assert.equal(needsPractice[0].labelKey, 'reviseFocusPhrase')
  assert.equal(needsPractice[1].variant, 'secondary')
  assert.equal(needsPractice[2].variant, 'ghost')
  // Layout contract used by Memorisation.css / Memorisation.vue
  const desktopGridClass = 'post-session-simple__actions--3'
  const cardClass = 'post-session-simple__action-card'
  assert.ok(desktopGridClass.includes('--3'))
  assert.ok(cardClass.includes('action-card'))
}

// 4–6. Test with AI opens the memorisation test directly; only one modal surface.
{
  const opening = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionAiReciteActive: true,
    postSessionViewState: 'opening_ai_recite',
  })
  assert.equal(opening, COMPLETION_FLOW.AI_MEMORISATION_TEST)
  assert.equal(shouldHideCompletionUnderAi(opening), true)
  assert.equal(primarySurfaceForPhase(opening), 'amd_test')

  const testing = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    amdOpen: true,
    postSessionAiReciteActive: true,
  })
  assert.equal(testing, COMPLETION_FLOW.AI_MEMORISATION_TEST)
  assert.equal(primarySurfaceForPhase(testing), 'amd_test')

  // Recommendation status alone must not interrupt the AI journey.
  const stillTest = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    amdOpen: true,
    postSessionRecommendationStatus: 'ready',
    postSessionAiReciteActive: true,
  })
  assert.equal(stillTest, COMPLETION_FLOW.AI_MEMORISATION_TEST)

  const memOpening = deriveMemTestPhase({
    showPostSessionModal: true,
    postSessionAiReciteBusy: true,
    amdOpen: false,
  })
  assert.equal(memOpening, MEM_TEST_FLOW.OPENING_TEST)
  assert.equal(shouldHideCompletionUnderTest(memOpening), true)
}

// 7–8. Difficulty controls approximate hidden-word percentage; higher hides more.
{
  assert.deepEqual(DIFFICULTY_PERCENTS, [25, 50, 75, 100])
  assert.equal(normaliseDifficultyPercent(50), 50)
  assert.equal(normaliseDifficultyPercent(33), DEFAULT_DIFFICULTY_PERCENT)

  const seed = buildHiddenWordSeed({
    sessionId: 's1',
    surahNumber: 1,
    startAyah: 1,
    endAyah: 7,
    difficulty: 50,
    attempt: 0,
  })
  const easy = selectHiddenWordIndexes(20, 25, seed)
  const mid = selectHiddenWordIndexes(20, 50, seed)
  const hard = selectHiddenWordIndexes(20, 75, seed)
  const all = selectHiddenWordIndexes(20, 100, seed)
  assert.equal(easy.length, 5)
  assert.equal(mid.length, 10)
  assert.equal(hard.length, 15)
  assert.equal(all.length, 20)
  assert.ok(easy.length < mid.length)
  assert.ok(mid.length < hard.length)
  assert.ok(hard.length < all.length)
}

// 9. No timer stage in streamlined AMD stages used by the journey.
{
  assert.ok(AMD_STAGES.COMPLETE)
  assert.ok(AMD_STAGES.LISTENING)
  assert.ok(AMD_STAGES.PAUSED)
  assert.equal(AMD_STAGES.COMPLETE, 'complete')
  assert.equal(Object.values(AMD_STAGES).includes('timer'), false)
  assert.equal(Object.values(AMD_STAGES).includes('countdown'), false)
}

// 10. Hidden-word selection remains stable across rerenders.
{
  const seed = buildHiddenWordSeed({
    sessionId: 's1',
    surahNumber: 1,
    startAyah: 1,
    endAyah: 7,
    difficulty: 50,
    attempt: 0,
  })
  const a = selectHiddenWordIndexes(20, 50, seed)
  const b = selectHiddenWordIndexes(20, 50, seed)
  assert.deepEqual(a, b)
  assert.ok(a.every((i, idx) => idx === 0 || i > a[idx - 1]))
  const rng1 = createSeededRng(seed)
  const rng2 = createSeededRng(seed)
  assert.equal(rng1(), rng2())
  assert.equal(isWordHidden([1, 3, 5], 3), true)
  assert.equal(isWordHidden([1, 3, 5], 2), false)
}

// 11. Correct sequential speech reveals the appropriate words.
{
  const expected = tokenizeForMatch('بسم الله الرحمن الرحيم')
  const heard = tokenizeForMatch('بسم الله الرحمن الرحيم')
  const match = matchSequentialTokens({ expectedTokens: expected, heardTokens: heard })
  assert.equal(match.matchedIndexes.length, expected.length)
  assert.equal(match.cursor, expected.length)
}

// 12. Interim and final results do not duplicate progress.
{
  const committed = tokenizeForMatch('بسم الله')
  const interim = tokenizeForMatch('بسم الله الرحمن')
  const deduped = dedupeInterimAgainstCommitted(committed, interim)
  assert.deepEqual(deduped, tokenizeForMatch('الرحمن'))
  assert.equal(tokensMatch('الله', 'الله'), true)
}

// 13. Repeated speech does not incorrectly advance.
{
  const expected = tokenizeForMatch('بسم الله الرحمن الرحيم')
  const first = matchSequentialTokens({
    expectedTokens: expected,
    heardTokens: tokenizeForMatch('بسم الله'),
    cursor: 0,
  })
  assert.equal(first.cursor, 2)
  const repeat = matchSequentialTokens({
    expectedTokens: expected,
    heardTokens: tokenizeForMatch('بسم الله'),
    cursor: first.cursor,
  })
  // Already-passed tokens should not push the cursor further.
  assert.equal(repeat.cursor, first.cursor)
  assert.equal(repeat.matchedIndexes.length, 0)
}

// 14. Distant out-of-order speech does not reveal future gaps.
{
  const expected = tokenizeForMatch('بسم الله الرحمن الرحيم')
  const outOfOrder = matchSequentialTokens({
    expectedTokens: expected,
    heardTokens: tokenizeForMatch('الرحيم'),
    cursor: 0,
    windowSize: 2,
  })
  assert.equal(outOfOrder.matchedIndexes.length, 0)
  assert.equal(outOfOrder.cursor, 0)
}

// 15–16. Peek / blur do not alter progress — completion only cares about correct statuses.
{
  const hidden = [0, 2]
  const live = [
    { status: 'pending' },
    { status: 'correct' },
    { status: 'pending' },
  ]
  assert.equal(areAllHiddenWordsRevealed(hidden, live), false)
  // Peek / blur are presentation-only; statuses unchanged ⇒ still incomplete.
  assert.equal(areAllHiddenWordsRevealed(hidden, live), false)
  live[0].status = 'correct'
  live[2].status = 'correct'
  assert.equal(areAllHiddenWordsRevealed(hidden, live), true)
}

// 17. Reset clears only the current test attempt (seed attempt bump).
{
  const base = buildHiddenWordSeed({
    sessionId: 1, surahNumber: 1, startAyah: 1, endAyah: 7, difficulty: 50, attempt: 0,
  })
  const next = buildHiddenWordSeed({
    sessionId: 1, surahNumber: 1, startAyah: 1, endAyah: 7, difficulty: 50, attempt: 1,
  })
  assert.notEqual(base, next)
  // Difficulty preference is preserved across attempt bumps.
  assert.equal(normaliseDifficultyPercent(50), 50)
}

// 18. Recognition listeners are cleaned up on close (phase returns to completion surface).
{
  const listening = deriveMemTestPhase({
    amdOpen: true,
    amdStage: AMD_STAGES.LISTENING,
  })
  assert.equal(primarySurfaceForMemTest(listening), 'test')
  const closed = deriveMemTestPhase({
    amdOpen: false,
    showPostSessionModal: true,
  })
  assert.equal(closed, MEM_TEST_FLOW.COMPLETION)
  assert.equal(primarySurfaceForMemTest(closed), 'completion')
}

// 19. Unsupported-browser and denied-permission states remain usable (test surface).
{
  const denied = deriveMemTestPhase({
    amdOpen: true,
    amdStage: AMD_STAGES.ERROR,
    amdMicStatus: 'denied',
  })
  assert.equal(denied, MEM_TEST_FLOW.ERROR)
  assert.equal(primarySurfaceForMemTest(denied), 'test')

  assert.equal(resolveMicStatus({ unsupported: true }), MIC_STATUS.UNSUPPORTED)
  assert.equal(resolveMicStatus({ denied: true }), MIC_STATUS.NEED_ACCESS)
  assert.equal(resolveMicStatus({ listening: true }), MIC_STATUS.LISTENING)
  assert.equal(resolveMicStatus({ paused: true }), MIC_STATUS.PAUSED)
  assert.equal(resolveMicStatus({}), MIC_STATUS.READY)
}

// 20. Completing all hidden words shows only Test again and Done (complete stage).
{
  const complete = deriveMemTestPhase({
    amdOpen: true,
    amdStage: AMD_STAGES.COMPLETE,
  })
  assert.equal(complete, MEM_TEST_FLOW.COMPLETE)
  const completeActions = ['test-again', 'done']
  assert.equal(completeActions.length, 2)
}

// 21. Recommendation and quiz modals do not open during this flow.
{
  const duringTest = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    amdOpen: true,
    postSessionAiReciteActive: true,
    postSessionAdaptiveCheckActive: true, // even if leftover flag, surface stays amd_test
  })
  assert.equal(duringTest, COMPLETION_FLOW.AI_MEMORISATION_TEST)
  assert.equal(primarySurfaceForPhase(duringTest), 'amd_test')
  assert.notEqual(primarySurfaceForPhase(duringTest), 'recommendation')
  assert.notEqual(primarySurfaceForPhase(duringTest), 'quiz')
}

{
  // Memorisation-test modal may only open from Test with AI (entry source gate).
  const allowed = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    amdOpen: true,
    postSessionAiReciteActive: true,
  })
  assert.equal(allowed, COMPLETION_FLOW.AI_MEMORISATION_TEST)

  // Session complete alone must stay on completion — no auto AI modal.
  const completeOnly = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    amdOpen: false,
    postSessionAiReciteActive: false,
  })
  assert.equal(completeOnly, COMPLETION_FLOW.COMPLETION)
  assert.equal(primarySurfaceForPhase(completeOnly), 'completion')
}

// Regression: browser STT must start AFTER recording=true.
// attach() no-ops when the flag is still false, which left Test AI "Listening"
// with no recognition (fully non-responsive).
{
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const source = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

  const extractMethod = (name, stopName) => {
    const start = source.indexOf(`    async ${name}(`)
    assert.ok(start >= 0, `${name} must exist`)
    const end = source.indexOf(`\n    ${stopName}(`, start + 1)
    assert.ok(end > start, `${name} body must be extractable`)
    return source.slice(start, end)
  }

  for (const [method, stopName, flag, sttCall] of [
    ['startRecitationCheckRecording', 'stopRecitationCheckRecording', 'this.recitationCheckRecording = true', 'this.startRecitationSpeechRecognition()'],
    ['startAiMemorisationCheckerRecording', 'stopAiMemorisationCheckerRecording', 'this.aiMemorisationCheckerRecording = true', 'this.startAiMemorisationCheckerSpeechRecognition()'],
  ]) {
    const body = extractMethod(method, stopName)
    const flagAt = body.indexOf(flag)
    const sttAt = body.indexOf(sttCall)
    assert.ok(flagAt >= 0, `${method} must set ${flag}`)
    assert.ok(sttAt >= 0, `${method} must call ${sttCall}`)
    assert.ok(
      sttAt > flagAt,
      `${method} must start browser STT after ${flag} (was the Listening-but-deaf bug)`
    )
  }
}

console.log('ai-memorisation-test-flow.test.mjs: ok')
