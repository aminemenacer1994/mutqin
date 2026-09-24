import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  QPC_MADANI_TAJWEED_SUPPORTED,
  buildQpcMadaniCodeV2ByLocation,
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

assert.match(memorisationJs, /qpcMadaniAidVerse/)
assert.match(memorisationJs, /showQpcMadaniReadingAids/)
assert.match(memorisationJs, /qpcMadaniFontScale/)
assert.match(memorisationJs, /qpcMadaniCodeV2ByLocation/)
assert.match(memorisationJs, /buildQpcMadaniCodeV2ByLocation/)
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
assert.match(pageVue, /--qpc-line-height: 1\.68/)
assert.match(pageVue, /--qpc-line-height: 1\.96/)
assert.match(lineVue, /overflow: visible/)
assert.match(lineVue, /min-height: calc\(var\(--qpc-word-size, 22px\) \* 1\.68\)/)
assert.match(pageVue, /Math\.min\(cap \* requested, widthFit\)/)
assert.match(memorisationJs, /isMobileViewport\(\)[\s\S]*scale \* 1\.36/)
assert.match(memorisationJs, /offerMadaniMobileImmersiveReading/)
assert.match(memorisationVue, /madani-qpc-mobile-fullscreen-offer/)
assert.match(memorisationVue, /mobileFullScreenOffer/)
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
assert.match(memorisationCss, /qpc-madani-page--tajweed \.qpc-madani-surah-name/)

console.log('qpc-madani-reading-tools.test.mjs: ok')
