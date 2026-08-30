import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  arabicJuzLabel,
  juzNumberFromMadaniPage,
  canStepOriginalMadaniPage,
  canStepSessionMadaniPage,
  constrainMadaniPageToSet,
  getSessionMadaniSpreadPages,
  stepSessionMadaniPage,
  clampMadaniPageNumber,
  getMadaniSpreadPages,
  groupMadaniLineSegments,
  highlightableMadaniWords,
  layoutMadaniOverlayWords,
  madaniWordVisualWeight,
  typicalMadaniLineChars,
  typicalMadaniLineWeight,
  MADANI_AYAH_MARKER_WEIGHT,
  isOpeningMadaniPage,
  isOriginalMadaniView,
  isPageLayoutView,
  isReadingViewMode,
  MADANI_TOTAL_PAGES,
  normalizeMadaniImageWidth,
  normalizeReadingViewMode,
  originalMadaniFrameVariant,
  originalMadaniPageImageUrl,
  originalMadaniPagesToPrefetch,
  originalMadaniLineBox,
  originalMadaniTextInsets,
  originalMadaniZoomFromFontSize,
  preferredMadaniImageWidth,
  stepOriginalMadaniPage,
} from '../../resources/js/scripts/mushaf/originalMadaniMushaf.js'

assert.equal(MADANI_TOTAL_PAGES, 604)
assert.equal(isReadingViewMode('original'), true)
assert.equal(isReadingViewMode('stacked'), true)
assert.equal(isReadingViewMode('cards'), false)
assert.equal(normalizeReadingViewMode('original'), 'original')
assert.equal(normalizeReadingViewMode('nope'), 'mushaf')
assert.equal(isOriginalMadaniView('original'), true)
assert.equal(isPageLayoutView('mushaf'), true)
assert.equal(isPageLayoutView('original'), true)
assert.equal(isPageLayoutView('stacked'), false)

assert.equal(clampMadaniPageNumber(0), 1)
assert.equal(clampMadaniPageNumber(605), 604)
assert.equal(clampMadaniPageNumber(50.6), 51)

assert.deepEqual(getMadaniSpreadPages(1), { left: 2, right: 1 })
assert.deepEqual(getMadaniSpreadPages(2), { left: 2, right: 1 })
assert.deepEqual(getMadaniSpreadPages(5), { left: 6, right: 5 })
assert.deepEqual(getMadaniSpreadPages(604), { left: 604, right: 603 })

assert.equal(stepOriginalMadaniPage(1, 1, { spread: false }), 2)
assert.equal(stepOriginalMadaniPage(1, -1, { spread: false }), 1)
assert.equal(stepOriginalMadaniPage(1, 1, { spread: true }), 3)
assert.equal(stepOriginalMadaniPage(5, -1, { spread: true }), 3)
assert.equal(stepOriginalMadaniPage(603, 1, { spread: true }), 604)
assert.equal(canStepOriginalMadaniPage(1, -1, { spread: false }), false)
assert.equal(canStepOriginalMadaniPage(604, 1, { spread: false }), false)
assert.equal(canStepOriginalMadaniPage(1, 1, { spread: true }), true)

assert.equal(normalizeMadaniImageWidth(900), 800)
assert.equal(normalizeMadaniImageWidth(1100), 1024)
assert.equal(normalizeMadaniImageWidth(2000), 1920)
assert.equal(preferredMadaniImageWidth({ spread: true, viewportWidth: 1400, devicePixelRatio: 2 }), 1260)

assert.equal(originalMadaniPageImageUrl(1, 1024), '/memorisation/mushaf-page/1.png?w=1024')
assert.equal(originalMadaniPageImageUrl(50, 1260), '/memorisation/mushaf-page/50.png?w=1260')

const prefetch = originalMadaniPagesToPrefetch(5, { spread: true })
assert.ok(prefetch.includes(5))
assert.ok(prefetch.includes(6))
assert.ok(prefetch.includes(3))
assert.ok(prefetch.includes(7))

