import assert from 'node:assert/strict'
import {
  TOOL_STATE,
  COMPACT_VISIBLE_COUNT,
  buildActivePracticeSetup,
  buildCompactPracticeSummary,
  buildAppliedPracticeSetupSnapshot,
  buildPracticeSetupStatusMessage,
  canChangePracticeSetting,
  explainActiveTool,
  collectPracticeSetupInputFromSession,
} from '../../resources/js/scripts/session/activePracticeSetup.js'
import { MISTAKE_HANDLING_MODES } from '../../resources/js/scripts/memorisationDetection/mistakeFeedback.js'
import { PRACTICE_SCOPE } from '../../resources/js/scripts/recommendations/revisionPracticeScope.js'
import { readFileSync } from 'node:fs'

const t = (key, params = {}) => {
  if (key.endsWith('moreCount')) return `+${params.count} more`
  if (key.endsWith('repetitionsValue')) return `${params.count} repetitions`
  if (key.includes('toasts.visibility') && params.value) return `Text reduced to ${params.value} visibility.`
  if (key.endsWith('techniqueOn')) return `${params.label} is now active.`
  if (key.endsWith('recommendedLabel')) return 'Recommended for this session'
  if (key.endsWith('recommendedReasonDefault')) return 'Recommended because this helps the areas that need care.'
  // Unresolved keys return themselves so builders fall back to English defaults.
  return key
}

function baseInput(overrides = {}) {
  return {
    sessionActive: false,
    sessionPaused: false,
    sessionCompleted: false,
    isRecording: false,
    talqinEnabled: true,
    focusEnabled: false,
    blurEnabled: false,
    blurIntensity: 50,
    chainingEnabled: false,
    chainingMethod: 'linking',
    anchorEnabled: false,
    repetitions: 3,
    playbackSpeed: 0.75,
    practiceScope: null,
    mistakeHandlingMode: MISTAKE_HANDLING_MODES.STOP_ON_MISTAKE,
    mistakeSoundEnabled: false,
    autoFollowEnabled: true,
    autoFollowPaused: false,
    aiCheckSurface: false,
    rangeStart: 1,
    rangeEnd: 3,
    surahName: 'Al-Fatihah',
    reciterName: 'Alafasy',
    ...overrides,
  }
}

// Selected vs active states
{
  const setup = buildActivePracticeSetup(baseInput({
    sessionActive: false,
    talqinEnabled: true,
    focusEnabled: true,
  }), t)
  const talqin = setup.items.find((i) => i.id === 'talqin')
  const focus = setup.items.find((i) => i.id === 'focus')
  const blur = setup.items.find((i) => i.id === 'blur')
  assert.equal(talqin.state, TOOL_STATE.SELECTED)
  assert.equal(focus.state, TOOL_STATE.SELECTED)
  assert.equal(blur.state, TOOL_STATE.AVAILABLE)

  const live = buildActivePracticeSetup(baseInput({
    sessionActive: true,
    talqinEnabled: true,
    focusEnabled: true,
  }), t)
  assert.equal(live.items.find((i) => i.id === 'talqin').state, TOOL_STATE.ACTIVE_NOW)
  assert.equal(live.items.find((i) => i.id === 'focus').state, TOOL_STATE.ACTIVE_NOW)
}

// Recommended tool labels
{
  const setup = buildActivePracticeSetup(baseInput({
    focusEnabled: false,
    recommendedTechniqueIds: ['focus'],
    recommendedReasons: {
      focus: 'Recommended because this phrase was missed in two recent checks.',
    },
  }), t)
  const focus = setup.items.find((i) => i.id === 'focus')
  assert.equal(focus.state, TOOL_STATE.RECOMMENDED)
  assert.match(focus.recommendedLabel, /recommended/i)
  assert.match(focus.recommendedReason, /missed in two recent checks/)
}

// Resumed-session restoration snapshot + toast
{
  const setup = buildActivePracticeSetup(baseInput({
    restoredFromResume: true,
    blurEnabled: true,
    blurIntensity: 50,
    sessionActive: true,
  }), t)
  assert.equal(setup.snapshot.restored_from_resume, true)
  assert.equal(setup.snapshot.visibility_percent, 50)
  assert.equal(
    buildPracticeSetupStatusMessage({ type: 'restored' }, t),
    'Restored your previous practice setup.'
  )
}

// Tool changes / disabled during recording
{
  const blocked = canChangePracticeSetting('focus', { isRecording: true, sessionActive: true })
  assert.equal(blocked.allowed, false)
  assert.match(blocked.reason, /reciting/i)

  const allowed = canChangePracticeSetting('auto_follow', { isRecording: true })
  assert.equal(allowed.allowed, true)

  const warn = canChangePracticeSetting('chaining', { sessionActive: true, isRecording: false })
  assert.equal(warn.allowed, true)
  assert.equal(warn.warn, true)
}

