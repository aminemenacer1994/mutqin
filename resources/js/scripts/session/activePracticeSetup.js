/**
 * Active practice setup — one shared model for session setup, workspace,
 * resume and AI-check surfaces. Derives from existing session flags; does not
 * invent a second configuration store.
 */

import {
  getTechniqueDescription,
  getTechniqueLabel,
  normaliseTechniqueId,
  resolveTechniqueDisplay,
} from '../techniques/techniqueDisplay.js'
import { MISTAKE_HANDLING_MODES } from '../memorisationDetection/mistakeFeedback.js'
import { PRACTICE_SCOPE } from '../recommendations/revisionPracticeScope.js'

export const TOOL_STATE = Object.freeze({
  AVAILABLE: 'available',
  SELECTED: 'selected',
  ACTIVE_NOW: 'active_now',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  RECOMMENDED: 'recommended',
})

export const COMPACT_VISIBLE_COUNT = 3

const STATE_LABEL_FALLBACKS = Object.freeze({
  [TOOL_STATE.AVAILABLE]: 'Available',
  [TOOL_STATE.SELECTED]: 'Selected',
  [TOOL_STATE.ACTIVE_NOW]: 'Active now',
  [TOOL_STATE.PAUSED]: 'Paused',
  [TOOL_STATE.COMPLETED]: 'Completed',
  [TOOL_STATE.RECOMMENDED]: 'Recommended',
})

function translate(t, key, fallback, params = {}) {
  if (typeof t !== 'function') return fallback
  const value = t(key, params)
  if (!value || value === key || String(value).includes(key)) return fallback
  return String(value)
}

function formatSpeed(speed) {
  const n = Number(speed)
  if (!Number.isFinite(n) || n <= 0) return '1×'
  const rounded = Math.round(n * 100) / 100
  return `${rounded}×`
}

function formatVisibility(blurEnabled, blurIntensity, focusDimPercent) {
  if (blurEnabled) {
    const intensity = Math.max(0, Math.min(100, Number(blurIntensity) || 50))
    return `${intensity}%`
  }
  if (Number.isFinite(Number(focusDimPercent))) {
    return `${Math.max(0, Math.min(100, Number(focusDimPercent)))}% dim`
  }
  return null
}

function resolveSessionPhase(input = {}) {
  if (input.sessionCompleted) return 'completed'
  if (input.isRecording) return 'recording'
  if (input.sessionActive) return 'active'
  if (input.sessionPaused) return 'paused'
  return 'setup'
}

function resolveToolState({
  enabled = false,
  sessionPhase = 'setup',
  paused = false,
  recommended = false,
  selected = false,
} = {}) {
  if (paused && enabled) return TOOL_STATE.PAUSED
  if (sessionPhase === 'completed' && enabled) return TOOL_STATE.COMPLETED
  if (enabled && (sessionPhase === 'active' || sessionPhase === 'recording')) {
    return TOOL_STATE.ACTIVE_NOW
  }
  if (enabled || selected) return TOOL_STATE.SELECTED
  if (recommended) return TOOL_STATE.RECOMMENDED
  return TOOL_STATE.AVAILABLE
}

function stateLabel(state, t) {
  return translate(
    t,
    `memorisation.activePracticeSetup.states.${state}`,
    STATE_LABEL_FALLBACKS[state] || state
  )
}

/**
 * Beginner-friendly explanation for an active tool.
 */
export function explainActiveTool(item, t) {
  if (!item) return ''
  const id = String(item.id || '')
  const key = `memorisation.activePracticeSetup.explanations.${id}`
  const fallbacks = {
    talqin: 'Listen and repeat is active. Play the ayah, then recite it yourself.',
    focus: 'One ayah at a time is active. The next ayah unlocks after you finish this one.',
    blur: 'Gradual hiding is active. More words hide after each successful repetition.',
    chaining: 'Join ayat is active. Neighbouring ayahs are linked so the passage flows.',
    linking: 'Ayah pairs are active. Practise each ayah, then join it with the next.',
    cumulative: 'Growing the passage is active. Each step adds one more ayah.',
    anchor: 'Memory-word highlighting is active. Key words stay marked as recall hooks.',
    weak_focus: 'Weak-area focus is active. Practice stays on the words that need care.',
    full_range: 'Full-range revision is active. You will revisit the whole selected range.',
    auto_follow: 'Auto-follow is active. The current line stays near eye level.',
    auto_follow_paused: 'Auto-follow paused because you scrolled manually.',
    mistake_pause: 'Pause on mistake is active. The check pauses after a confirmed mistake.',
    mistake_continue: 'Continue and review is active. Mistakes are noted without stopping you.',
    mistake_sound: 'Mistake sound is on. A soft cue plays when a mistake is confirmed.',
    repetitions: 'You will repeat each step the set number of times.',
    playback_speed: 'Playback speed is set for calm, clear listening.',
    visibility: `Text reduced to ${item.value || 'lower'} visibility.`,
  }
  return translate(t, key, fallbacks[id] || item.description || item.label || '')
}

