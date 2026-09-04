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
  /scrollToWorkspaceMain\(\)/,
  /data-session-scroll-target/,
  /scheduleSessionWorkspaceScroll\(/,
  /createSessionWorkspaceScrollController/,
  /SESSION_WORKSPACE_SCROLL_REASON/,
])

includesAll('session setup controls', [
  /<select :value="chapterId" @change="onChapterChange"/,
  /v-model\.number="rangeStart" @input="adjustRange\(\)" @change="adjustRange\(\{ immediate: true \}\)"/,
  /v-model\.number="rangeEnd" @input="adjustRange\(\)" @change="adjustRange\(\{ immediate: true \}\)"/,
  /<select v-model="reciterId" @change="refreshVerses"/,
  /@change="setPlaybackSpeed\(option\)"/,
  /value="auto" v-model="playMode"/,
  /value="manual" v-model="playMode"/,
  /t\('memorisation\.delay_between_recitations_secs'\)/,
  /<select v-model\.number="delay" class="select">/,
  /option in delayOptions/
])

includesAll('technique controls', [
  /:aria-label="t\('memorisation\.a11y\.useFocusMode'\)"[\s\S]*?@click(?:\.stop)?="toggleFocusModeRadio"/,
  /:aria-checked="focusModeEnabled \? 'true' : 'false'"/,
  /:aria-label="t\('memorisation\.a11y\.useBlurMode'\)"[\s\S]*?@click(?:\.stop)?="toggleBlurModeRadio"/,
  /:aria-checked="blurModeEnabled \? 'true' : 'false'"/,
  /v-model\.number="blurIntensity"/,
  /:aria-label="t\('memorisation\.a11y\.useChaining'\)"[\s\S]*?@click(?:\.stop)?="toggleChainingRadio"/,
  /:aria-checked="chainingEnabled \? 'true' : 'false'"/,
  /:aria-label="t\('memorisation\.a11y\.useAnchorMode'\)"[\s\S]*?@click(?:\.stop)?="toggleAnchorModeRadio"/,
  /:aria-checked="anchorModeEnabled \? 'true' : 'false'"/,
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
  /@click\.stop="toggleReadingOption\('translation'\)"/,
  /@click\.stop="toggleReadingOption\('transliteration'\)"/,
  /@click\.stop="toggleReadingOption\('wbw'\)"/,
  /@click\.stop="toggleTajweed"/,
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
  /key: 'practice'/,
  /key: 'coach'/,
  /key: 'improve'/,
  /key: 'continue'/
])

assert.doesNotMatch(
  onboardingStepsBlock,
  /key: 'reading'|key: 'review'/,
  'legacy reading/review onboarding steps should be removed'
)

assert.doesNotMatch(
  onboardingStepsBlock,
  /Choose your start|Set your first goal|Start learning/,
  'old onboarding copy should be removed'
)

