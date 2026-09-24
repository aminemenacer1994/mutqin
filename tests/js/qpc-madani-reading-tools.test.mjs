import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  QPC_MADANI_TAJWEED_SUPPORTED,
  buildQpcMadaniCodeV2ByLocation,
  isQcfPageGlyphText,
  resolveQpcMadaniTajweedPresentation,
  resolveQpcMadaniWordGlyph,
  shouldShowQpcMadaniReadingAids,
} from '../../resources/js/scripts/mushaf/qpcMadaniReadingTools.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')
const spreadVue = readFileSync(join(root, 'resources/js/components/madani/MadaniSpread.vue'), 'utf8')
const lineVue = readFileSync(join(root, 'resources/js/components/madani/MadaniLine.vue'), 'utf8')
const pageVue = readFileSync(join(root, 'resources/js/components/madani/MadaniPage.vue'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')

assert.equal(QPC_MADANI_TAJWEED_SUPPORTED, true)
assert.deepEqual(resolveQpcMadaniTajweedPresentation(false), {
  supported: true,
  requested: false,
  effectiveEnabled: false,
})
assert.deepEqual(resolveQpcMadaniTajweedPresentation(true), {
  supported: true,
  requested: true,
  effectiveEnabled: true,
})
assert.equal(shouldShowQpcMadaniReadingAids({ showTranslation: true }), false)
assert.equal(shouldShowQpcMadaniReadingAids({ showWordByWord: true, wordTooltipText: ' mercy' }), false)
assert.equal(shouldShowQpcMadaniReadingAids({}), false)

const map = buildQpcMadaniCodeV2ByLocation([
  {
    key: '2:30',
    words: [{ position: 1, code_v2: 'ﱁ', location: '2:30:1' }],
  },
])
assert.equal(map['2:30:1'], 'ﱁ')

const glyph = resolveQpcMadaniWordGlyph({
  word: { location: '2:30:1', text: 'QPC', page: 6 },
  tajweedEnabled: true,
  codeV2ByLocation: map,
})
assert.equal(glyph.useTajweedFont, true)
assert.equal(glyph.text, 'ﱁ')
assert.match(glyph.fontFamily, /^p6-v4$/)

assert.equal(isQcfPageGlyphText('ﱁ'), true)
assert.equal(isQcfPageGlyphText('mercy'), false)

const glyphFromPageJson = resolveQpcMadaniWordGlyph({
  word: { location: '4:2:14', text: 'ﱰ', page: 77 },
  tajweedEnabled: true,
  codeV2ByLocation: {},
})
assert.equal(glyphFromPageJson.useTajweedFont, true)
assert.equal(glyphFromPageJson.text, 'ﱰ')
assert.match(glyphFromPageJson.fontFamily, /^p77-v4$/)

assert.match(memorisationJs, /qpcMadaniAidVerse/)
assert.match(memorisationJs, /showQpcMadaniReadingAids/)
assert.match(memorisationJs, /qpcMadaniFontScale/)
assert.match(memorisationJs, /qpcMadaniCodeV2ByLocation/)
assert.match(memorisationJs, /qpcMadaniTajweedCodeByLocation/)
assert.match(memorisationJs, /qpcMadaniTajweedPresentation\.effectiveEnabled/)
assert.match(memorisationJs, /resolveQpcWordAudioIndex/)
assert.match(memorisationJs, /playWordAudio\('', verse, wordIndex\)/)
assert.match(memorisationJs, /onQpcMadaniAyahEnter/)
assert.match(memorisationJs, /syncQpcMadaniTajweedGlyphsForViewport/)
assert.match(memorisationJs, /buildQpcMadaniCodeV2FromMadaniApiVerses/)
assert.match(memorisationJs, /goToPreviousQpcMadaniPage/)
assert.match(memorisationVue, /madani-qpc-icon-btn--nav/)
assert.match(memorisationVue, /madani-qpc-chrome/)
assert.doesNotMatch(memorisationVue, /madani-qpc-chrome[\s\S]{0,500}mushaf-font-zoom__recite/)
assert.doesNotMatch(memorisationJs, /madaniQpcTajweedUnsupported/)
assert.doesNotMatch(memorisationVue, /mushaf-translation-panel/)
assert.doesNotMatch(memorisationVue, /readingViewMode === 'stacked' \|\| readingViewMode === 'madani_mushaf'/)
assert.match(memorisationVue, /toggleFullScreen/)
assert.match(memorisationVue, /top-card-menu--fixed/)
assert.match(memorisationJs, /syncTopCardMenuPosition/)
assert.doesNotMatch(memorisationJs, /buildMadaniAmdHiddenIndexesByAyah[\s\S]{0,400}qpcMadaniTechniqueSnapshot/)
assert.match(memorisationJs, /enterNativeFullscreen/)
assert.match(memorisationVue, /madani-qpc-fullscreen-exit/)
assert.match(pageVue, /--qpc-line-height: 1\.32/)
assert.match(pageVue, /--qpc-surah-title-scale: 2\.45/)
assert.match(memorisationCss, /invert\(1\) hue-rotate\(180deg\)/)
assert.match(lineVue, /overflow: visible/)
assert.match(lineVue, /--qpc-line-height, 1\.32\)/)
assert.match(lineVue, /qpc-madani-line--ayah/)
assert.match(lineVue, /qpc-madani-surah-header/)
assert.match(lineVue, /qpc-madani-surah-name/)
assert.doesNotMatch(lineVue, /qpc-madani-surah-header__frame/)
assert.doesNotMatch(lineVue, /MadaniSurahHeading/)
assert.match(pageVue, /Math\.min\(cap \* requested, widthFit\)/)
assert.doesNotMatch(memorisationJs, /scale \* 1\.72/)
assert.match(memorisationJs, /offerMadaniMobileImmersiveReading/)
assert.match(memorisationVue, /madani-qpc-icon-btn--fullscreen/)
assert.match(memorisationVue, /madani-session-scroll/)
assert.match(memorisationCss, /is-app-fullscreen[\s\S]*madani-qpc-mode-active[\s\S]*workspace-shell/)
assert.match(memorisationCss, /top-card-menu--fixed/)
assert.match(memorisationCss, /is-app-fullscreen \.workspace-recite-dock/)
assert.match(memorisationVue, /:font-scale="qpcMadaniFontScale"/)
assert.match(memorisationVue, /:tajweed-enabled="qpcMadaniTajweedPresentation.effectiveEnabled"/)
assert.match(memorisationVue, /readingViewMode === 'madani_mushaf'/)
assert.match(memorisationVue, /madani-qpc-chrome__tools/)
assert.doesNotMatch(memorisationVue, /madani-spread[\s\S]{0,400}verse-translation/)
assert.match(wordVue, /resolveQpcMadaniWordGlyph/)
assert.match(wordVue, /qpc-madani-word--tajweed-glyph/)
assert.match(wordVue, /ayah-enter/)
assert.match(spreadVue, /prefetchQcfPageFonts/)
assert.match(lineVue, /isBasmalaLine/)
assert.match(lineVue, /lineType === 'basmallah' \|\| this\.lineType === 'basmala'/)
assert.match(lineVue, /بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ/)
assert.match(lineVue, /font-feature-settings: "liga" 1/)
assert.match(memorisationVue, /madani-qpc-nav-chevron/)
assert.match(memorisationCss, /\[data-theme="dark"\] \.madani-qpc-viewport \.qpc-madani-surah-name/)

console.log('qpc-madani-reading-tools.test.mjs: ok')
