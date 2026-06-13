import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../resources/js/components/Memorisation.vue', import.meta.url), 'utf8')

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
  /Delay between recitations \(secs\)/,
  /<select v-model\.number="delay" class="select">/,
  /option in delayOptions/
])

includesAll('technique controls', [
  /aria-label="Use focus mode" @click="toggleFocusModeRadio"/,
  /:aria-pressed="focusModeEnabled \? 'true' : 'false'"/,
  /aria-label="Use blur mode" @click="toggleBlurModeRadio"/,
  /:aria-pressed="blurModeEnabled \? 'true' : 'false'"/,
  /v-model\.number="blurIntensity"/,
  /aria-label="Use chaining" @click="toggleChainingRadio"/,
  /:aria-pressed="chainingEnabled \? 'true' : 'false'"/,
  /aria-label="Use anchor mode" @click="toggleAnchorModeRadio"/,
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
  /@click="wordByWordAudioEnabled = !wordByWordAudioEnabled"/,
  /applySettingsChanges\(\{ silent: true \}\)/,
  /syncSettingsDraft\(\)/,
  /toggleSettingsOption\(key\)/,
  /updateSettingsValue\(key, value\)/
])

includesAll('tajweed independence', [
  /title="Show tajweed colouring from the Quran API" @click="toggleTajweed"/,
  /if \(this\.wordByWordAudioEnabled \|\| this\.tajweedEnabled\) \{\s*return this\.splitArabicIntoWords\(verse\)\s*\}/s,
  /toggleTajweed\(\) \{/,
  /this\.tajweedEnabled = !this\.tajweedEnabled/,
  /this\.showBanner\(\s*this\.tajweedEnabled \? 'Tajweed colors enabled' : 'Tajweed colors disabled'/s
])

includesAll('workspace application', [
  /v-if="showTransliteration && verse\.transliteration"/,
  /v-if="showTranslation && verse\.translation"/,
  /v-if="showWordByWord && verse\.words && verse\.words\.length"/,
  /v-if="word\.audio && wordByWordAudioEnabled"/,
  /'--verse-font-percent': getVerseFontSize\(verse\.key\)/,
  /'focus-mode-active': focusModeEnabled/,
  /'blur-mode-active': blurModeEnabled/,
  /'blur-upcoming': blurModeEnabled && isVerseBlurred\(verse\.key\)/
])

includesAll('offcanvas main-card linkage', [
  /topCardAppliedPills\(\) \{/,
  /key: 'progress'/,
  /key: 'percent'/,
  /key: 'tajweed'/,
  /key: 'translation'/,
  /key: 'transliteration'/,
  /key: 'wbw'/,
  /key: 'word-audio'/,
  /key: 'fallback'/,
  /this\.syncSettingsDraft\(\)\s*this\.persistUiState\(\)/,
  /toggleTajweed\(\) \{\s*this\.tajweedEnabled = !this\.tajweedEnabled\s*this\.syncSettingsDraft\(\)/s,
  /selectFont\(fontValue\) \{\s*this\.quranFont = fontValue\s*this\.fontDropdownOpen = false\s*this\.syncSettingsDraft\(\)/s,
  /updateDefaultFontSize\(\) \{[\s\S]*this\.syncSettingsDraft\(\)/,
  /class="quick-right-controls"/
])

includesAll('ai recitation speechmatics stability', [
  /const RECITATION_LIVE_INTERIM_CONFIDENCE_THRESHOLD = 0\.35/,
  /confidence: Number\.isFinite\(confidence\) \? confidence : \(isPartial \? SPEECHMATICS_PARTIAL_CONFIDENCE : 1\)/,
  /const words = extractSpeechmaticsTranscriptWords\(message, \{ isPartial: !isFinal \}\)/,
  /const transcript = String\(message\?\.metadata\?\.transcript \|\| ''\)\.trim\(\) \|\| words\.map\(item => item\.word\)\.join\(' '\)/,
  /displayWords: Array\.isArray\(state\?\.interimWords\) && state\.interimWords\.length \? state\.interimWords : committedWords/,
  /const liveAlignmentOptions = \{\s*strictProgression: kind === 'memorisation' \|\| this\.isAiTutorModeActive\(\),/,
  /@click\.stop="toggleVerseActionMenu\(verse\.key\)"/
])

includesAll('ai recitation full-session recording', [
  /isSessionRecitationCheckActive\(\)/,
  /shouldAutoStopRecitationCheckFromAlignment\(alignment = null\)/,
  /shouldAutoStopRecitationCheckFromSilence\(\)/,
  /if \(this\.recitationCheckScope === 'session' && this\.recitationCheckPendingTargets\?\.length\) return this\.recitationCheckPendingTargets/,
  /if \(!this\.isSessionRecitationCheckActive\(\)\) return true\s*return !!this\.recitationAlignmentState\?\.complete/s
])

includesAll('ai memorisation mirrors recitation modal', [
  /aria-label="AI memorisation tools"/,
  /Play Memorisation/,
  /Blur Everything/,
  /class="recitation-check-panel recitation-check-panel-inline memorisation-checker-panel"/,
  /ref="aiMemorisationCheckerResults"/,
  /v-if="isAiMemorisationCheckerReviewActive \|\| aiMemorisationCheckerError"/,
  /Memorisation review/,
  /showMarkers \|\| this\.aiMemorisationCheckerScope === 'session' \|\| this\.aiMemorisationCheckerTargets\.length > 1/,
  /AI Memorisation uses the same modal structure and spacing as AI Recite/
])

assert.doesNotMatch(
  source,
  /<span class="recitation-check-section-label">AI memorisation check<\/span>/,
  'AI memorisation idle check container should not render'
)

includesAll('ai recitation simplified workspace', [
  /class="self-check-header-tools"/,
  /aria-label="Play ayah once"/,
  /key: 'pending', label: 'Grey'/,
  /tone: 'tone-grey'/,
  /const status = word\.status === 'pending' \? 'pending' : word\.status/,
  /recitation-review-ayah \.wbw-word/,
  /recitation-result-stats,[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/
])

assert.doesNotMatch(source, /Grey means the word was not heard yet/, 'obsolete grey description card should be removed')

includesAll('offcanvas workspace sync', [
  /syncWorkspaceFromControls\(options = \{\}\)/,
  /applyWorkspaceControls\(options = \{\}\)/,
  /clearWorkspaceForConfigChange\(mode = this\.currentMode\)/,
  /onChapterChange\(event\)/,
  /refreshVerses\(\)/
])

includesAll('offcanvas stability hooks', [
  /toolsReturnFocusEl:\s*null/,
  /syncBodyScrollLock\(locked\)/,
  /document\.body\.classList\.toggle\('tools-panel-open', !!locked\)/,
  /focusToolsPanel\(\)/,
  /restoreToolsFocus\(\)/,
  /const panelBody = this\.\$refs\.toolsBody/,
  /if \(this\.showTools\) \{\s*event\.preventDefault\(\)\s*this\.closeToolsPanel\(\)\s*return/s
])

includesAll('word audio sync stability', [
  /wordHighlightRequestId:\s*0/,
  /findWordTimingIndex\(currentTime, timestamps = this\.wordHighlightTimestamps\)/,
  /queueWordHighlightFrame\(verse = this\.activeVerseRef\)/,
  /ensureWordHighlightTrack\(verse, options = \{\}\)/,
  /this\.audioElement\.removeEventListener\('playing', this\.audioPlaying\)/,
  /this\.audioElement\.removeEventListener\('ratechange', this\.audioRateChange\)/,
  /this\.audioElement\.addEventListener\('playing', this\.audioPlaying\)/,
  /this\.audioElement\.addEventListener\('ratechange', this\.audioRateChange\)/,
  /this\.ensureWordHighlightTrack\(verse\)\.then\(\(\) => \{/,
  /this\.syncWordHighlightFromAudio\(this\.activeVerseRef\)/,
  /if \(this\.isPlaying\) this\.queueWordHighlightFrame\(this\.activeVerseRef\)/
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

console.log('mutqin controls wiring passed')