includesAll('workspace spotlight tour is the only onboarding', [
  /workspaceTourActive/,
  /startWorkspaceTour\(/,
  /scheduleWorkspaceTourStart\(/,
  /shouldAutoStartWorkspaceTour\(/,
  /openOnboardingFromTopMenu\(/,
  /freshIsolation/,
  /markOnboardingCompleted\(/,
])

assert.doesNotMatch(
  readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8'),
  /post-onboarding-modal--guided|onboarding-step-rail--four|onboarding-fluid/,
  'old guided onboarding modal markup must be gone',
)

const onboardingUiSource = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
  + '\n'
  + readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')

assert.doesNotMatch(
  onboardingUiSource,
  /onboarding-step-screenshot|onboardingStepScreenshotAlt|images\/onboarding\//,
  'onboarding step screenshots should be removed on desktop and mobile'
)

assert.doesNotMatch(
  source,
  /onboardingWelcomeChoice|selectOnboardingWelcomeChoice|confirmOnboardingWelcomeChoice|showOnboardingReady|onboardingIsWelcome|onboardingIsReady|onboarding-path-grid|onboarding-ready-list|onboarding-salam|onboarding-step-rail--five/,
  'welcome/ready path picker UI and state should be removed'
)

assert.doesNotMatch(
  source,
  /onboarding-path-card--primary/,
  'sample path card must not be permanently primary/auto-selected'
)

assert.doesNotMatch(
  memorisationDataBlock,
  /onboardingFinishChoice|onboardingPath:|onboardingWelcomeChoice/,
  'legacy finish-choice / path / welcome onboarding state should be removed'
)
assert.doesNotMatch(
  source,
  /selectOnboardingFinishChoice|confirmOnboardingFinishChoice|onboarding-finish-choice-grid"/,
  'legacy finish-choice onboarding handlers/UI should be removed'
)

includesAll('tajweed independence', [
  /@click(\.stop)?="toggleTajweed"/,
  /else if \(this\.tajweedEnabled && cleanVerse\.arabic_tajweed\) \{/,
  /html = this\.renderWordLevelTajweedMarkup\(cleanVerse, \{ wrapWords: needsInteractiveWords \}\)/,
  /if \(this\.selfCheckTajweedEnabled && enriched\.arabic_tajweed\) \{/,
  /return this\.renderWordLevelTajweedMarkup\(enriched/,
  /else if \(this\.aiMemorisationCheckerTajweedEnabled && liveVerse\.arabic_tajweed\) \{/,
  /html = this\.renderWordLevelTajweedMarkup\(liveVerse/,
  /html = this\.splitArabicIntoWords\(cleanVerse\)/,
  /renderWordLevelTajweedMarkup\(verse = \{\}, options = \{\}\) \{/,
  /Continuous markup preserves Arabic joining/,
  /Keep character-level tajweed spans so rule colors paint correctly/,
  /toggleTajweed\(\) \{/,
  /setTajweedEnabled\(!this\.tajweedEnabled/,
  /this\.tajweedEnabled \? 'Tajweed text enabled' : 'Tajweed text disabled'/
])

includesAll('welcome back continue session flow', [
  /welcomeBackContinueInFlight/,
  /async welcomeBackContinueSession\(options = \{\}\) \{/,
  /if \(this\.welcomeBackContinueInFlight\) return/,
  /resolveWelcomeBackContinuePayload/,
  /buildPayloadFromLoadedWorkspaceSession/,
  /revealLoadedPreviousSession/,
  /resumeRestoredSessionWithCountdown/,
  /dismissWelcomeBackAfterContinue\(\)/,
  /hydrateSessionFromPayload\(payload/,
  /queueBackendResumeAfterWelcomeContinue/,
  /memorisation\.welcomeBack\.freshSubtitle/,
  /Continue must never auto-open the tools offcanvas/,
  /continueSessionShort/,
  /welcome-back-continue-label--short/,
  /resolveVerseAyahNumber\(verse\)/,
  /\.welcome-back-modal-wrap \.welcome-back-dialog/,
  /@click\.stop\.prevent="welcomeBackContinueSession"/,
  /@click="closeWelcomeBackModal"/,
  /closeWelcomeBackModal\(\) \{/,
  /if \(this\.showWelcomeBackModal\) \{[\s\S]*this\.closeWelcomeBackModal\(\)/,
  /welcomeBackWorkspaceHidden = true/,
  /restoreContinueFromLastPosition/,
  /hasRestorableLastPlace/,
  /returningUserChoicePending/,
  /shouldGateWorkspaceForResumeChoice\(\) \{\s*return !!\(this\.isLoggedIn && this\.returningUserChoicePending\)/,
])

{
  const vue = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
  const en = readFileSync(new URL('../../resources/js/locales/en.json', import.meta.url), 'utf8')
  const welcomeBlock = vue.match(/v-if="showWelcomeBackModal"[\s\S]*?<\/transition>/)?.[0] || ''
  assert.ok(welcomeBlock, 'welcome-back modal block not found')
  assert.doesNotMatch(welcomeBlock, /welcome-back-hint|welcome-back-kicker/, 'welcome-back modal must not show redundant hint/kicker copy')
  assert.match(welcomeBlock, /@click="closeWelcomeBackModal"/)
  assert.doesNotMatch(welcomeBlock, /welcome-back-backdrop"[^>]*welcomeBackStartNewSession/)
  assert.match(en, /"freshSubtitle": "Begin a new set when you are ready\."/)
  assert.match(en, /"resumeSubtitleAtPlace": "You left \{place\}\. May Allah make your return light\."/)
  assert.match(en, /"resumePlaceBeginning": "\{chapter\}, from the start"/)
  assert.match(en, /"resumePlaceAyah": "\{chapter\}, ayah \{number\}"/)
  assert.match(welcomeBlock, /container-fluid welcome-back-fluid/)
  assert.match(welcomeBlock, /welcomeBackMetaChips/)
  assert.match(welcomeBlock, /welcome-back-salam/)
  assert.match(welcomeBlock, /welcome-back-meta-line/)
  assert.match(welcomeBlock, /welcome-back-meta-chip/)
  assert.doesNotMatch(welcomeBlock, /welcome-back-context/)
  assert.match(en, /"continuePreviousSession": "Return to your place"/)
  assert.match(
    welcomeBlock,
    /v-if="canResumePreviousSession"/,
    'Return to this set must only render when a parked/resumable set exists',
  )}

{
  const js = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  const continueFn = js.match(/async welcomeBackContinueSession\(options = \{\}\) \{[\s\S]*?\n    \},\n\n    logoutFromWelcomeBack/)?.[0] || ''
  assert.ok(continueFn, 'welcomeBackContinueSession body not found')
  assert.match(continueFn, /dismissWelcomeBackAfterContinue\(\)/)
  assert.match(continueFn, /restoreWorkspaceToContinuePayload/)
  assert.match(continueFn, /revealLoadedPreviousSession\(\)/)
  assert.doesNotMatch(
    continueFn,
    /revealRestoredLastPlace\(\)/,
    'welcomeBackContinueSession must countdown into the set, not idle last-place reveal',
  )
  assert.doesNotMatch(
    continueFn,
    /openToolsPanel/,
    'welcomeBackContinueSession must not auto-open the tools offcanvas'
  )
  assert.doesNotMatch(
    continueFn,
    /showWelcomeBackModal = true/,
    'failed continue must not reopen the choose-how-to-begin modal'
  )
}

includesAll('quran font picker access', [
  /toggleFontDropdown/,
  /selectFont\(fontValue\)/,
  /top-card-font-wrap/,
  /fontDropdownOpen/,
  /top-card-font-menu/,
  /clearMushafAyahHtmlCache/,
])

includesAll('desktop control group swap', [
  /\/\* Session CTAs live inside \.workspace-shell-head-toolbar \(left of icon controls\)\./,
  /\.workspace-shell-head:not\(\.is-idle\) > \.workspace-shell-head-toolbar \{/,
  /\.workspace-shell-head-toolbar > \.top-card-icon-controls \{/,
  /class="workspace-shell-head-toolbar"/,
  /class="workspace-shell-head-utility-row"/,
])

includesAll('workspace AI Recite companion', [
  /data-testid="workspace-ai-recite"/,
  /showWorkspaceAiReciteCta/,
  /openWorkspaceAiRecite/,
  /class="workspace-ai-recite-cta"/,
  /webpackChunkName: "dash-ai-recite"/,
])

includesAll('top toolbar feature spacing', [
  /\.top-card-icon-controls \{[\s\S]*--top-card-toolbar-gap:\s*0\.5rem;/,
  /\.top-card-icon-controls \{[\s\S]*gap:\s*var\(--top-card-toolbar-gap\)\s*!important;/,
  /\.top-card-icon-controls \{[\s\S]*--top-card-toolbar-icon:/,
  /\.top-card-icon-controls \.top-card-layout-icons,[\s\S]*margin:\s*0\s*!important;/,
])

{
  const memorisationCss = readFileSync(new URL('../../resources/js/views/Memorisation.css', import.meta.url), 'utf8')
  const mobileGridCss = readFileSync(new URL('../../resources/js/views/Memorisation.mobile-grid.css', import.meta.url), 'utf8')
  const blade = readFileSync(new URL('../../resources/views/layouts/app.blade.php', import.meta.url), 'utf8')

  assert.doesNotMatch(
    blade,
    /\.workspace-shell--post-session-choice \.top-card-icon-controls\s*\{[^}]*display:\s*none\s*!important/,
    'blade hotfix must not hide mobile post-session top-card icons'
  )
  assert.match(
    blade,
    /\.workspace-shell--post-session-choice \.top-card-icon-controls\s*\{[^}]*display:\s*flex\s*!important/,
    'blade hotfix must keep mobile post-session top-card icons visible'
  )

  // Circle-hide hotfix must respect the selected Qur’anic font, not hardcode UthmanicHafs.
  assert.match(
    blade,
    /MutqinHideQuranCircles',\s*var\(--quran-font/,
    'blade circle-hide font stack must use --quran-font so font picker applies'
  )
  assert.doesNotMatch(
    blade,
    /MutqinHideQuranCircles',\s*'UthmanicHafs'/,
    'blade must not force UthmanicHafs after MutqinHideQuranCircles'
  )

  // Mobile stack: toolbar (title + CTAs + icons) on row 1, progress pills on row 2
  assert.match(
    blade,
    /Mobile session overview stack:[\s\S]*?progress pills[\s\S]*?\.workspace-shell-head:not\(\.is-idle\) > \.workspace-shell-progress-pills \{[\s\S]*?grid-row:\s*2\s*!important/,
    'blade hotfix must keep progress pills on grid-row 2'
  )
  assert.match(
    mobileGridCss,
    /\.workspace-shell-head > \.workspace-shell-progress-pills \{[\s\S]*?grid-row:\s*2\s*!important[\s\S]*?overflow-x:\s*(?:hidden|clip)/,
    'mobile-grid must place progress pills on row 2 without horizontal scroll'
  )
  assert.match(
    mobileGridCss,
    /\.workspace-shell-head > \.workspace-shell-head-toolbar \{[\s\S]*?grid-row:\s*1\s*!important/,
    'mobile-grid must place head toolbar on row 1'
  )
  assert.match(
    blade,
    /\.app \.workspace-shell-head:not\(\.is-idle\) > \.workspace-shell-head-toolbar \{[\s\S]*?grid-row:\s*1\s*!important/,
    'blade hotfix must place head toolbar on row 1'
  )
  assert.doesNotMatch(
    blade,
    /\.app \.workspace-shell-actions,\s*\n\s*\.app \.workspace-shell-actions \.action-buttons-group \{\s*\n\s*display:\s*contents\s*!important/,
    'blade hotfix must not use display:contents for active-session actions (causes pill/button overlap)'
  )
  assert.match(
    blade,
    /\.app \.workspace-shell-actions \.top-card-session-actions\.has-paired-actions:not\(\.post-session-choice-pair\) \{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/,
    'blade hotfix must keep Resume/End as a 2-column grid (not stacked)'
  )
  assert.match(
    blade,
    /\.app \.workspace-shell-actions \.top-card-session-actions\.has-paired-actions:not\(\.post-session-choice-pair\) > \.action-btn-exit \{[\s\S]*?grid-column:\s*2\s*!important[\s\S]*?grid-row:\s*1\s*!important/,
    'blade hotfix must place End session beside Resume on row 1'
  )
  assert.match(
    mobileGridCss,
    /\.top-card-session-actions\.has-paired-actions:not\(\.post-session-choice-pair\) > \.action-btn-exit \{[\s\S]*?grid-column:\s*2\s*!important[\s\S]*?grid-row:\s*1\s*!important/,
    'mobile-grid must place End session beside Resume on row 1'
  )
}

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
  /toggleTajweed\(\) \{\s*this\.setTajweedEnabled\(!this\.tajweedEnabled/,
  /selectFont\(fontValue\) \{\s*const allowed = \(this\.quranFontOptions/,
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
  /const strictProgression = !!this\.aiRecitationStrictProgression/,
  /const liveAlignmentOptions = \{\s*strictProgression,/,
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
  /session-exit-confirm-actions/,
  /mutqin-modal-actions--end/,
  /mutqin-modal-btn--destructive/,
  /mutqin-modal-btn--secondary/,
  /mutqin-btn--destructive/,
  /session-exit-progress-summary/,
  /session-exit-backdrop/,
  /@click="keepPractisingFromExitModal"/,
  /keepPractisingFromExitModal/,
  /confirmEndSessionFromExitModal/,
  /pauseSessionFromPrimaryAction/,
  /PRIMARY_SESSION_ACTION\.PAUSE_SESSION/,
])

includesAll('pause session halts Talqin automation', [
  /pausePlaybackGuards/,
  /shouldRunDeferredTalqinAdvance/,
  /isSessionAutomationHalted/,
  /talqinPauseSettleTimer/,
  /clearPlaybackAdvanceTimer/,
  /if \(this\.sessionPaused\) return false/,
  /applyLocalPausedSessionState\(\)\s*\n\s*this\.softPausePlayback\(\)/,
])

assert.doesNotMatch(
  source,
  /this\.talqinRecitationTurnActive = false/,
  'soft pause must not assign the computed talqinRecitationTurnActive flag'
)

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

includesAll('ai memorisation detection modal wiring', [
  /lazyWorkspaceChunk\([\s\S]*AiMemorisationDetectionModal\.vue|wrapChunkImport\([\s\S]*AiMemorisationDetectionModal\.vue/,
  /AiMemorisationDetectionModal,/,
  /aiTestModalsEnabled\(\) \{/,
  /saveAiMemorisationCheckerAssessment\(\)/,
  /pruneAiCheckRecordingForStorage\(recording = \{\}\)/,
  /\.memorisation-checker-modal \.memorisation-checker-panel/,
])

includesAll('ai audio consent and retention wiring', [
  /AiAudioConsentModal/,
  /maybeShowRegistrationAiAudioConsent\(/,
  /ensureAiAudioConsent\(/,
  /shouldPromptAiAudioConsent/,
  /prepareAudioRetentionPayload/,
  /stripRawAudioFields/,
  /applyAudioRetentionToCacheEntry/,
  /showAiAudioConsentModal/,
  /\/privacy/,
])

{
  const amdVue = readFileSync(new URL('../../resources/js/components/AiMemorisationDetectionModal.vue', import.meta.url), 'utf8')
  const amdCss = readFileSync(new URL('../../resources/js/views/Memorisation.amd.css', import.meta.url), 'utf8')
  assert.match(amdVue, /amd-dialog/)
  assert.match(amdVue, /amd-footer--sticky/)
  assert.match(amdVue, /trapFocus\(/)
  assert.match(amdVue, /restoreReturnFocus\(/)
  assert.match(amdVue, /amd-mistake-visual/)
  assert.doesNotMatch(amdVue, /amd-follow-bar/)
  assert.doesNotMatch(amdVue, /amd-follow-toggle/)
  assert.doesNotMatch(amdVue, /is-auto-follow-paused/)
  assert.match(amdVue, /createLiveAutoFollowController/)
  assert.match(amdVue, /autoFollowEnabled:\s*true/)
  assert.match(amdVue, /:data-theme="themeAttr"/)
  assert.match(amdCss, /--amd-modal-width:\s*min\(920px,\s*calc\(100vw - 2rem\)\)/)
  assert.match(amdCss, /\.amd-modal--spacious \.amd-body--scroll[\s\S]*?overflow-y:\s*hidden/)
  assert.match(amdCss, /\.amd-modal--spacious \.amd-mushaf-shell--primary[\s\S]*?overflow-y:\s*auto/)
  assert.match(amdCss, /min-height:\s*100dvh/)
  assert.match(amdCss, /padding-top:\s*calc\(0\.75rem \+ env\(safe-area-inset-top/)
  assert.match(amdCss, /\.amd-overlay\[data-theme="dark"\] \.amd-complete__title/)
  assert.match(amdCss, /\.amd-overlay\[data-theme="dark"\] \.amd-mic-status/)
  assert.match(amdCss, /\.amd-overlay\[data-theme="dark"\] \.amd-inline-error/)
  assert.match(amdCss, /\.amd-overlay\[data-theme="sepia"\] \.amd-modal--premium/)
  assert.match(amdCss, /\.amd-mistake-visual/)
  // AI disclaimer banner removed from AMD UI (prop may still exist for a11y title)
  assert.doesNotMatch(amdVue, /amd-disclaimer--row/)
  assert.match(amdCss, /\.amd-disclaimer[\s\S]*?display:\s*none/)
  const en = readFileSync(new URL('../../resources/js/locales/en.json', import.meta.url), 'utf8')
  assert.match(en, /"disclaimer":\s*"Practice aid only/)
  assert.match(source, /memorisation\.amd\.disclaimer/)
  assert.match(amdVue, /amd-tools-container/)
  assert.match(amdVue, /amd-tools-bar/)
  assert.match(amdVue, /amd-tools-bar__timer/)
  assert.match(amdVue, /amd-tools-bar__btn/)
  assert.match(amdVue, /bi-eye/)
  assert.match(amdVue, /elapsedLabel/)
  assert.doesNotMatch(amdVue, /amd-tools-bar__btn--labeled/)
  assert.doesNotMatch(amdVue, /amd-tools-bar__timer--labeled/)
  assert.doesNotMatch(amdVue, /amd-tools-bar__btn-label/)
  assert.doesNotMatch(amdVue, /amd-tools-bar__size/)
  assert.doesNotMatch(amdVue, /bi-eye-slash/)
  assert.doesNotMatch(amdVue, /toggle-mistake-sound/)
  assert.doesNotMatch(amdVue, /toggle-tajweed/)
  assert.doesNotMatch(amdVue, /amd-tajweed-live-card/)
  assert.doesNotMatch(amdVue, /open-tajweed-legend/)
  assert.doesNotMatch(amdVue, /amd-tool-cell__hint/)
  assert.match(amdCss, /\.amd-tools-container/)
  assert.match(amdCss, /\.amd-tools-bar__timer/)
  assert.match(amdCss, /FORCE tools bar UX/)
  assert.match(amdCss, /FORCE AMD live status colours/)
  assert.match(amdCss, /amd-tools-bar__btn-label/)
  assert.match(amdCss, /amd-tools-bar__timer-label/)
  assert.match(amdCss, /background:\s*transparent\s*!important/)
  assert.match(amdCss, /#b91c1c\s*!important/)
  assert.match(amdCss, /#f87171\s*!important/)
  assert.match(amdVue, /:theme="theme"|theme:\s*\{/)
  assert.match(source, /resolveAmdWordVisual\(/)
  assert.match(source, /raw === 'wrong'/)
  assert.match(source, /amdTajweedEnabled:\s*false/)
  assert.match(source, /this\.amdTajweedEnabled\s*=\s*false/)
  assert.match(source, /startAmdElapsedTimer\(/)
  assert.match(source, /stopAmdElapsedTimer\(/)
  assert.match(source, /createSessionTimer/)
  assert.match(source, /normalizeArabicForRecitationEngine/)
  assert.match(source, /phraseStart/)
  assert.match(source, /_amdStartBeepAt/)
  assert.match(source, /_amdRecordStartBeepConsumed/)
  assert.match(source, /skipBeep/)
  assert.match(source, /ensureUiAudioContext\(/)
  assert.match(amdVue, /recordingActiveLabel/)
  assert.match(amdVue, /displayMicStatusLabel/)
  // One Recording status pill — starting must not show a separate listening label.
  assert.match(amdVue, /stage === 'listening' \|\| this\.isStarting/)
  assert.doesNotMatch(amdVue, /amd-live-banner/)
  assert.doesNotMatch(amdVue, /recitation-start-cue/)
  assert.doesNotMatch(source, /recitationStartCueActive\s*=\s*true/)
  assert.match(source, /restoreSessionAudioAfterAmd\(/)
  assert.match(source, /splitTajweedMarkupIntoWordHtml/)
  assert.match(source, /createMistakeFeedbackController/)
  assert.match(source, /prepareAmdMistakeSoundForRecording\(/)
  assert.match(source, /maybeNotifyAmdConfirmedMistake\(/)
  assert.match(source, /toggleAmdMistakeSound\(/)
  assert.match(source, /MISTAKE_HANDLING_MODES/)
}

includesAll('planner ui gated by premium tier', [
  /showHifzPlannerUi\(\) \{\s*return true\s*\}/s,
  /showAiMemorisationButton\(\) \{\s*return this\.aiTestModalsEnabled\s*\}/s,
  /<HifzPlanCreatorModal/,
  /:visible="showHifzPlannerUi && showHifzPlanModal"/,
  /workspaceShellKicker/,
  /<button v-if="!hasVerses" class="action-btn primary" type="button" @click="openAdvancedControls"/,
  /<section v-if="shouldShowWorkspaceEmptyState" class="workspace-empty-state" :aria-label="t\('memorisation\.a11y\.sessionSetup'\)">/,
  /t\('memorisation\.open_session_setup'\)/,
  /v-if="!isSessionCompleted && hasSessionStarted && topCardAppliedPills\.length" v-show="!mainCardCollapsed" class="workspace-quick-controls"/,
  /class="top-card-icon-controls"/,
])

includesAll('session completion success flow', [
  /handleSessionComplete\(\)/,
  /finaliseCompletedSessionOnBackend\(endedSnapshot\)/,
  /openPostSessionModal\(endedSnapshot, \{ previousStreak \}\)/,
  /resolveCompletionGate\(\{[\s\S]*persistenceSucceeded: true/,
  /resolveCompletionGate\(\{[\s\S]*persistenceSucceeded: false/,
  /postSessionActionsUnlocked/,
  /learningApi\.endSession\(/,
  /confirmEndSessionFromExitModal\(\)/,
  /saveSessionForLaterFromExitModal\(\)/,
  /resolveSessionExitTransition/,
  /confirmSessionExit\(\{\s*showSummary: false,\s*openCompletion: true,\s*openPostSessionChoice: false,\s*\}\)/,
  /if \(!rangeComplete\) \{\s*return this\.saveSessionForLaterFromExitModal/,
  /openPostSessionModal\(endedSnapshot/,
  /confirmDescriptionEarly/,
  /openPostSessionChoice\(/,
  /submitPostSessionConfidence/,
  /repeatPostSessionFromCompleted/,
  /openPostSessionNewSessionOffcanvas/,
  /openPostSessionAdjustPlan/,
  /postSessionOffcanvasOpen/,
  /ps-quiz/,
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
  'Keep practising must resume via continueSessionFromExitModal'
)

assert.match(
  source,
  /continueSessionFromExitModal\(\)\s*\{[\s\S]*?resumePausedPlaybackImmediately\(/,
  'continueSessionFromExitModal must resume immediately without countdown'
)

assert.match(
  source,
  /softResumePausedSession\(options = \{\}\)[\s\S]*?resumePausedPlaybackImmediately\(/,
  'soft resume after pause must continue immediately without countdown'
)

assert.doesNotMatch(
  source,
  /softResumePausedSession\(options = \{\}\)[\s\S]*?showCountdown\(/,
  'soft resume must not show the 3-2-1 countdown'
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
  assert.match(
    source,
    /async submitPostSessionConfidence\(confidence\)/,
    'completion flow must keep confidence submission handler'
  )
  assert.match(
    vueOnly,
    /openPostSessionAdjustPlan/,
    'completion modal must allow adjusting the recommended plan'
  )
  assert.match(
    source,
    /\.post-session-simple__confidence/,
    'completion confidence styles remain available'
  )
  assert.match(vueOnly, /postSessionPrimarySurface !== 'builder'/)
  assert.match(
    readFileSync(new URL('../../resources/js/views/Memorisation.css', import.meta.url), 'utf8'),
    /onboarding-post-session-tools\s*\{[\s\S]*?z-index:\s*12720/
  )
}

includesAll('player dock waits for playback', [
  /playerBarVisible\(\) \{[\s\S]*this\.isPlaying[\s\S]*playbackAwaitingGesture/,
  /playbackPillVisible\(\) \{[\s\S]*playerDismissed[\s\S]*!this\.playerVisible[\s\S]*this\.isPlaying \|\| !!this\.playbackAwaitingGesture/,
  /showPlayerDock\(\) \{[\s\S]*showCountdownOverlay[\s\S]*SESSION_MUTATION\.STARTING[\s\S]*return this\.playbackPillVisible[\s\S]*playerBarVisible[\s\S]*talqinRecitationTurnActive\n    \}/,
  /playbackShellActive\(\) \{[\s\S]*showCountdownOverlay[\s\S]*SESSION_MUTATION\.STARTING[\s\S]*return this\.playerBarVisible[\s\S]*talqinRecitationTurnActive\n    \}/,
  /preloadQueueEntryAudio\(preloadEntry, \{ playerVisible: false \}\)/,
  /ensureLiveSessionAudioAttached\(\) \{[\s\S]*preloadQueueEntryAudio\(entry \|\| \{ verse \}, \{ playerVisible: false \}\)/,
  /await this\.audioElement\.play\(\)[\s\S]*this\.isPlaying = true\n\s*this\.playerVisible = true/,
  /attachMainAudioSource\(audioUrl, playGeneration = this\.playGeneration\) \{[\s\S]*player\.attachSource\(audioUrl/,
  /v-if="playerBarVisible"\n\s*class="player-bar"/,
  /syncSessionControlsWithPlayback\(false\)/,
  /playbackAwaitingGesture/,
])

includesAll('audio unlock flow', [
  /primeUiAudioUnlock\(\) \{/,
  /primeAudioPlaybackUnlock\(audioOverride = null, options = \{\}\) \{[\s\S]*this\.primeUiAudioUnlock\(\)[\s\S]*new Audio\(\)[\s\S]*if \(!audioOverride && !this\.audioElement\) \{/,
  /claimAudioElement\(audio\) \{/,
  /isAudioLoadAbortError\(audio = null\) \{/,
  /ensureSessionPlaybackStarted\(options = \{\}\) \{[\s\S]*playQueueEntry\(entry, \{ force: true, queueIndex: this\.queueIndex \}\)/,
  /finalizeCountdownPlayback\(options = \{\}\)/,
  /startSessionWithCountdown[\s\S]*startSession\(\{ deferPlayback: true \}\)[\s\S]*finalizeCountdownPlayback\(\)/,
  /startSessionWithCountdown[\s\S]*noteLearningBackendFailure\(error, 'start'\)[\s\S]*continuing locally/,
  /learningBackendEnabled\(\) \{\s*return !!this\.auth\?\.check && !this\.learningBackendUnavailable/,
  /preloadQueueEntryAudio\(entry, options = \{\}\) \{[\s\S]*this\.claimAudioElement\(audio\)/,
  /normalizeAudioUrl\(url\) \{[\s\S]*cdn\.islamic\.network/,
  /startSessionAndClose\(options = \{\}\)[\s\S]*this\.primeAudioPlaybackUnlock\(\)[\s\S]*this\.startSessionWithCountdown\(\{ skipPrime: true \}\)/,
  /toolsStartInFlight:\s*false/,
  /toolsStartBusy\(\)\s*\{/,
  /modeDataMatchesConfig\(mode\)[\s\S]*await this\.loadVerses\(mode\)/,
  /toasts\.failedToStartSession/,
  /captureAppliedPracticeSetup/,
  /appliedPracticeSetup/,
  /repeatPostSession\(\)[\s\S]*prepareReadySessionFromRecommendedTemplate\([\s\S]*landPostSessionPreparedWorkspace\(\)/,
  /toggleRecordingPlayback\(recording\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: source \}\)[\s\S]*await audio\.play\(\)/,
  /toggleReviewResultAudio\(result = null\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: source \}\)[\s\S]*await playAudioElement\(audio\)/,
  /toggleSelfCheckAyahPlayback\(verse\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: audioUrl \}\)[\s\S]*this\.claimAudioElement\(audio\)[\s\S]*await this\.waitForAudioElementReady\(audio\)[\s\S]*await audio\.play\(\)/,
  /toggleSelfCheckPreview\(verseKey\) \{[\s\S]*this\.primeAudioPlaybackUnlock\(audio, \{ targetUrl: source \}\)[\s\S]*await audio\.play\(\)/,
  /playVerse\([^)]*primePlayback:\s*true/,
  /@click="playVerse\(quizCard, \{ primePlayback: true \}\)"/
])

{
  const mobileGridCss = readFileSync(new URL('../../resources/js/views/Memorisation.mobile-grid.css', import.meta.url), 'utf8')
  assert.match(
    mobileGridCss,
    /\.player-dock\.tools-open\s*\{[\s\S]*?z-index:\s*12470\s*!important/,
    'tools-open player dock must sit under the full-screen controls drawer'
  )
  assert.match(
    mobileGridCss,
    /\.player-dock\.tools-open \> \*[\s\S]*?pointer-events:\s*none\s*!important/,
    'tools-open player dock children must not steal Start Session clicks'
  )
}

includesAll('light theme default', [
  /theme: DEFAULT_THEME/,
  /this\.theme = document\.documentElement\.getAttribute\('data-theme'\) \|\| this\.theme \|\| DEFAULT_THEME/,
  /document\.documentElement\.setAttribute\('data-theme', this\.theme\)/
])

assert.doesNotMatch(
  source,
  /this\.theme = 'dark'[\s\S]*setAttribute\('data-theme', 'dark'\)/,
  'logged-out flow should not force dark mode'
)

includesAll('ai recitation live review signals', [
  /getRecitationPremiumSummary\(result/,
  /recitation-premium-review/,
  /recitation-premium-meter/,
  /colourCorrect/,
  /colourSkipped/,
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
  /activeTargets = document\.querySelectorAll\('\.verse-card\.active, \.mushaf-ayah\.active, \.madani-word\.active'\)/
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
  /\.self-check-header-tools/,
  /v-if="shouldShowOffcanvasTabs"/,
  /shouldShowOffcanvasTabs\(\) \{\s*return true\s*\}/s,
  /if \(this\.recitationCheckRecording \|\| this\.recitationCheckPreparing\) return false/,
  /recitation-premium-review/,
  /recitation-premium-meter/,
  /continueToPlan/,
  /recitation-review-ayah/,
])

assert.doesNotMatch(source, /Grey means the word was not heard yet/, 'obsolete grey description card should be removed')
assert.doesNotMatch(source, /key: 'accuracy', label: 'Accuracy'/, 'accuracy card should be removed')
assert.doesNotMatch(source, /key: 'pace', label: 'Pace'/, 'pace card should be removed')
assert.doesNotMatch(source, /key: 'fixes', label: 'Words to fix'/, 'fixes card should be removed')
assert.doesNotMatch(source, /key: 'jumps', label: 'Big jumps'/, 'jumps card should be removed')
assert.doesNotMatch(source, /getRecitationResultStats\(buildLiveRecitationReviewResult\('recitation'\)\)/, 'live review stats should not render while recording')
assert.doesNotMatch(
  source,
  /v-if="recitationCheckResult"[\s\S]*shared-result-step-badge[\s\S]*getRecitationResultStats\(recitationCheckResult\)/,
  'self-check AI results should not use the dense stepped 5-card stats layout'
)
assert.doesNotMatch(source, /class="verse-status-badge verse-status-badge-review">Review Due<\/span>/, 'per-ayah review due badge should be removed')
assert.doesNotMatch(source, /<div v-if="showSessionEndedModal" class="modal-overlay planner-completion-overlay"/, 'session ended modal should not render')
assert.doesNotMatch(source, /this\.showSelfCheckModal \|\|\s*this\.showRecordingsLibrary/, 'open self-check modal should not force periodic rerenders')

includesAll('offcanvas workspace sync', [
  /flushOffcanvasToWorkspace\(reason = 'offcanvas'\)/,
  /async flushOffcanvasToWorkspace/,
  /await this\.flushOffcanvasToWorkspace\('offcanvas-commit'\)/,
  /Do not flush\/reload the mushaf just for opening controls/,
  /modeDataMatchesConfig\(mode\)/,
  /If Surah\/range\/reciter\/display already match/,
  /syncWorkspaceFromControls\(options = \{\}\)/,
  /applyWorkspaceControls\(options = \{\}\)/,
  /clearWorkspaceForConfigChange\(mode = this\.currentMode\)/,
  /onChapterChange\(event\)/,
  /refreshVerses\(\)/,
  /adjustRange\(options = \{\}\)/,
  /openToolsPanel\(options = \{\}\)[\s\S]*if \(this\.showPostSessionModal\) \{\s*this\.postSessionOffcanvasOpen = true/,
  /resolveCurrentSurahAyahCount\(\)/,
])

assert.doesNotMatch(
  source,
  /openToolsPanel\(options = \{\}\)[\s\S]{0,900}?flushOffcanvasToWorkspace\('offcanvas-open'\)/,
  'opening tools must not flush/wipe the workspace',
)

assert.doesNotMatch(
  source,
  /await this\.closeToolsPanel\(\)\s*\n\s*await this\.flushOffcanvasToWorkspace\('start-session'\)/,
  'start must not double-flush/wipe workspace after closeToolsPanel already synced',
)

assert.doesNotMatch(
  source,
  /if \(this\.showPostSessionModal && !this\.postSessionOffcanvasOpen && !preserveFreshSelection\) \{\s*return/,
  'tools must stay openable so offcanvas changes can apply to the workspace'
)

assert.doesNotMatch(
  source,
  /if \(val && this\.showPostSessionModal && !this\.postSessionOffcanvasOpen\) \{\s*this\.showTools = false/,
  'showTools watcher must not immediately close the tools drawer'
)

includesAll('offcanvas stability hooks', [
  /toolsReturnFocusEl:\s*null/,
  /syncBodyScrollLock\(locked = false\)/,
  /const shouldLock = !!\(locked \|\| this\.showTools \|\| this\.isAnyModalOverlayActive\)/,
  /document\.body\.classList\.toggle\('tools-panel-open', shouldLock\)/,
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
  /new SessionAudioPlayer\(\{/,
  /onPlaying: \(\) => this\.audioPlaying\?\.\(\)/,
  /onRateChange: \(\) => this\.audioRateChange\?\.\(\)/,
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
  /data-live-kind="\$\{this\.escapeCssAttributeValue\(liveKind\)\}"/,
  /data-live-kind="\$\{this\.escapeCssAttributeValue\(patch\.kind \|\| ''\)\}"/,
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
  /onboardingSampleSessionActive/,
  /exitOnboardingSampleMode/,
  /sampleSession:\s*true/,
  /onboardingSampleSessionActive && !options\.sampleSession/,
])

includesAll('workspace idle returning-user journey context', [
  /hasMemorisationHistory\(\)/,
  /showIdleQuickStartChoices\(\)\s*\{[\s\S]*?return false/,
  /showSessionOverviewIdleActions\(\)\s*\{[\s\S]*?return false/,
  /learnerJourneyLoading/,
  /dashboard\.journey_now/,
  /dashboard\.journey_keep_going/,
  /continueLearnerJourney\(\)/,
  /reviewLearnerJourney\(\)/,
  /journeyHasStarted \|\| hasMemorisationHistory/,
])

console.log('mutqin controls wiring passed')