// Overflow + empty optional
{
  const rich = buildActivePracticeSetup(baseInput({
    sessionActive: true,
    talqinEnabled: true,
    focusEnabled: true,
    blurEnabled: true,
    chainingEnabled: true,
    anchorEnabled: true,
    practiceScope: PRACTICE_SCOPE.WEAK_AREAS,
  }), t)
  assert.ok(rich.overflowCount >= 1)
  assert.match(rich.overflowLabel, /\+/)
  const compact = buildCompactPracticeSummary(rich, COMPACT_VISIBLE_COUNT)
  assert.equal(compact.items.length, COMPACT_VISIBLE_COUNT)
  assert.ok(compact.overflowCount > 0)

  const empty = buildActivePracticeSetup(baseInput({
    talqinEnabled: false,
    focusEnabled: false,
    blurEnabled: false,
    chainingEnabled: false,
    anchorEnabled: false,
  }), t)
  assert.equal(empty.emptyOptional, true)
  assert.match(empty.emptyLabel, /optional/i)
}

// Persistence snapshot fields
{
  const snap = buildAppliedPracticeSetupSnapshot(baseInput({
    talqinEnabled: true,
    blurEnabled: true,
    blurIntensity: 40,
    practiceScope: PRACTICE_SCOPE.FULL_RANGE,
    weakWordEmphasis: true,
    selectionSource: 'recommended',
    recommendedTechniqueIds: ['blur'],
  }), buildActivePracticeSetup(baseInput({
    talqinEnabled: true,
    blurEnabled: true,
  }), t).items)
  assert.equal(snap.repetitions, 3)
  assert.equal(snap.playback_speed, 0.75)
  assert.equal(snap.visibility_percent, 40)
  assert.equal(snap.practice_scope, PRACTICE_SCOPE.FULL_RANGE)
  assert.equal(snap.mistake_handling_mode, MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW)
  assert.equal(snap.mistake_sound_enabled, false)
  assert.equal(snap.auto_follow_enabled, true)
  assert.equal(snap.selection_source, 'recommended')
  assert.ok(Array.isArray(snap.technique_ids))
}

// Explanations for key tools
{
  assert.match(explainActiveTool({ id: 'blur' }, t), /hiding|blur|Gradual/i)
  assert.match(explainActiveTool({ id: 'focus' }, t), /ayah/i)
  assert.match(explainActiveTool({ id: 'auto_follow' }, t), /eye level|follow/i)
  assert.match(explainActiveTool({ id: 'mistake_pause' }, t), /pause/i)
}

// Confirmation panel
{
  const setup = buildActivePracticeSetup(baseInput({
    playbackSpeed: 0.75,
    repetitions: 3,
    blurEnabled: true,
    blurIntensity: 50,
  }), t)
  assert.match(setup.confirmation.title, /Your session will use/i)
  assert.ok(setup.confirmation.rows.some((row) => row.id === 'playback_speed' && String(row.value).includes('0.75')))
  assert.ok(!setup.confirmation.rows.some((row) => row.id === 'auto_follow'))
  assert.ok(!setup.items.some((item) => item.id === 'auto_follow'))
  assert.ok(!setup.items.some((item) => item.id === 'mistake_handling'))
  assert.ok(!setup.items.some((item) => item.id === 'mistake_sound'))
  assert.ok(!setup.confirmation.rows.some((row) => row.id === 'ai_behaviour'))
  assert.ok(!setup.confirmation.rows.some((row) => row.id === 'mistake_feedback'))
  assert.ok(setup.confirmation.primaryLabel)
  assert.ok(setup.confirmation.secondaryLabel)
}

// collectPracticeSetupInputFromSession mapping
{
  const input = collectPracticeSetupInputFromSession({
    talqinModeEnabled: true,
    focusModeEnabled: false,
    blurModeEnabled: true,
    blurIntensity: 55,
    repetitionsPerStep: 4,
    speed: 1.25,
    amdMistakeSoundEnabled: true,
    amdMistakeHandlingMode: MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW,
    rangeStart: 2,
    rangeEnd: 5,
    centralSession: { sessionStatus: 'active' },
  }, { autoFollowEnabled: false })
  assert.equal(input.talqinEnabled, true)
  assert.equal(input.blurEnabled, true)
  assert.equal(input.repetitions, 4)
  assert.equal(input.playbackSpeed, 1.25)
  assert.equal(input.autoFollowEnabled, false)
  assert.equal(input.sessionActive, true)
}

// Mobile layout wiring + component presence
{
  const vue = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
  const js = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../../resources/js/views/Memorisation.css', import.meta.url), 'utf8')
  assert.doesNotMatch(vue, /ActivePracticeSetupSummary/)
  assert.doesNotMatch(vue, /workspace-active-practice-setup/)
  assert.doesNotMatch(vue, /tools-active-practice-setup/)
  assert.doesNotMatch(vue, /showPreStartPracticeConfirm/)
  assert.match(vue, /practice-setup-status-toast/)
  assert.match(js, /buildActivePracticeSetup/)
  assert.match(js, /appliedPracticeSetup/)
  assert.match(js, /markPracticeSetupRestored/)
  assert.match(js, /guardPracticeSettingChange/)
  assert.doesNotMatch(js, /requestStartSessionWithSetupConfirm/)
  assert.doesNotMatch(js, /confirmStartWithPracticeSetup/)
  assert.match(js, /seedWeakAyahPracticeFocusWordsIfNeeded/)
  assert.match(css, /\.active-practice-setup/)
  assert.match(css, /@media \(max-width: 767\.98px\)/)
}

console.log('active-practice-setup.test.mjs: all assertions passed')