/**
 * Brief non-blocking status toast copy for contextual tool changes.
 */
export function buildPracticeSetupStatusMessage(change, t) {
  const type = String(change?.type || '')
  const value = change?.value
  const map = {
    visibility: translate(t, 'memorisation.activePracticeSetup.toasts.visibility', `Text reduced to ${value || '50%'} visibility.`, { value: value || '50%' }),
    next_repetition: translate(t, 'memorisation.activePracticeSetup.toasts.nextRepetition', 'Moving to the next repetition.'),
    weak_emphasis: translate(t, 'memorisation.activePracticeSetup.toasts.weakEmphasis', 'Weak-word emphasis is now active.'),
    auto_follow_paused: translate(t, 'memorisation.activePracticeSetup.toasts.autoFollowPaused', 'Auto-follow paused because you scrolled manually.'),
    auto_follow_resumed: translate(t, 'memorisation.activePracticeSetup.toasts.autoFollowResumed', 'Auto-follow is on again.'),
    restored: translate(t, 'memorisation.activePracticeSetup.toasts.restored', 'Restored your previous practice setup.'),
    technique_on: translate(t, 'memorisation.activePracticeSetup.toasts.techniqueOn', '{label} is now active.', { label: change?.label || 'Tool' }),
    technique_off: translate(t, 'memorisation.activePracticeSetup.toasts.techniqueOff', '{label} turned off.', { label: change?.label || 'Tool' }),
  }
  return map[type] || String(change?.message || '')
}

/**
 * Whether a setting may change safely during an active session / recording.
 */
export function canChangePracticeSetting(settingId, context = {}) {
  const id = String(settingId || '')
  const recording = !!context.isRecording
  const active = !!context.sessionActive

  if (recording) {
    const allowedWhileRecording = new Set([
      'auto_follow',
      'mistake_sound',
      'mistake_handling',
    ])
    if (!allowedWhileRecording.has(id)) {
      return {
        allowed: false,
        reason: 'Unavailable while you are reciting. Pause or finish the check first.',
        reasonKey: 'recording',
      }
    }
  }

  if (active) {
    const resetsProgress = new Set(['chaining', 'focus', 'range', 'reciter', 'practice_scope'])
    if (resetsProgress.has(id) && context.warnOnReset !== false) {
      return {
        allowed: true,
        warn: true,
        reason: 'Changing this may restart the current practice phase.',
        reasonKey: 'may_reset',
      }
    }
  }

  return { allowed: true, warn: false, reason: '', reasonKey: '' }
}

/**
 * Build the full active-practice-setup model from live session flags.
 *
 * @param {object} input
 * @param {Function|null} t
 */
