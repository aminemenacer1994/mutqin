import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Memorisation's code is split across four files for readability:
//   - Memorisation.vue         markup (template) + <script src>/<style src> refs
//   - Memorisation.js          the reactive component (options object)
//   - Memorisation.css         the (non-scoped) styles
//   - scripts/memorisationRuntime.js  framework-agnostic constants + helpers
// This guard asserts on all of them, so read them together as the full source.
const source = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
  + '\n'
  + readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  + '\n'
  + readFileSync(new URL('../../resources/js/views/Memorisation.css', import.meta.url), 'utf8')
  + '\n'
  + readFileSync(new URL('../../resources/js/scripts/memorisationRuntime.js', import.meta.url), 'utf8')
const hifzPlanModalSource = readFileSync(new URL('../../resources/js/components/HifzPlanCreatorModal.vue', import.meta.url), 'utf8')

const memorisationDataBlock = (() => {
  const match = source.match(/data\(\)\s*\{\s*return\s*\{([\s\S]*?)\n\s*}\s*\n\s*},\n\s*computed:/)
  assert.ok(match, 'memorisation data block not found')
  return match[1]
})()

function includesAll(label, patterns) {
  for (const pattern of patterns) {
    assert.match(source, pattern, `${label}: missing ${pattern}`)
  }
}

includesAll('offcanvas to workspace link', [
  /aria-controls="memorisationToolsPanel"/,
  /id="memorisationToolsPanel"/,
  /ref="toolsPanel"/,
  /id="memorisationWorkspaceMain"/,
  /ref="workspaceMain"/,
  /scrollToWorkspaceMain\(\)/
])

includesAll('session setup controls', [
  /<select :value="chapterId" @change="onChapterChange"/,
  /v-model\.number="rangeStart" @change="adjustRange"/,
  /v-model\.number="rangeEnd" @change="adjustRange"/,
  /<select v-model="reciterId" @change="refreshVerses"/,
  /@change="setPlaybackSpeed\(option\)"/,
  /value="auto" v-model="playMode"/,
  /value="manual" v-model="playMode"/,
  /t\('memorisation\.delay_between_recitations_secs'\)/,
  /<select v-model\.number="delay" class="select">/,
  /option in delayOptions/
])

includesAll('technique controls', [
  /:aria-label="t\('memorisation\.a11y\.useFocusMode'\)" @click="toggleFocusModeRadio"/,
  /:aria-pressed="focusModeEnabled \? 'true' : 'false'"/,
  /:aria-label="t\('memorisation\.a11y\.useBlurMode'\)" @click="toggleBlurModeRadio"/,
  /:aria-pressed="blurModeEnabled \? 'true' : 'false'"/,
  /v-model\.number="blurIntensity"/,
  /:aria-label="t\('memorisation\.a11y\.useChaining'\)" @click="toggleChainingRadio"/,
  /:aria-pressed="chainingEnabled \? 'true' : 'false'"/,
  /:aria-label="t\('memorisation\.a11y\.useAnchorMode'\)" @click="toggleAnchorModeRadio"/,
  /:aria-pressed="anchorModeEnabled \? 'true' : 'false'"/,
  /v-model\.number="focusDimPercent"/,
  /cycleQuranFontPill\(\)/,
  /@change="setChainingMethod\('linking'\)"/,
  /@change="setChainingMethod\('cumulative'\)"/,
  /@input="setChainingRepetitions\(Number\(\$event\.target\.value\)\)"/,
  /activePracticeTechniques\(\)/,
  /active-techniques-count/,
  /toggleFocusModeRadio\(\)/,
  /toggleBlurModeRadio\(\)/,
  /toggleChainingRadio\(\)/,
  /toggleAnchorModeRadio\(\)/,
  /setAnchorMode\(enabled\)/,
  /phase: 'Linking'/,
  /phase: 'Cumulative'/
])

includesAll('reading settings controls', [
  /v-model\.number="defaultFontSize"/,
  /@input="updateDefaultFontSize"/,
  /@click="toggleReadingOption\('translation'\)"/,
  /@click="toggleReadingOption\('transliteration'\)"/,
  /@click="toggleReadingOption\('wbw'\)"/,
  /Word Audio: always enabled/,
  /applySettingsChanges\(\{ silent: true \}\)/,
  /syncSettingsDraft\(\)/,
  /toggleSettingsOption\(key\)/,
  /updateSettingsValue\(key, value\)/
])

