import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASK_MUTQIN_STATES } from '../../resources/js/scripts/askMutqin/states.js'
import {
  resolveAskMutqinRange,
  snapAskMutqinSpeed,
} from '../../resources/js/scripts/askMutqin/range.js'
import { matchHeardAyahPrefix } from '../../resources/js/scripts/askMutqin/matchAyah.js'
import {
  appendHeardPayload,
  createHeardStream,
  heardStreamText,
} from '../../resources/js/scripts/askMutqin/heardStream.js'
import { tokenizeForMatch } from '../../resources/js/scripts/memorisationDetection/speechMatch.js'
import { SURAH_NAMES } from '../../resources/js/scripts/engine/hifz_session_engine.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisation = [
  readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8'),
  readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8'),
  readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8'),
].join('\n')
const modal = readFileSync(join(root, 'resources/js/components/AskMutqinModal.vue'), 'utf8')
const modalCss = readFileSync(join(root, 'resources/js/components/AskMutqinModal.css'), 'utf8')

assert.match(memorisation, /workspace-ask-mutqin-cta/, 'Ask Mutqin CTA sits in the workspace header')
assert.match(memorisation, /data-testid="workspace-ask-mutqin"/, 'header Ask Mutqin has a test id')
assert.match(memorisation, /openAskMutqin/, 'header opens Ask Mutqin')
assert.match(memorisation, /AskMutqinModal/, 'workspace mounts the Ask Mutqin modal')
assert.match(memorisation, /webpackChunkName: "ask-mutqin-modal"/, 'Ask Mutqin is lazy-loaded')
assert.match(memorisation, /workspace-ai-cta-pair/, 'Ask Mutqin sits beside AI Recite')
assert.match(memorisation, /\[data-theme="light"\] \.workspace-ask-mutqin-cta/, 'light theme')
assert.match(memorisation, /\[data-theme="sepia"\] \.workspace-ask-mutqin-cta/, 'sepia theme')
assert.match(memorisation, /\[data-theme="dark"\] \.workspace-ask-mutqin-cta/, 'dark theme')
assert.match(memorisation, /border-radius: 999px !important/, 'Ask / AI Recite share pill shape')
assert.doesNotMatch(modal, /state === 'intro'/, 'intro is not a separate modal step')
assert.match(modal, /this\.startSession\(\)/, 'listening starts when the modal opens')
assert.doesNotMatch(modal, /ask-mutqin-orb/, 'voice orb is removed')
assert.doesNotMatch(modal, /bi-stars|ask-mutqin-brand/, 'sparkle brand mark is removed')
assert.doesNotMatch(modal, /ask-mutqin-progress|wordProgress/, 'word progress bar is removed')
assert.match(modal, /ask-mutqin-ayah/, 'Qur’anic Arabic panel is present')
assert.match(modal, /streamingText|ask-mutqin-ayah__verse/, 'live recitation shows flowing Arabic text')
assert.doesNotMatch(modal, /possibleMatches|ask-mutqin-candidates/, 'possible matches list is hidden')
assert.match(modal, /settleAfterRecitationPause/, 'results wait until the user pauses reciting')
assert.match(modal, /ASK_MUTQIN_RECITATION_PAUSE_MS = 1000/, 'results settle after a 1s gap')
assert.match(modal, /lastHeardForPause/, 'pause timer ignores unchanged partials')
assert.match(modal, /ask-mutqin-recording/, 'recording indicator is shown while listening')
assert.doesNotMatch(modal, /transcriptPhase|ask-mutqin-results/, 'legacy phase/result chrome is removed')
assert.match(modal, /matchMeta/, 'matched ayah shows surah · ayah in the panel bar')
assert.match(modal, /quranFontFamily/, 'modal uses the workspace Qur’an font')
assert.match(modal, /askMutqin.tipShort/, 'short tip copy lives on the listening screen')
assert.doesNotMatch(modal, /askMutqin.searchIn|v-model.number="searchSurah"/, 'no surah search dropdown')
assert.doesNotMatch(modal, /ask-mutqin-examples/, 'examples are not a stacked list')
assert.match(modal, /ask-mutqin-actions|ask-mutqin-range/, 'open ayah / range actions are compact')
assert.match(modal, /openActionsHint/, 'open actions include a short hint')
assert.match(modal, /clearScreen|askMutqin.clearScreen/, 'clear action is available')
assert.match(modal, /retryRecording|askMutqin.retryRecording/, 'retry recording action is available')
assert.match(modal, /resetAyahScroll/, 'ayah stage resets to the start of the verse')
assert.match(modalCss, /z-index: 12050/, 'Ask Mutqin overlays the navbar')
assert.match(modalCss, /position: fixed !important/, 'Ask Mutqin overlay stays fixed')
assert.match(modalCss, /ask-mutqin-ayah__stage/, 'ayah text sits in a padded stage')
assert.match(modalCss, /overflow-y: auto/, 'ayah stage scrolls for long text')
assert.match(modalCss, /ask-mutqin-actions|ask-mutqin-range/, 'bottom open actions are compact')
assert.match(modalCss, /ask-mutqin-recording-pulse/, 'recording pulse animation exists')
assert.match(modalCss, /padding-inline: 0\.8rem/, 'mobile side padding is tightened')
assert.match(modalCss, /session-progress-rail/, 'session progress hides while Ask Mutqin is open')
assert.match(modalCss, /Amiri Quran|UthmanicHafs/, 'Islamic Qur’anic font stack is used')
assert.match(memorisation, /askMutqin\.ctaShort/, 'Ask Mutqin CTA uses a short label')
assert.match(
  readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8'),
  /workspace-ask-mutqin-cta[\s\S]*?bi-mic/,
  'Ask Mutqin CTA uses a mic icon',
)
assert.doesNotMatch(
  readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8'),
  /workspace-ask-mutqin-cta[\s\S]{0,220}?bi-stars|workspace-ai-recite-cta[\s\S]{0,220}?bi-stars/,
  'workspace Ask / AI Recite CTAs no longer use sparkle icons',
)
assert.match(modalCss, /prefers-reduced-motion/, 'modal respects reduced motion')
assert.match(modalCss, /data-theme="dark"/, 'modal has dark styles')
assert.match(modalCss, /data-theme="sepia"/, 'modal has sepia styles')