export function buildActivePracticeSetup(input = {}, t = null) {
  const sessionPhase = resolveSessionPhase(input)
  const recommendedIds = new Set(
    (Array.isArray(input.recommendedTechniqueIds) ? input.recommendedTechniqueIds : [])
      .map(normaliseTechniqueId)
      .filter(Boolean)
  )
  const recommendedReasons = input.recommendedReasons && typeof input.recommendedReasons === 'object'
    ? input.recommendedReasons
    : {}
  const selectionSource = input.selectionSource === 'recommended' ? 'recommended' : 'manual'

  /** @type {Array<object>} */
  const items = []

  const pushTechnique = (id, enabled, extras = {}) => {
    const display = resolveTechniqueDisplay(id, t)
    const recommended = recommendedIds.has(id) || !!extras.recommended
    const state = resolveToolState({
      enabled,
      selected: enabled,
      recommended: recommended && !enabled,
      paused: !!extras.paused,
      sessionPhase,
    })
    items.push({
      id,
      kind: 'technique',
      icon: extras.icon || 'bi-stars',
      label: display.label || getTechniqueLabel(id, t),
      value: enabled ? translate(t, 'common.on', 'On') : translate(t, 'common.off', 'Off'),
      shortValue: display.shortLabel || display.label,
      state,
      stateLabel: stateLabel(state, t),
      description: display.description || getTechniqueDescription(id, t),
      explanation: explainActiveTool({ id, description: display.description }, t),
      recommended,
      recommendedLabel: recommended
        ? translate(t, 'memorisation.activePracticeSetup.recommendedLabel', 'Recommended for this session')
        : '',
      recommendedReason: recommended
        ? (recommendedReasons[id]
          || translate(
            t,
            'memorisation.activePracticeSetup.recommendedReasonDefault',
            'Recommended because this helps the areas that need care.'
          ))
        : '',
      selectionSource: enabled
        ? (recommended && selectionSource === 'recommended' ? 'recommended' : 'manual')
        : null,
      tooltip: display.description || '',
      canChangeDuringSession: canChangePracticeSetting(id, input),
    })
  }

  // Core techniques — always listed so available vs selected is visible.
  pushTechnique('talqin', !!input.talqinEnabled, { icon: 'bi-earbuds' })
  pushTechnique('focus', !!input.focusEnabled, { icon: 'bi-bullseye' })
  pushTechnique('blur', !!input.blurEnabled, { icon: 'bi-cloud-haze2' })
  if (input.chainingEnabled) {
    const chainingId = input.chainingMethod === 'cumulative' ? 'cumulative' : 'linking'
    pushTechnique(chainingId, true, { icon: 'bi-link-45deg' })
  } else if (recommendedIds.has('chaining') || recommendedIds.has('linking') || recommendedIds.has('cumulative')) {
    pushTechnique('chaining', false, { icon: 'bi-link-45deg', recommended: true })
  } else {
    pushTechnique('chaining', false, { icon: 'bi-link-45deg' })
  }
  pushTechnique('anchor', !!input.anchorEnabled, { icon: 'bi-pin-angle-fill' })

  const reps = Math.max(1, Number(input.repetitions) || 3)
  items.push({
    id: 'repetitions',
    kind: 'setting',
    icon: 'bi-arrow-repeat',
    label: translate(t, 'memorisation.activePracticeSetup.repetitions', 'Repetitions'),
    value: translate(t, 'memorisation.activePracticeSetup.repetitionsValue', '{count} repetitions', { count: reps }),
    shortValue: `${reps}×`,
    state: resolveToolState({ enabled: true, selected: true, sessionPhase }),
    stateLabel: stateLabel(resolveToolState({ enabled: true, selected: true, sessionPhase }), t),
    description: explainActiveTool({ id: 'repetitions' }, t),
    explanation: explainActiveTool({ id: 'repetitions' }, t),
    recommended: false,
    tooltip: translate(t, 'memorisation.activePracticeSetup.tooltips.repetitions', 'How many times each step is repeated.'),
    canChangeDuringSession: canChangePracticeSetting('repetitions', input),
  })

  const speed = formatSpeed(input.playbackSpeed)
  items.push({
    id: 'playback_speed',
    kind: 'setting',
    icon: 'bi-speedometer2',
    label: translate(t, 'memorisation.activePracticeSetup.playbackSpeed', 'Playback speed'),
    value: speed,
    shortValue: speed,
    state: resolveToolState({ enabled: true, selected: true, sessionPhase }),
    stateLabel: stateLabel(resolveToolState({ enabled: true, selected: true, sessionPhase }), t),
    description: explainActiveTool({ id: 'playback_speed' }, t),
    explanation: explainActiveTool({ id: 'playback_speed' }, t),
    recommended: false,
    tooltip: translate(t, 'memorisation.activePracticeSetup.tooltips.playbackSpeed', 'How quickly the reciter plays.'),
    canChangeDuringSession: canChangePracticeSetting('playback_speed', input),
  })

  const visibility = formatVisibility(input.blurEnabled, input.blurIntensity, input.focusDimPercent)
  if (visibility) {
    items.push({
      id: 'visibility',
      kind: 'setting',
      icon: 'bi-eye-slash',
      label: translate(t, 'memorisation.activePracticeSetup.visibility', 'Text visibility'),
      value: visibility,
      shortValue: visibility,
      state: resolveToolState({ enabled: !!input.blurEnabled, selected: true, sessionPhase }),
      stateLabel: stateLabel(resolveToolState({ enabled: !!input.blurEnabled, selected: true, sessionPhase }), t),
      description: explainActiveTool({ id: 'visibility', value: visibility }, t),
      explanation: explainActiveTool({ id: 'visibility', value: visibility }, t),
      recommended: false,
      tooltip: translate(t, 'memorisation.activePracticeSetup.tooltips.visibility', 'How much of the text stays visible while you practise.'),
      canChangeDuringSession: canChangePracticeSetting('blur', input),
    })
  }

  const scope = String(input.practiceScope || '')
  if (scope === PRACTICE_SCOPE.WEAK_AREAS || scope === 'weak_areas') {
    items.push({
      id: 'weak_focus',
      kind: 'scope',
      icon: 'bi-bullseye',
      label: translate(t, 'memorisation.activePracticeSetup.weakFocus', 'Weak-area focus'),
      value: translate(t, 'common.on', 'On'),
      shortValue: translate(t, 'memorisation.activePracticeSetup.weakFocusShort', 'Weak areas'),
      state: resolveToolState({ enabled: true, selected: true, sessionPhase }),
      stateLabel: stateLabel(resolveToolState({ enabled: true, selected: true, sessionPhase }), t),
      description: explainActiveTool({ id: 'weak_focus' }, t),
      explanation: explainActiveTool({ id: 'weak_focus' }, t),
      recommended: !!input.scopeRecommended,
      recommendedLabel: translate(t, 'memorisation.activePracticeSetup.recommendedLabel', 'Recommended for this session'),
      recommendedReason: input.scopeRecommendedReason
        || translate(t, 'memorisation.activePracticeSetup.recommendedReasonWeak', 'Recommended because these words needed more care in recent checks.'),
      tooltip: translate(t, 'memorisation.activePracticeSetup.tooltips.weakFocus', 'Practise only the weaker words and phrases first.'),
      canChangeDuringSession: canChangePracticeSetting('practice_scope', input),
    })
  } else if (scope === PRACTICE_SCOPE.FULL_RANGE || scope === 'full_range') {
    items.push({
      id: 'full_range',
      kind: 'scope',
      icon: 'bi-collection',
      label: translate(t, 'memorisation.activePracticeSetup.fullRange', 'Full-range revision'),
      value: translate(t, 'common.on', 'On'),
      shortValue: translate(t, 'memorisation.activePracticeSetup.fullRangeShort', 'Full range'),
      state: resolveToolState({ enabled: true, selected: true, sessionPhase }),
      stateLabel: stateLabel(resolveToolState({ enabled: true, selected: true, sessionPhase }), t),
      description: explainActiveTool({ id: 'full_range' }, t),
      explanation: explainActiveTool({ id: 'full_range' }, t),
      recommended: !!input.scopeRecommended,
      recommendedLabel: translate(t, 'memorisation.activePracticeSetup.recommendedLabel', 'Recommended for this session'),
      recommendedReason: input.scopeRecommendedReason || '',
      tooltip: translate(t, 'memorisation.activePracticeSetup.tooltips.fullRange', 'Revise the whole selected ayah range.'),
      canChangeDuringSession: canChangePracticeSetting('practice_scope', input),
    })
  }

  const mistakeMode = String(input.mistakeHandlingMode || MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW)
  const mistakePause = mistakeMode === MISTAKE_HANDLING_MODES.STOP_ON_MISTAKE
  items.push({
    id: 'mistake_handling',
    kind: 'ai',
    icon: mistakePause ? 'bi-pause-circle' : 'bi-arrow-repeat',
    label: translate(t, 'memorisation.activePracticeSetup.mistakeHandling', 'Mistake handling'),
    value: mistakePause
      ? translate(t, 'memorisation.activePracticeSetup.mistakePause', 'Pause on mistake')
      : translate(t, 'memorisation.activePracticeSetup.mistakeContinue', 'Continue and review'),
    shortValue: mistakePause
      ? translate(t, 'memorisation.activePracticeSetup.mistakePauseShort', 'Pause')
      : translate(t, 'memorisation.activePracticeSetup.mistakeContinueShort', 'Continue'),
    state: resolveToolState({
      enabled: !!input.aiCheckSurface,
      selected: true,
      sessionPhase: input.aiCheckSurface ? sessionPhase : 'setup',
    }),
    stateLabel: stateLabel(resolveToolState({
      enabled: !!input.aiCheckSurface,
      selected: true,
      sessionPhase: input.aiCheckSurface ? sessionPhase : 'setup',
    }), t),
    description: explainActiveTool({ id: mistakePause ? 'mistake_pause' : 'mistake_continue' }, t),
    explanation: explainActiveTool({ id: mistakePause ? 'mistake_pause' : 'mistake_continue' }, t),
    recommended: false,
    tooltip: translate(t, 'memorisation.activePracticeSetup.tooltips.mistakeHandling', 'What happens when a mistake is confirmed during an AI check.'),
    canChangeDuringSession: canChangePracticeSetting('mistake_handling', input),
  })

  // Auto-follow is always on by default — omit from practice-setup pills.
  const mistakeSoundOn = !!input.mistakeSoundEnabled
  items.push({
    id: 'mistake_sound',
    kind: 'ai',
    icon: mistakeSoundOn ? 'bi-volume-up' : 'bi-volume-mute',
    label: translate(t, 'memorisation.activePracticeSetup.mistakeSound', 'Mistake sound'),
    value: mistakeSoundOn ? translate(t, 'common.on', 'On') : translate(t, 'common.off', 'Off'),
    shortValue: mistakeSoundOn ? translate(t, 'common.on', 'On') : translate(t, 'common.off', 'Off'),
    state: resolveToolState({
      enabled: mistakeSoundOn,
      selected: true,
      sessionPhase: input.aiCheckSurface ? sessionPhase : 'setup',
    }),
    stateLabel: stateLabel(resolveToolState({
      enabled: mistakeSoundOn,
      selected: true,
      sessionPhase: input.aiCheckSurface ? sessionPhase : 'setup',
    }), t),
    description: explainActiveTool({ id: 'mistake_sound' }, t),
    explanation: explainActiveTool({ id: 'mistake_sound' }, t),
    recommended: false,
    tooltip: translate(t, 'memorisation.activePracticeSetup.tooltips.mistakeSound', 'Soft sound when a mistake is confirmed.'),
    canChangeDuringSession: canChangePracticeSetting('mistake_sound', input),
  })

  const activeOrSelected = items.filter((item) => (
    item.state === TOOL_STATE.ACTIVE_NOW
    || item.state === TOOL_STATE.SELECTED
    || item.state === TOOL_STATE.PAUSED
    || item.state === TOOL_STATE.COMPLETED
  ))

  // Compact summary prefers techniques/settings the learner cares about most.
  const compactPriority = ['talqin', 'focus', 'blur', 'repetitions', 'playback_speed', 'visibility', 'weak_focus', 'full_range', 'chaining', 'linking', 'cumulative', 'anchor', 'mistake_handling', 'mistake_sound']
  const ranked = [...activeOrSelected].sort((a, b) => {
    const ai = compactPriority.indexOf(a.id)
    const bi = compactPriority.indexOf(b.id)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const compactItems = ranked.slice(0, COMPACT_VISIBLE_COUNT)
  const overflowCount = Math.max(0, ranked.length - compactItems.length)

  const optionalActive = activeOrSelected.filter((item) => item.kind === 'technique' || item.kind === 'scope')
  const emptyOptional = optionalActive.length === 0

  const confirmation = buildSessionConfirmationPanel(input, items, t)

  return {
    title: translate(t, 'memorisation.activePracticeSetup.title', 'Active practice setup'),
    sessionPhase,
    items,
    compactItems,
    overflowCount,
    overflowLabel: overflowCount > 0
      ? translate(t, 'memorisation.activePracticeSetup.moreCount', '+{count} more', { count: overflowCount })
      : '',
    emptyOptional,
    emptyLabel: translate(
      t,
      'memorisation.activePracticeSetup.emptyOptional',
      'No optional tools selected — listening and repetition only.'
    ),
    confirmation,
    snapshot: buildAppliedPracticeSetupSnapshot(input, items),
    explanations: activeOrSelected
      .filter((item) => item.state === TOOL_STATE.ACTIVE_NOW || item.state === TOOL_STATE.PAUSED)
      .map((item) => item.explanation)
      .filter(Boolean),
  }
}

export function buildSessionConfirmationPanel(input = {}, items = [], t = null) {
  const start = Math.max(1, Number(input.rangeStart) || 1)
  const end = Math.max(start, Number(input.rangeEnd) || start)
  const rangeLabel = start === end ? `Ayah ${start}` : `Ayahs ${start}–${end}`
  const techniqueItems = items.filter((item) => (
    item.kind === 'technique'
    && (item.state === TOOL_STATE.SELECTED || item.state === TOOL_STATE.ACTIVE_NOW || item.state === TOOL_STATE.RECOMMENDED)
  ))

  const rows = [
    {
      id: 'range',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.range', 'Selected range'),
      value: input.rangeLabel || `${input.surahName || 'Surah'} · ${rangeLabel}`,
    },
    {
      id: 'reciter',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.reciter', 'Reciter'),
      value: input.reciterName || 'Alafasy',
    },
    {
      id: 'repetitions',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.repetitions', 'Repetition count'),
      value: String(Math.max(1, Number(input.repetitions) || 3)),
    },
    {
      id: 'playback_speed',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.playbackSpeed', 'Playback speed'),
      value: formatSpeed(input.playbackSpeed),
    },
    {
      id: 'technique',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.technique', 'Memorisation technique'),
      value: techniqueItems.length
        ? techniqueItems.map((item) => item.label).join(', ')
        : translate(t, 'memorisation.activePracticeSetup.confirm.techniqueNone', 'Listen and repeat (default)'),
    },
    {
      id: 'visibility',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.visibility', 'Text visibility'),
      value: formatVisibility(input.blurEnabled, input.blurIntensity, input.focusDimPercent)
        || translate(t, 'memorisation.activePracticeSetup.confirm.visibilityFull', 'Full text visible'),
    },
    {
      id: 'ai_behaviour',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.aiBehaviour', 'AI-check behaviour'),
      value: String(input.mistakeHandlingMode || MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW) === MISTAKE_HANDLING_MODES.STOP_ON_MISTAKE
        ? translate(t, 'memorisation.activePracticeSetup.mistakePause', 'Pause on mistake')
        : translate(t, 'memorisation.activePracticeSetup.mistakeContinue', 'Continue and review'),
    },
    {
      id: 'mistake_feedback',
      label: translate(t, 'memorisation.activePracticeSetup.confirm.mistakeFeedback', 'Mistake feedback'),
      value: input.mistakeSoundEnabled
        ? translate(t, 'memorisation.activePracticeSetup.confirm.mistakeSoundOn', 'Soft sound on')
        : translate(t, 'memorisation.activePracticeSetup.confirm.mistakeSoundOff', 'Sound off'),
    },
  ]

  return {
    title: translate(t, 'memorisation.activePracticeSetup.confirm.title', 'Your session will use'),
    rows,
    primaryLabel: translate(t, 'memorisation.activePracticeSetup.confirm.primary', 'Start with these settings'),
    secondaryLabel: translate(t, 'memorisation.activePracticeSetup.confirm.secondary', 'Adjust tools'),
  }
}

/**
 * Exact applied configuration for session + AI attempt persistence.
 */
export function buildAppliedPracticeSetupSnapshot(input = {}, items = []) {
  const activeTechniqueIds = items
    .filter((item) => item.kind === 'technique' && (
      item.state === TOOL_STATE.SELECTED
      || item.state === TOOL_STATE.ACTIVE_NOW
      || item.state === TOOL_STATE.PAUSED
      || item.state === TOOL_STATE.COMPLETED
    ))
    .map((item) => item.id)

  return {
    technique_ids: activeTechniqueIds,
    primary_technique: activeTechniqueIds[0] || (input.talqinEnabled ? 'talqin' : null),
    repetitions: Math.max(1, Number(input.repetitions) || 3),
    playback_speed: Number(input.playbackSpeed) || 1,
    visibility_percent: input.blurEnabled
      ? Math.max(0, Math.min(100, Number(input.blurIntensity) || 50))
      : 100,
    blur_enabled: !!input.blurEnabled,
    focus_enabled: !!input.focusEnabled,
    talqin_enabled: !!input.talqinEnabled,
    chaining_enabled: !!input.chainingEnabled,
    chaining_method: input.chainingMethod || null,
    anchor_enabled: !!input.anchorEnabled,
    practice_scope: input.practiceScope || null,
    mistake_handling_mode: input.mistakeHandlingMode || MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW,
    mistake_sound_enabled: !!input.mistakeSoundEnabled,
    auto_follow_enabled: !!input.autoFollowEnabled,
    auto_follow_paused: !!input.autoFollowPaused,
    weak_word_emphasis: !!input.weakWordEmphasis,
    selection_source: input.selectionSource === 'recommended' ? 'recommended' : 'manual',
    recommended_technique_ids: Array.isArray(input.recommendedTechniqueIds)
      ? input.recommendedTechniqueIds.map(normaliseTechniqueId).filter(Boolean)
      : [],
    restored_from_resume: !!input.restoredFromResume,
    captured_at: new Date().toISOString(),
  }
}

/**
 * Map Vue/session component state into the builder input shape.
 */
export function collectPracticeSetupInputFromSession(vm = {}, extras = {}) {
  const config = vm.sessionConfig || {}
  return {
    sessionActive: !!(vm.isSessionActive || vm.centralSession?.sessionStatus === 'active' || extras.sessionActive),
    sessionPaused: !!(vm.sessionPaused || vm.centralSession?.sessionStatus === 'paused' || extras.sessionPaused),
    sessionCompleted: !!(vm.sessionCompleted || extras.sessionCompleted),
    isRecording: !!(vm.isSelfCheckRecording || vm.recitationCheckRecording || extras.isRecording),
    talqinEnabled: !!(vm.talqinModeEnabled ?? config.talqinModeEnabled),
    focusEnabled: !!(vm.focusModeEnabled ?? config.focusModeEnabled),
    blurEnabled: !!(vm.blurModeEnabled ?? config.blurModeEnabled),
    blurIntensity: Number(vm.blurIntensity ?? config.blurIntensity ?? 50),
    focusDimPercent: Number(vm.focusDimPercent ?? config.focusDimPercent ?? 0),
    chainingEnabled: !!(vm.chainingEnabled ?? config.chainingEnabled),
    chainingMethod: vm.chainingMethod || config.chainingMethod || 'linking',
    anchorEnabled: !!(vm.anchorModeEnabled ?? config.anchorModeEnabled),
    repetitions: Number(vm.repetitionsPerStep ?? config.repetitionsPerStep ?? 3),
    playbackSpeed: Number(vm.speed ?? config.speed ?? 1),
    practiceScope: extras.practiceScope
      || vm.activeMemorisationPlan?.practiceScope
      || vm.postSessionRecommendation?.settings?.practice_scope
      || null,
    scopeRecommended: !!extras.scopeRecommended,
    scopeRecommendedReason: extras.scopeRecommendedReason || '',
    mistakeHandlingMode: vm.amdMistakeHandlingMode || MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW,
    mistakeSoundEnabled: vm.amdMistakeSoundEnabled !== false,
    autoFollowEnabled: extras.autoFollowEnabled !== undefined
      ? !!extras.autoFollowEnabled
      : true,
    autoFollowPaused: !!extras.autoFollowPaused,
    aiCheckSurface: !!extras.aiCheckSurface,
    weakWordEmphasis: !!(vm.practiceFocusWeakWords?.length || extras.weakWordEmphasis),
    recommendedTechniqueIds: extras.recommendedTechniqueIds
      || vm.activeMemorisationPlan?.techniqueIds
      || [],
    recommendedReasons: extras.recommendedReasons || {},
    selectionSource: extras.selectionSource
      || (vm.activeMemorisationPlan?.status === 'applied' ? 'recommended' : 'manual'),
    restoredFromResume: !!extras.restoredFromResume,
    rangeStart: Number(vm.rangeStart ?? config.rangeStart ?? 1),
    rangeEnd: Number(vm.rangeEnd ?? config.rangeEnd ?? 1),
    surahName: extras.surahName || '',
    rangeLabel: extras.rangeLabel || '',
    reciterName: extras.reciterName || '',
    warnOnReset: extras.warnOnReset,
  }
}

/**
 * Compact list helpers for overflow UI tests.
 */
export function buildCompactPracticeSummary(setup, visibleCount = COMPACT_VISIBLE_COUNT) {
  const items = Array.isArray(setup?.compactItems) ? setup.compactItems : []
  const all = Array.isArray(setup?.items)
    ? setup.items.filter((item) => (
      item.state === TOOL_STATE.ACTIVE_NOW
      || item.state === TOOL_STATE.SELECTED
      || item.state === TOOL_STATE.PAUSED
      || item.state === TOOL_STATE.COMPLETED
    ))
    : items
  const compact = (items.length ? items : all).slice(0, visibleCount)
  const overflow = Math.max(0, all.length - compact.length)
  return {
    items: compact,
    overflowCount: overflow,
    overflowLabel: overflow > 0 ? `+${overflow} more` : '',
    empty: all.length === 0,
  }
}
