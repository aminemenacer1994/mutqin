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
  /focusModeEnabled = !focusModeEnabled/,
  /blurModeEnabled = !blurModeEnabled/,
  /v-model\.number="blurIntensity"/,
  /@click="setChainingEnabled\(!chainingEnabled\)"/,
  /@click="setChainingMethod\('linking'\)"/,
  /@click="setChainingMethod\('cumulative'\)"/,
  /@input="setChainingRepetitions\(Number\(\$event\.target\.value\)\)"/,
  /phase: 'Linking'/,
  /phase: 'Cumulative'/
])

includesAll('reading settings controls', [
  /toggleSettingsOption\('tajweedEnabled'\)/,
  /toggleSettingsOption\('showTranslation'\)/,
  /toggleSettingsOption\('showTransliteration'\)/,
  /toggleSettingsOption\('showWordByWord'\)/,
  /toggleSettingsOption\('wordByWordAudioEnabled'\)/,
  /updateSettingsValue\('defaultFontSize', Number\(\$event\.target\.value\)\)/,
  /applySettingsChanges\(\{ silent: true \}\)/,
  /syncSettingsDraft\(\)/,
  /toggleSettingsOption\(key\)/,
  /updateSettingsValue\(key, value\)/
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

console.log('mutqin controls wiring passed')