assert.equal(isOpeningMadaniPage(1), true)
assert.equal(isOpeningMadaniPage(3), false)
assert.equal(originalMadaniFrameVariant(2), 'opening')
assert.equal(originalMadaniFrameVariant(50), 'standard')
assert.ok(originalMadaniTextInsets(50).left >= 9.5)
assert.ok(originalMadaniTextInsets(50).right >= 9.5)
assert.equal(arabicJuzLabel(1), 'الجزء الأول')
assert.equal(arabicJuzLabel(30), 'الجزء الثلاثون')
assert.equal(juzNumberFromMadaniPage(1), 1)
assert.equal(juzNumberFromMadaniPage(50), 3)
assert.equal(juzNumberFromMadaniPage(582), 30)

const grouped = groupMadaniLineSegments({
  words: [
    { verseKey: '2:5', textQpc: 'a' },
    { verseKey: '2:5', textQpc: 'b' },
    { verseKey: '2:6', textQpc: 'c' },
  ]
})
assert.equal(grouped.length, 2)
assert.equal(grouped[0].verseKey, '2:5')
assert.ok(Math.abs(grouped[0].widthPercent - (200 / 3)) < 0.001)
assert.equal(grouped[1].verseKey, '2:6')

assert.equal(madaniWordVisualWeight({ isEnd: true, textQpc: '١' }), MADANI_AYAH_MARKER_WEIGHT)
assert.ok(madaniWordVisualWeight({ textQpc: 'قل' }) < MADANI_AYAH_MARKER_WEIGHT)

const withMarker = layoutMadaniOverlayWords([
  { verseKey: '112:1', textQpc: 'قل', isEnd: false },
  { verseKey: '112:1', textQpc: '١', isEnd: true },
  { verseKey: '112:2', textQpc: 'الله', isEnd: false },
], { typicalWeight: 24 })
assert.equal(withMarker.length, 3)
assert.equal(highlightableMadaniWords(withMarker).length, 2)
assert.ok(withMarker[1].widthPercent > withMarker[0].widthPercent)

const groupedMarker = groupMadaniLineSegments({ words: withMarker })
assert.equal(groupedMarker.length, 2)
assert.ok(groupedMarker[0].widthPercent < withMarker[0].widthPercent + withMarker[1].widthPercent)
assert.ok(
  groupedMarker[0].startPercent + groupedMarker[0].widthPercent
  <= groupedMarker[1].startPercent + 0.001
)
assert.ok(typicalMadaniLineWeight([{ words: withMarker }]) >= MADANI_AYAH_MARKER_WEIGHT)

const shortLine = groupMadaniLineSegments({
  words: [
    { verseKey: '20:19', textQpc: 'قال' },
    { verseKey: '20:19', textQpc: 'لا' },
  ]
})
assert.equal(shortLine.length, 1)

const shortCentered = layoutMadaniOverlayWords([
  { verseKey: '112:1', textQpc: 'قل' },
  { verseKey: '112:1', textQpc: 'هو' },
], { typicalWeight: 40 })
assert.ok(shortCentered[0].startPercent > 8)
assert.ok(shortCentered[0].startPercent + shortCentered.reduce((sum, word) => sum + word.widthPercent, 0) < 92)

const box = originalMadaniLineBox({ lineNumber: 1 }, 0)
assert.ok(box.topPercent >= 0)
assert.ok(box.heightPercent > 0)
assert.ok(Math.abs(originalMadaniZoomFromFontSize(150) - 1) < 0.001)
assert.ok(typicalMadaniLineChars([{ words: [{ textQpc: 'abc' }] }]) >= 36)

assert.deepEqual(getSessionMadaniSpreadPages(598, [598, 599]), { right: 598, left: 599 })
assert.equal(canStepSessionMadaniPage(598, 1, { allowedPages: [598, 599], spread: true }), true)
assert.equal(stepSessionMadaniPage(598, 1, { allowedPages: [598, 599], spread: true }), 599)
assert.equal(canStepSessionMadaniPage(598, 1, { allowedPages: [598, 599], spread: false }), true)
assert.equal(stepSessionMadaniPage(598, 1, { allowedPages: [598, 599], spread: false }), 599)
assert.equal(constrainMadaniPageToSet(600, [598, 599]), 599)