const onboardingStepsBlock = (() => {
  const match = source.match(/onboardingSteps\(\)\s*\{([\s\S]*?)\n\s*\},/)
  assert.ok(match, 'onboardingSteps computed not found')
  return match[1]
})()

assert.equal((onboardingStepsBlock.match(/buildOnboardingStep/g) || []).length, 1, 'onboarding must build steps from locale keys')

includesAll('onboarding system steps', [
  /memorisation\.onboarding\.steps\.\$\{key\}/,
  /buildOnboardingStep\(key, icon\)/,
  /key: 'setup'/,
  /key: 'reading'/,
  /key: 'practice'/,
  /key: 'review'/
])

assert.doesNotMatch(
  onboardingStepsBlock,
  /Choose your start|Set your first goal|Start learning/,
  'old onboarding copy should be removed'
)

includesAll('tajweed independence', [
  /:title="t\('memorisation\.a11y\.showTajweedText'\)" @click="toggleTajweed"/,
  /if \(this\.tajweedEnabled && verse\.arabic_tajweed\) \{\s*return this\.renderWordLevelTajweedMarkup\(verse,\s*\{\s*wrapWords: this\.wordByWordAudioEnabled \|\| this\.showWordByWord \|\| this\.anchorModeEnabled\s*\}\s*\)\s*\}/s,
  /if \(this\.selfCheckTajweedEnabled && verse\.arabic_tajweed\) \{\s*return this\.renderWordLevelTajweedMarkup\(verse\)\s*\}/s,
  /else if \(this\.aiMemorisationCheckerTajweedEnabled && liveVerse\.arabic_tajweed\) \{\s*html = this\.renderWordLevelTajweedMarkup\(liveVerse\)\s*\}/s,
  /if \(this\.showWordByWord \|\| this\.anchorModeEnabled \|\| this\.wordByWordAudioEnabled\) \{\s*return this\.splitArabicIntoWords\(verse\)\s*\}/s,
  /renderWordLevelTajweedMarkup\(verse = \{\}, options = \{\}\) \{/,
  /const className = \['tajweed-word', tajweedClass\]\.filter\(Boolean\)\.join\(' '\)/,
  /\.session-evaluation-ayah \.tajweed-mark,[\s\S]*display: contents !important;/,
  /toggleTajweed\(\) \{/,
  /this\.tajweedEnabled = !this\.tajweedEnabled/,
  /this\.showBanner\(\s*this\.tajweedEnabled \? 'Tajweed text enabled' : 'Tajweed text disabled'/s
])

includesAll('arabic grapheme safety', [
  /function splitArabicGraphemes\(text\) \{/,
  /splitArabicGraphemes\(node\.textContent \|\| ''\)\.map\(char => \(\{/,
  /splitArabicGraphemes\(this\.normalizeArabicForRecitation\(word\)\)\.filter\(char => this\.isArabicBaseLetterForTajweed\(char\)\)/
])

includesAll('workspace application', [
  /v-if="showTransliteration && verse\.transliteration"/,
  /v-if="showTranslation && verse\.translation"/,
  /v-if="showWordByWord && verse\.words && verse\.words\.length"/,
  /v-if="word\.audio"/,
  /'--verse-font-percent': getVerseFontSize\(verse\.key\)/,
  /'focus-mode-active': focusModeEnabled/,
  /'blur-mode-active': blurModeEnabled/,
  /'blur-upcoming': blurModeEnabled && isVerseBlurred\(verse\.key\)/
])

for (const key of ['verses', 'activeKey', 'queue', 'queueIndex', 'playMode', 'recitationWindowSeconds', 'speed', 'delay', 'order']) {
  assert.doesNotMatch(
    memorisationDataBlock,
    new RegExp(`^\\s*${key}:`, 'm'),
    `data() should not shadow computed store proxy "${key}"`
  )
}

includesAll('offcanvas main-card linkage', [
  /topCardAppliedPills\(\) \{\s*return \[\]\s*\}/s,
  /reviewPriorityLabel\(\) \{\s*return ''\s*\}/s,
  /this\.syncSettingsDraft\(\)\s*this\.persistUiState\(\)/,
  /toggleTajweed\(\) \{\s*this\.tajweedEnabled = !this\.tajweedEnabled\s*this\.syncSettingsDraft\(\)/s,
  /selectFont\(fontValue\) \{\s*this\.quranFont = fontValue\s*this\.fontDropdownOpen = false\s*this\.syncSettingsDraft\(\)/s,
  /updateDefaultFontSize\(\) \{[\s\S]*this\.syncSettingsDraft\(\)/,
  /class="workspace-header-view-controls quick-right-controls"/
])

includesAll('ai recitation speechmatics stability', [
  /const RECITATION_LIVE_INTERIM_CONFIDENCE_THRESHOLD = 0/,
  /confidence: Number\.isFinite\(confidence\) \? confidence : \(isPartial \? SPEECHMATICS_PARTIAL_CONFIDENCE : 1\)/,
  /const words = extractSpeechmaticsTranscriptWords\(message, \{ isPartial: !isFinal \}\)/,
  /const transcript = String\(message\?\.metadata\?\.transcript \|\| ''\)\.trim\(\) \|\| words\.map\(item => item\.word\)\.join\(' '\)/,
  /const displayWords = getRecognitionDisplayWords\(state\)/,
  /displayWords: Array\.isArray\(displayWords\) && displayWords\.length \? displayWords : committedWords/,
  /const liveAlignmentOptions = \{\s*strictProgression: true,/,
  /const verseSelector = `\[data-verse-key="\$\{this\.escapeCssAttributeValue\(patch\.verseKey\)\}"\]\[data-word-index="\$\{Number\(patch\.localIndex\)\}"\]`/,
  /class="verse-inline-action-btn verse-inline-play-btn"/,
])

// Download control may live in CSS/layout helpers; do not require obsolete Vue class wiring.
assert.match(source, /verse-inline-download-btn/, 'verse inline download styles/helpers should remain available')

includesAll('ai recitation full-session recording', [
  /getActiveSessionQueueForCheck\(\)/,
  /buildSelectedSessionRangeCheckTargets\(\)/,
  /dedupeSessionCheckTargets\(targets = \[\]\)/,
  /resolveSessionQueueTarget\(queueItem = null, sessionIndex = 0\)/,
  /sessionTargetKey: `\$\{ayahKey\}::\$\{sessionIndex\}`/,
  /syncSessionEvaluationMaps\(kind = 'recitation', targetVerses = \[\], wordStatuses = \[\], finalised = false\)/,
  /isSessionRecitationCheckActive\(\)/,
  /shouldAutoStopRecitationCheckFromAlignment\(alignment = null\)/,
  /shouldAutoStopRecitationCheckFromSilence\(\)/,
  /hasRecitationCheckHeardThroughEnd\(kind = 'recitation'\)/,
  /commitPendingRecognitionInterim\(kind = 'recitation'\)/,
  /getBestRecognitionWordsForAssessment\(kind = 'recitation'\)/,
  /if \(this\.recitationCheckScope === 'session' && this\.recitationCheckPendingTargets\?\.length\) return this\.recitationCheckPendingTargets/,
  /if \(!this\.hasRecitationCheckHeardThroughEnd\('recitation'\) && !this\.recitationAlignmentState\?\.complete\) \{\s*return false\s*\}/s,
  /if \(!this\.isSessionRecitationCheckActive\(\)\) return true\s*return !!this\.recitationAlignmentState\?\.complete/s
])

includesAll('session exit confirmation modal', [
  /class="session-exit-actions-layout"/,
  /session-exit-actions-secondary/,
  /session-exit-action-chip/,
  /session-exit-action-chip--end/,
  /mutqin-modal-btn--destructive/,
  /mutqin-modal-btn--secondary/,
  /mutqin-btn--destructive/,
  /session-exit-progress-summary/,
  /keepPractisingFromExitModal/,
  /confirmEndSessionFromExitModal/,
  /pauseSessionFromPrimaryAction/,
  /PRIMARY_SESSION_ACTION\.PAUSE_SESSION/,
])

assert.doesNotMatch(
  source,
  /session-exit-action-chip--continue/,
  'exit confirm must not use the legacy green continue chip override'
)

assert.doesNotMatch(
  source,
  /@click="exitSessionToNewSession"/,
  'exit confirm modal must not show Start new session before completion'
)

assert.doesNotMatch(
  source,
  /@click="exitSessionToRepeatRange"/,
  'exit confirm modal must not show Repeat session before completion'
)

assert.doesNotMatch(
  source,
  /@click="continueSessionFromExitModal"/,
  'exit confirm modal must not show Continue this session'
)

assert.doesNotMatch(
  source,
  /@click="exitSessionToSaveSession"/,
  'exit modal markup should not wire Save this session'
)

assert.doesNotMatch(
  source,
  /session-exit-actions-primary/,
  'exit modal should not render the bulky Continue primary button'
)

assert.doesNotMatch(
  source,
  /showSessionExitModal[\s\S]{0,2500}?mutqin-session-summary-details/,
  'exit confirm modal should not show Session Overview detail table'
)

includesAll('ai memorisation mirrors recitation modal', [
  /:aria-label="t\('memorisation\.a11y\.aiMemorisationTools'\)"/,
  /Play Memorisation/,
  /t\('memorisation\.blur_everything'\)/,
  /class="recitation-check-panel recitation-check-panel-inline memorisation-checker-panel"/,
  /ref="aiMemorisationCheckerResults"/,
  /v-if="isAiMemorisationCheckerReviewActive \|\| aiMemorisationCheckerError"/,
  /Memorisation review/,
  /showMarkers \|\| this\.aiMemorisationCheckerScope === 'session' \|\| this\.aiMemorisationCheckerTargets\.length > 1/,
  /saveAiMemorisationCheckerAssessment\(\)/,
  /pruneAiCheckRecordingForStorage\(recording = \{\}\)/,
  /AI Memorisation uses the same modal structure and spacing as AI Recite/
])

includesAll('planner ui hidden', [
  /showHifzPlannerUi\(\) \{\s*return false\s*\}/s,
  /showAiMemorisationButton\(\) \{\s*return false\s*\}/s,
  /v-if="showHifzPlannerUi" class="sheet planner-controls-sheet"/,
  /v-if="showHifzPlannerUi && showPlannerCompletionConfetti"/,
  /v-if="showHifzPlannerUi && showPlannerCompletionModal"/,
  /:visible="showHifzPlannerUi && showHifzPlanModal"/,
  /<span class="workspace-shell-kicker">\{\{ t\('memorisation\.sessionOverview\.kicker'\) \}\}<\/span>/,
  /v-if="showAiMemorisationButton" class="mushaf-pill mushaf-ai-pill mushaf-ai-memory"/,
  /v-if="showAiMemorisationButton" class="verse-self-check-btn verse-ai-check-btn"/,
  /<button v-if="!hasVerses" class="action-btn primary" type="button" @click="openAdvancedControls"/,
  /<section v-if="shouldShowWorkspaceEmptyState" class="workspace-empty-state" :aria-label="t\('memorisation\.a11y\.sessionSetup'\)">/,
  /t\('memorisation\.open_session_setup'\)/,
  /aria-label="Open controls"/,
  /v-if="!isSessionCompleted && hasSessionStarted && topCardAppliedPills\.length" v-show="!mainCardCollapsed" class="workspace-quick-controls"/
])

includesAll('session completion success flow', [
  /handleSessionComplete\(\)/,
  /finaliseCompletedSessionOnBackend\(endedSnapshot\)/,
  /openPostSessionModal\(endedSnapshot, \{ previousStreak \}\)/,
  /resolveCompletionGate\(\{[\s\S]*persistenceSucceeded: true/,
  /resolveCompletionGate\(\{[\s\S]*persistenceSucceeded: false/,
  /postSessionActionsUnlocked/,
  /learningApi\.endSession\(/,
  /submitPostSessionConfidence/,
  /repeatPostSessionFromCompleted/,
  /openPostSessionNewSessionOffcanvas/,
  /openPostSessionAdjustPlan/,
  /postSessionOffcanvasOpen/,
  /post-session-simple__confidence/,
  /post-session-simple__segment/,
  /post-session-simple__adjust-link/,
  /keepPractisingFromExitModal/,
  /continueSessionFromExitModal/,
  /showCountdown\(/,
  /SESSION_STATUS\.COMPLETING/,
  /SESSION_STATUS\.PAUSED/,
  /SESSION_STATUS\.COMPLETED/,
])

assert.match(
  source,
  /keepPractisingFromExitModal\(\)\s*\{[\s\S]*?continueSessionFromExitModal\(\)/,
  'Keep practising must trigger the resume countdown via continueSessionFromExitModal'
)

assert.match(
  source,
  /continueSessionFromExitModal\(\)\s*\{[\s\S]*?showCountdown\(/,
  'continueSessionFromExitModal must show the countdown before resuming playback'
)

assert.doesNotMatch(
  source,
  /finaliseCompletedSessionOnBackend\(endedSnapshot\)\s*\.finally\s*\(/,
  'natural completion must not open recommendations before endSession succeeds'
)

assert.doesNotMatch(
  source,
  /Complete an AI Review Check for this session to view the summary\./,
  'session completion should not defer success behind AI review'
)

{
  const vueOnly = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(
    vueOnly,
    /post-session-simple__ai-btn|openPostSessionAiRecite/,
    'completion modal should not expose AI Recite section'
  )
  assert.match(vueOnly, /post-session-simple--builder-open/)
  assert.match(
    readFileSync(new URL('../../resources/js/views/Memorisation.css', import.meta.url), 'utf8'),
    /onboarding-post-session-tools\s*\{[\s\S]*?z-index:\s*12720/
  )
}

includesAll('audio unlock flow', [
  /primeUiAudioUnlock\(\) \{/,
  /primeAudioPlaybackUnlock\(audioOverride = null, options = \{\}\) \{[\s\S]*this\.primeUiAudioUnlock\(\)[\s\S]*if \(!audioOverride && !this\.audioElement\) \{/,
  /claimAudioElement\(audio\) \{/,
  /startSessionAndClose\(\)[\s\S]*this\.primeAudioPlaybackUnlock\(\)[\s\S]*this\.startSessionWithCountdown\(\{ skipPrime: true \}\)/,
  /repeatPostSession\(\)[\s\S]*this\.primeAudioPlaybackUnlock\(\)[\s\S]*this\.startSessionWithCountdown\(\{ skipPrime: true \}\)/,
  /toggleRecordingPlayback\(recording\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: source \}\)[\s\S]*await audio\.play\(\)/,
  /toggleReviewResultAudio\(result = null\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: source \}\)[\s\S]*await playAudioElement\(audio\)/,
  /toggleSelfCheckAyahPlayback\(verse\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: audioUrl \}\)[\s\S]*this\.claimAudioElement\(audio\)[\s\S]*await this\.waitForAudioElementReady\(audio\)[\s\S]*await audio\.play\(\)/,
  /toggleSelfCheckPreview\(verseKey\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: source \}\)[\s\S]*await audio\.play\(\)/,
  /playVerse\([^)]*primePlayback:\s*true/,
  /@click="playVerse\(quizCard, \{ primePlayback: true \}\)"/
])

includesAll('light theme default', [
  /theme: 'light'/,
  /this\.theme = document\.documentElement\.getAttribute\('data-theme'\) \|\| this\.theme \|\| 'light'/,
  /document\.documentElement\.setAttribute\('data-theme', this\.theme\)/
])

assert.doesNotMatch(
  source,
  /this\.theme = 'dark'[\s\S]*setAttribute\('data-theme', 'dark'\)/,
  'logged-out flow should not force dark mode'
)

includesAll('ai recitation live review signals', [
  /buildLiveRecitationReviewResult\(kind = 'recitation'\)/,
  /key: 'green', label: 'Green'/,
  /key: 'amber', label: 'Amber'/,
  /key: 'red', label: 'Red'/,
  /key: 'grey', label: 'Grey'/
])

assert.doesNotMatch(source, /modal-speed-badge|recitationSpeedReview\(\) \{|memorisationSpeedReview\(\) \{|STEADY PACE|PACE NOT MEASURED|WPM/, 'pace badges should not render in AI review modals')

assert.doesNotMatch(
  source,
  /Progress Chart|<h3>Progress<\/h3>|analytics-progress-bar|analytics-progress-bar-fill/,
  'progress chart markup and CSS should be removed'
)

assert.doesNotMatch(
  source,
  /\$forceUpdate|wrapTajweedWithWordHighlighting|buildTajweedWordTokens|extractTajweedCharUnits|memorisation-checker-modal-blank/,
  'forced refreshes, dead tajweed wrappers, and blank AI fallback shells should stay removed'
)

assert.doesNotMatch(
  source,
  /<button[^>]*active-recall-toggle|Active Recall|active-recall|toggleActiveRecallMode|getActiveRecall|handleActiveRecallStatusFeedback|resetActiveRecallFeedback|return this\.getActiveRecallArabic/,
  'active recall tool should not render or control the ayah display'
)

includesAll('header controls compact ordering', [
  /class="workspace-header-view-controls quick-right-controls"/,
  /\.workspace-shell-actions \{[\s\S]*direction: ltr !important;[\s\S]*gap: 0\.55rem !important;/,
  /\.workspace-header-view-controls \{[\s\S]*order: -1 !important;/,
  /\.workspace-header-view-controls \.view-mode-switch \{[\s\S]*min-height: 40px !important;/,
  /\.workspace-shell-actions \.action-btn\[aria-label="Open session controls"\] \{[\s\S]*width: 42px !important;/
])

includesAll('urgent ayah layout fixes', [
  /\.tools-tabs \{[\s\S]*display: flex !important;[\s\S]*width: 100% !important;/,
  /\.tools-tabs > button \{[\s\S]*flex: 1 1 0 !important;[\s\S]*justify-content: center !important;/,
  /\.verse-menu-font-row button i \{[\s\S]*place-items: center !important;[\s\S]*width: 100% !important;[\s\S]*height: 100% !important;/,
  /\.verse-card \.verse-arabic-wrap,[\s\S]*overflow-x: visible !important;/,
  /unicode-bidi: plaintext !important;/,
  /\.self-check-recorder-card\.recording,[\s\S]*border: 0 !important;/
])

includesAll('anchor visual updates are scheduled', [
  /anchorHighlightFrame: null/,
  /scheduleAnchorHighlights\(\) \{/,
  /requestAnimationFrame/,
  /cancelAnchorHighlightFrame\(\) \{/,
  /activeTargets = document\.querySelectorAll\('\.verse-card\.active, \.mushaf-ayah\.active'\)/
])

assert.doesNotMatch(
  source,
  /<span class="workspace-shell-kicker">\{\{ isPlannerModeActive \? 'Hifz Planner' : 'Casual Session' \}\}<\/span>|<p v-if="isPlannerModeActive" class="workspace-shell-helper-copy">|<template v-if="isPlannerModeActive">/,
  'planner text should not render in the active workspace'
)

assert.doesNotMatch(
  source,
  /<section v-if="!hasVerses" class="home-dashboard home-dashboard-minimal">/,
  'old home dashboard should not render'
)

for (const pattern of [
  /t\('hifzPlan\.your_hifz_journey_is_ready'\)/,
  /forecastItems\(\) \{/,
  /calculatePlanForecast/,
  /hifzPlan\.wizard\.goals\.\$\{def\.value\}\.detail/,
  /class="hifz-forecast-grid"/,
  /status: lifecycleStatus === 'draft' \? 'active' : lifecycleStatus/,
  /wizardProgressPercent\(\) \{/,
  /canProceedFromCurrentStep\(\) \{/,
  /isStepAccessible\(index\) \{/
]) {
  assert.match(hifzPlanModalSource, pattern, `hifz plan modal: missing ${pattern}`)
}

assert.doesNotMatch(
  hifzPlanModalSource,
  /Speak your plan|Voice plan input|voiceState:|startVoiceInput\(|stopVoiceInput\(|hifz-voice-panel/,
  'planner setup modal should not render the voice speak section'
)

assert.doesNotMatch(
  source,
  /<span class="recitation-check-section-label">AI memorisation check<\/span>/,
  'AI memorisation idle check container should not render'
)

includesAll('ai recitation simplified workspace', [
  /class="self-check-header-tools"/,
  /:aria-label="t\('memorisation\.a11y\.playAyahOnce'\)"/,
  /v-if="shouldShowOffcanvasTabs"/,
  /shouldShowOffcanvasTabs\(\) \{\s*return true\s*\}/s,
  /class="recitation-word-stream recitation-live-word-stream" dir="rtl"/,
  /if \(this\.recitationCheckRecording\) return false/,
  /key: 'green', label: 'Green'/,
  /key: 'amber', label: 'Amber'/,
  /key: 'red', label: 'Red'/,
  /key: 'grey', label: 'Grey'/,
  /\{\{ getUnifiedResultSectionLabel\('next'\) \}\}/,
  /\{\{ getUnifiedResultSectionLabel\('recording'\) \}\}/,
  /const status = word\.status === 'pending' \? 'pending' : word\.status/,
  /recitation-review-ayah \.wbw-word/,
  /recitation-result-stats,[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/
])

assert.doesNotMatch(source, /Grey means the word was not heard yet/, 'obsolete grey description card should be removed')
assert.doesNotMatch(source, /key: 'accuracy', label: 'Accuracy'/, 'accuracy card should be removed')
assert.doesNotMatch(source, /key: 'pace', label: 'Pace'/, 'pace card should be removed')
assert.doesNotMatch(source, /key: 'fixes', label: 'Words to fix'/, 'fixes card should be removed')
assert.doesNotMatch(source, /key: 'jumps', label: 'Big jumps'/, 'jumps card should be removed')
assert.doesNotMatch(source, /getRecitationResultStats\(buildLiveRecitationReviewResult\('recitation'\)\)/, 'live review stats should not render while recording')
assert.doesNotMatch(source, /class="verse-status-badge verse-status-badge-review">Review Due<\/span>/, 'per-ayah review due badge should be removed')
assert.doesNotMatch(source, /<div v-if="showSessionEndedModal" class="modal-overlay planner-completion-overlay"/, 'session ended modal should not render')
assert.doesNotMatch(source, /this\.showSelfCheckModal \|\|\s*this\.showRecordingsLibrary/, 'open self-check modal should not force periodic rerenders')

includesAll('offcanvas workspace sync', [
  /syncWorkspaceFromControls\(options = \{\}\)/,
  /applyWorkspaceControls\(options = \{\}\)/,
  /clearWorkspaceForConfigChange\(mode = this\.currentMode\)/,
  /onChapterChange\(event\)/,
  /refreshVerses\(\)/
])

includesAll('offcanvas stability hooks', [
  /toolsReturnFocusEl:\s*null/,
  /syncBodyScrollLock\(locked = false\)/,
  /const shouldMarkPanelOpen = !!locked/,
  /document\.body\.classList\.toggle\('tools-panel-open', shouldMarkPanelOpen\)/,
  /focusToolsPanel\(\)/,
  /restoreToolsFocus\(\)/,
  /const panelBody = this\.\$refs\.toolsBody/,
  /if \(this\.showTools\) \{\s*event\.preventDefault\(\)\s*this\.closeToolsPanel\(\)\s*return/s
])

includesAll('word audio sync stability', [
  /wordHighlightRequestId:\s*0/,
  /lastHighlightedWordNodes:\s*\[\]/,
  /queueStatsVisualTick\(\)/,
  /cancelStatsVisualTick\(\)/,
  /findWordTimingIndex\(currentTime, timestamps = this\.wordHighlightTimestamps\)/,
  /queueWordHighlightFrame\(verse = this\.activeVerseRef\)/,
  /ensureWordHighlightTrack\(verse, options = \{\}\)/,
  /const previousNodes = Array\.isArray\(this\.lastHighlightedWordNodes\) \? this\.lastHighlightedWordNodes : \[\]/,
  /this\.lastHighlightedWordNodes = Array\.from\(nextNodes\)/,
  /this\.audioElement\.removeEventListener\('playing', this\.audioPlaying\)/,
  /this\.audioElement\.removeEventListener\('ratechange', this\.audioRateChange\)/,
  /this\.audioElement\.addEventListener\('playing', this\.audioPlaying\)/,
  /this\.audioElement\.addEventListener\('ratechange', this\.audioRateChange\)/,
  /this\.ensureWordHighlightTrack\(verse\)\.then\(\(\) => \{/,
  /this\.syncWordHighlightFromAudio\(this\.activeVerseRef\)/,
  /if \(this\.isPlaying\) this\.queueWordHighlightFrame\(this\.activeVerseRef\)/
])

assert.doesNotMatch(source, /statsInterval|querySelectorAll\('\\.verse-arabic \\.wbw-word\\.highlighted|this\.showSelfCheckModal \|\|\s*this\.showRecordingsLibrary/, 'idle stats intervals and global highlight sweeps should not return')

assert.doesNotMatch(
  source,
  /liveRecitationRenderTick|getLiveStatusSignature|recitation-live-\$\{index\}-|memory-live-\$\{index\}-/,
  'live recitation colouring should not force full ayah renders or recreate live word nodes'
)

includesAll('live word colouring patch queue', [
  /liveWordDomPatchFrame: null/,
  /pendingLiveWordDomPatches: \{\}/,
  /recitationDisplayHtmlCache: markRaw\(new Map\(\)\)/,
  /liveWordVerseNodeRegistry: markRaw\(new Map\(\)\)/,
  /liveWordChipNodeRegistry: markRaw\(new Map\(\)\)/,
  /queueLiveWordDomPatches\(targetKey = '', changedWords = \[\]\) \{/,
  /scheduleLiveWordDomPatchFlush\(\) \{/,
  /requestAnimationFrame/,
  /flushLiveWordDomPatches\(\) \{/,
  /buildVisibleLiveWordWindow\(sourceWords = \[\], limit = 36, keyPrefix = 'live'\) \{/,
  /setLiveWordNodeStatus\(node, status = 'notAttempted', title = ''\)/,
  /getRenderedRecitationWordStatusForVerse\(ayahKey, index, sessionTargetKey = ''\)/,
  /if \(this\.isLiveRecitationDomPatchModeForVerse\(ayahKey\)\) return 'notAttempted'/,
  /this\.queueLiveWordDomPatches\(targetKey, changedWords\)/,
  /return this\.buildVisibleLiveWordWindow\(this\.recitationLiveWords, liveWordCount \|\| limit, 'recitation-live'\)/,
  /return this\.buildVisibleLiveWordWindow\(this\.aiMemorisationCheckerLiveWords, 42, 'memory-live'\)/,
  /key: `\$\{keyPrefix\}-\$\{index\}`/,
  /data-live-kind="recitation" :data-live-word-index="word\.index"/,
  /data-live-kind="memorisation" :data-live-word-index="word\.index"/,
  /this\.recitationDisplayHtmlCache\.set\(cacheKey, html\)/
])

includesAll('chaining runtime application', [
  /setChainingEnabled\(enabled\)/,
  /setChainingMethod\(method\)/,
  /setChainingRepetitions\(value\)/,
  /applyChainingQueueChange\(mode = this\.currentMode, options = \{\}\)/,
  /playQueueEntry\(entry, options = \{\}\)/,
  /segment: null/,
  /pushQueueGroup\(chain\.map/,
  /pushQueueGroup\(\[/,
  /linking:single:\$\{verse\.key\}/,
  /linking:\$\{verse\.key\}->\$\{nextVerse\.key\}/,
  /uiChaining/,
  /\.\.\.\(uiChaining \|\| \{\}\)/,
  /if \(!uiChaining\)/
])

const modeDataMatchesCount = (source.match(/modeDataMatchesConfig\(mode = this\.currentMode/g) || []).length
assert.equal(modeDataMatchesCount, 1, 'modeDataMatchesConfig should have one implementation')

const rebuildQueueCount = (source.match(/rebuildQueue\(mode = this\.currentMode/g) || []).length
assert.equal(rebuildQueueCount, 1, 'rebuildQueue should have one implementation')

const toggleTajweedCount = (source.match(/toggleTajweed\(\) \{/g) || []).length
assert.equal(toggleTajweedCount, 1, 'toggleTajweed should have one implementation')

includesAll('centralised session lifecycle wiring', [
  /from '\.\.\/scripts\/session\/sessionLifecycle'/,
  /buildSessionLifecycleViewModel/,
  /primarySessionActionPresentation/,
  /handleHeaderSessionAction/,
  /resumeSessionFromPrimaryAction/,
  /validateSessionLifecycleAgainstBackend/,
  /demoteLiveSessionToResumableOnBootstrap/,
  /prepareLogoutSessionCleanup/,
  /PRIMARY_SESSION_ACTION\.END_SESSION/,
  /PRIMARY_SESSION_ACTION\.RESUME_SESSION/,
  /headerSessionActionBusy/,
  /onboardingSampleSessionActive/
])

console.log('mutqin controls wiring passed')