const mulk = resolveAskMutqinRange({ surah: 67, ayahStart: 6, count: 5 })
assert.equal(mulk.ayahStart, 6)
assert.equal(mulk.ayahEnd, 10)

const after = resolveAskMutqinRange({ surah: 67, ayahStart: 6, count: 5, afterThis: true })
assert.equal(after.ayahStart, 7)
assert.equal(after.ayahEnd, 11)

const until = resolveAskMutqinRange({ surah: 67, ayahStart: 6, untilAyah: 12 })
assert.equal(until.ayahStart, 6)
assert.equal(until.ayahEnd, 12)

const just = resolveAskMutqinRange({ surah: 67, ayahStart: 6, justThis: true })
assert.equal(just.ayahStart, 6)
assert.equal(just.ayahEnd, 6)

const openHere = resolveAskMutqinRange({ surah: 67, ayahStart: 6 })
assert.equal(openHere.ayahStart, 6)
assert.equal(openHere.ayahEnd, 6)
assert.equal(openHere.openEnded, true)

assert.equal(snapAskMutqinSpeed(0.8), 0.75)
assert.match(
  readFileSync(join(root, 'resources/js/scripts/askMutqin/reciters.js'), 'utf8'),
  /mishary:\s*'ar\.alafasy'/,
  'Mishary maps to the existing Alafasy reciter',
)

function buildIndex(surahs) {
  return surahs.flatMap((surah) => (surah.ayahs || []).map((ayah) => ({
    key: `${surah.number}:${ayah.numberInSurah}`,
    surah: surah.number,
    ayah: ayah.numberInSurah,
    surahName: surah.englishName || SURAH_NAMES[surah.number - 1],
    words: tokenizeForMatch(ayah.text || ''),
  })))
}

const index = buildIndex([
  {
    number: 67,
    englishName: 'Al-Mulk',
    ayahs: [
      { numberInSurah: 1, text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ' },
      { numberInSurah: 6, text: 'وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ' },
    ],
  },
  {
    number: 1,
    englishName: 'Al-Fatiha',
    ayahs: [
      { numberInSurah: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
      { numberInSurah: 2, text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
    ],
  },
])

const unique = matchHeardAyahPrefix(index, 'تبارك الذي بيده')
assert.equal(unique.status, 'matched')
assert.equal(unique.match.surah, 67)
assert.equal(unique.match.ayah, 1)

const ambiguous = matchHeardAyahPrefix(index, 'الحمد')
assert.notEqual(ambiguous.status, 'matched')

const threeWords = matchHeardAyahPrefix(index, 'الحمد لله رب')
assert.equal(threeWords.status, 'matched')
assert.equal(threeWords.match.ayah, 2)

let stream = createHeardStream()
for (const word of ['تبارك', 'الذي', 'بيده']) {
  stream = appendHeardPayload(stream, { type: 'final', transcript: word, words: [{ word }] })
}
assert.equal(heardStreamText(stream), 'تبارك الذي بيده')
const incremental = matchHeardAyahPrefix(index, heardStreamText(stream))
assert.equal(incremental.status, 'matched')
assert.equal(incremental.match.ayah, 1)

// Partials must grow on top of committed finals without wiping them.
stream = createHeardStream()
stream = appendHeardPayload(stream, { type: 'final', transcript: 'والله', words: [{ word: 'والله' }] })
stream = appendHeardPayload(stream, { type: 'partial', transcript: 'لا يحب', words: [{ word: 'لا' }, { word: 'يحب' }] })
assert.equal(heardStreamText(stream), 'والله لا يحب')
stream = appendHeardPayload(stream, { type: 'final', transcript: 'لا', words: [{ word: 'لا' }] })
assert.equal(heardStreamText(stream), 'والله لا')
stream = appendHeardPayload(stream, {
  type: 'partial',
  transcript: 'يحب الفساد',
  words: [{ word: 'يحب' }, { word: 'الفساد' }],
})
assert.equal(heardStreamText(stream), 'والله لا يحب الفساد')

stream = appendHeardPayload(createHeardStream(), { type: 'partial', transcript: 'تبارك' })
assert.equal(matchHeardAyahPrefix(index, heardStreamText(stream)).status, 'insufficient')

assert.equal(ASK_MUTQIN_STATES.INTRO, 'intro')
assert.equal(ASK_MUTQIN_STATES.LISTENING_COMMAND, 'listening_command')

console.log('ask-mutqin.test.mjs: ok')
