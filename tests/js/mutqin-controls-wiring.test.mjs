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
  /value="manual" v-model="playMode"/
])

includesAll('technique controls', [
  /name="focus-mode-state" aria-label="Use focus mode" :checked="focusModeEnabled" @change\.prevent="toggleFocusModeRadio"/,
  /@click\.prevent="toggleFocusModeRadio"/,
  /name="blur-mode-state" aria-label="Use blur mode" :checked="blurModeEnabled" @change\.prevent="toggleBlurModeRadio"/,
  /@click\.prevent="toggleBlurModeRadio"/,
  /v-model\.number="blurIntensity"/,
  /name="chaining-state" aria-label="Use chaining" :checked="chainingEnabled" @change\.prevent="toggleChainingRadio"/,
  /@click\.prevent="toggleChainingRadio"/,
  /name="anchor-mode-state" aria-label="Use anchor mode" :checked="anchorModeEnabled" @change\.prevent="toggleAnchorModeRadio"/,
  /@click\.prevent="toggleAnchorModeRadio"/,
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