const frameSource = readFileSync(new URL('../../resources/js/components/OriginalMadaniPageFrame.vue', import.meta.url), 'utf8')
const shellSource = readFileSync(new URL('../../resources/js/components/OriginalMadaniMushaf.vue', import.meta.url), 'utf8')
const cssSource = readFileSync(new URL('../../resources/js/views/Memorisation.original-madani.css', import.meta.url), 'utf8')
const memorisationJs = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const memorisationVue = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')

assert.match(frameSource, /original-madani-frame__meta/)
assert.match(frameSource, /original-madani-frame__footer/)
assert.match(frameSource, /original-madani-sheet/)
assert.match(frameSource, /fitOriginalMadaniGlyphSize/)
assert.match(frameSource, /madani-page-sheet/)
assert.match(frameSource, /madani-word/)
assert.match(frameSource, /wordClassList/)
assert.match(frameSource, /v-html="word\.html"/)
assert.doesNotMatch(frameSource, /original-madani-frame__page/)
assert.doesNotMatch(frameSource, /original-madani-overlay/)
assert.doesNotMatch(frameSource, /original-madani-hit/)
assert.doesNotMatch(frameSource, /originalMadaniPageImageUrl/)
assert.doesNotMatch(frameSource, /layoutMadaniOverlayWords/)

assert.match(shellSource, /btn-group btn-group-sm/)
assert.match(shellSource, /btn btn-outline-secondary/)
assert.match(shellSource, /open-controls/)
assert.match(shellSource, /toggle-fullscreen/)
assert.match(shellSource, /showPair/)
assert.match(shellSource, /glyphs-ready/)
assert.match(shellSource, /surah-names-font-family/)
assert.doesNotMatch(shellSource, /originalMadaniPageImageUrl/)
assert.doesNotMatch(shellSource, /leftImageUrl/)
assert.doesNotMatch(shellSource, /image-error/)

assert.match(memorisationJs, /buildOriginalMadaniPageData/)
assert.match(memorisationJs, /prefetchOriginalMadaniPages/)
assert.match(memorisationJs, /originalMadaniHasPair/)
assert.match(memorisationVue, /:surah-names-font-family="surahNamesFontFamily"/)
assert.match(memorisationVue, /:left-page-data=/)
assert.match(memorisationVue, /:spread="originalMadaniHasPair"/)
assert.match(memorisationVue, /'mushaf-mode-active': readingViewMode === 'mushaf'/)
assert.doesNotMatch(memorisationVue, /:image-width="originalMadaniImageWidth"/)
assert.doesNotMatch(memorisationVue, /@image-error="onOriginalMadaniImageError"/)

assert.match(cssSource, /original-madani-sheet/)
assert.match(cssSource, /fitOriginalMadaniGlyphSize|madani-glyph-size/)
assert.match(cssSource, /btn-group \.btn/)
assert.match(cssSource, /--original-madani-fit-height/)
assert.match(cssSource, /original-madani-spread--pair/)
assert.doesNotMatch(cssSource, /original-madani-overlay/)
assert.doesNotMatch(cssSource, /original-madani-hit \{/)
assert.doesNotMatch(cssSource, /mix-blend-mode:\s*multiply/)
assert.match(cssSource, /1024 \/ 1656/)
assert.doesNotMatch(cssSource, /original-madani-sheet__line--full/)
assert.doesNotMatch(cssSource, /Never use space-between/)

const styleOrder = [...memorisationVue.matchAll(/<style src="\.\/Memorisation\.([^"]+)\.css"><\/style>/g)].map((m) => m[1])
assert.deepEqual(styleOrder.slice(-1), ['original-madani'])
assert.ok(styleOrder.indexOf('mobile-grid') < styleOrder.indexOf('original-madani'))

console.log('original-madani-mushaf.test.mjs: ok')
