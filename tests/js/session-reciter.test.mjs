import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ayahUrlMatchesGlobalNumber,
  ayahUrlMatchesReciter,
  isDuplicateReciterCommit,
  orderAyahAudioCandidateUrls,
  resolvePickedReciterId,
  shouldApplyReciterSelectChange,
} from '../../resources/js/scripts/audio/sessionReciter.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const runtimeJs = readFileSync(join(root, 'resources/js/scripts/memorisationRuntime.js'), 'utf8')
const blade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')

assert.match(runtimeJs, /export function reciterSupportsWordHighlighting\(\) \{\s*return true\s*\}/)
assert.doesNotMatch(runtimeJs, /supportsWordHighlighting: false/)

assert.equal(resolvePickedReciterId('ar.abdurrahmaansudais', 'ar.alafasy'), 'ar.abdurrahmaansudais')
assert.equal(resolvePickedReciterId('', 'ar.alafasy'), 'ar.alafasy')

assert.equal(shouldApplyReciterSelectChange({
  syncing: false,
  selectReady: true,
  pickedId: 'ar.abdurrahmaansudais',
}), true, 'a user pick must always apply')

assert.equal(shouldApplyReciterSelectChange({
  syncing: true,
  selectReady: true,
  pickedId: 'ar.abdurrahmaansudais',
}), false, 'programmatic select.value writes must not look like user picks')

assert.equal(shouldApplyReciterSelectChange({
  syncing: false,
  selectReady: false,
  pickedId: 'ar.alafasy',
}), false, 'ignore the first paint before the native select is synced')

assert.equal(
  isDuplicateReciterCommit('ar.abdurrahmaansudais', 'ar.abdurrahmaansudais', 1000, 1040),
  true,
)
assert.equal(
  isDuplicateReciterCommit('ar.husary', 'ar.abdurrahmaansudais', 1000, 1040),
  false,
  'switching reciters again must not be treated as a duplicate',
)

assert.equal(ayahUrlMatchesReciter('https://cdn.islamic.network/quran/audio/128/ar.abdurrahmaansudais/1.mp3', 'ar.abdurrahmaansudais'), true)
assert.equal(ayahUrlMatchesReciter('https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3', 'ar.abdurrahmaansudais'), false)

assert.equal(ayahUrlMatchesGlobalNumber('/audio/ayah/ar.alafasy/5376.mp3', 5376), true)
assert.equal(ayahUrlMatchesGlobalNumber('https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3', 5376), false)

const staleExisting = orderAyahAudioCandidateUrls({
  reciterId: 'ar.alafasy',
  globalAyahNumber: 5376,
  bundledUrl: '/audio/ayah/ar.alafasy/5376.mp3',
  existingUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
})
assert.equal(staleExisting[0], '/audio/ayah/ar.alafasy/5376.mp3')
assert.ok(
  !staleExisting.includes('https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3'),
  'stale verse.audio with the wrong global ayah must not be reused',
)

const sudaisUrls = orderAyahAudioCandidateUrls({
  reciterId: 'ar.abdurrahmaansudais',
  globalAyahNumber: 1,
  existingUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
})
assert.equal(sudaisUrls[0], 'https://cdn.islamic.network/quran/audio/128/ar.abdurrahmaansudais/1.mp3')

const proxiedUrls = orderAyahAudioCandidateUrls({
  reciterId: 'ar.alafasy',
  globalAyahNumber: 262,
  bundledUrl: '/audio/ayah/ar.alafasy/262.mp3',
})
assert.equal(proxiedUrls[0], '/audio/ayah/ar.alafasy/262.mp3')
assert.ok(
  !sudaisUrls.some((url) => url.includes('ar.alafasy')),
  'Sudais playback must not fall through to Mishary',
)

assert.match(memorisationJs, /commitSessionReciter\(/)
assert.match(memorisationJs, /wordByWordAudioEnabled = true/)
assert.match(
  memorisationJs,
  /async startWordHighlighting\(verse, options = \{\}\) \{\s*this\.ensureWordAudioHighlighting\(\)\s*if \(!verse\?\.key \|\| !this\.wordByWordAudioEnabled\) return/,
)
assert.doesNotMatch(
  memorisationJs,
  /_mobileReciterSelectSilenceUntil/,
  'time-based reciter silence must not come back — it reverted real user picks',
)
assert.doesNotMatch(
  memorisationJs,
  /this\.reciterId = expected/,
  'never revert a chosen reciter back to the previous voice',
)
assert.doesNotMatch(
  memorisationJs,
  /armMobileReciterSelectSilence/,
)
assert.match(
  memorisationVue,
  /onMadaniFullscreenReciterChange\(\$event\)/,
)
assert.match(
  memorisationVue,
  /onMadaniFullscreenReciterPointerDown/,
  'native overlay select must hold the picker open on pointerdown',
)
assert.doesNotMatch(
  memorisationVue,
  /@click\.prevent="openMadaniFullscreenReciterSelect"/,
  'label must not re-open showPicker on top of the native select',
)
assert.doesNotMatch(
  memorisationVue,
  /madani-fullscreen-bar__reciter-select[\s\S]{0,180}:key="mobileReciterSelectRenderKey"/,
  'fullscreen reciter select must not remount on catalog refresh',
)
assert.match(blade, /mutqin-mobile-reciter-v196/)
assert.match(blade, /isSetupReciterSelect/)
assert.doesNotMatch(
  blade,
  /madani-fullscreen-bar__reciter-select'\)\) return true/,
  'blade must not steal fullscreen reciter changes from Vue',
)

console.log('session-reciter.test.mjs: ok')
