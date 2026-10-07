<template>
  <span
    class="qpc-madani-word"
    :data-location="word.location"
    :data-verse-key="verseKey || null"
    :data-word-position="wordPosition || null"
    :data-surah="word.surah"
    :data-ayah="word.ayah"
    :data-word="word.word"
    :data-page="word.page"
    :data-line="word.line"
    :data-word-id="word.id"
    :data-ayah-key="verseKey || null"
    :data-word-index="wordAudioIndex != null ? wordAudioIndex : null"
    :data-ayah-state="ayahStateAttr"
    :data-anchor="techniqueState.isAnchor ? '1' : null"
    :data-chain="techniqueState.isChainMember ? '1' : null"
    :data-talqin="techniqueState.isTalqinRepeat ? 'repeat' : (techniqueState.isTalqinListen ? 'listen' : null)"
    :data-qpc-progress="progressAttr"
    :class="wordClass"
    :style="{ fontFamily: `'${displayFontFamily}'` }"
    tabindex="0"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @touchstart.passive="onPeekTouchStart"
    @touchend.passive="onPeekTouchEnd"
    @touchcancel.passive="onPeekTouchCancel"
  ><span
    v-if="indopakTajweedHtml"
    class="qpc-madani-word__tajweed"
    v-html="indopakTajweedHtml"
  ></span><template v-else>{{ displayText }}</template></span>
</template>

<script>
import { ayahKeyFromWord, madaniWordVisualClass, resolveMadaniAyahVisualState } from '../../scripts/mushaf/qpcMadaniSelection'
import {
  collectQpcMadaniDomManagedClasses,
  madaniQpcWordTechniqueClass,
  resolveQpcMadaniWordTechniqueState,
  restoreQpcMadaniDomManagedClasses,
} from '../../scripts/mushaf/qpcMadaniTechniques'
import { resolveQpcMadaniWordGlyph } from '../../scripts/mushaf/qpcMadaniReadingTools'
import {
  qpcMadaniProgressAttribute,
  qpcMadaniWordProgressClass,
  resolveQpcMadaniWordProgressState,
} from '../../scripts/mushaf/qpcMadaniProgress'
import { MUSHAF_LAYOUT_MADANI_V2 } from '../../scripts/mushaf/mushafLayouts'
import { isIndopakMushafLayout } from '../../scripts/mushaf/indopakPageAdapter'
import { paintUnicodeTextWithTajweedToken } from '../../scripts/mushaf/indopakTajweedMarkup'
import { stripMushafHtmlBreaks } from '../../scripts/mushaf/mobileMushafLineFit'

export default {
  name: 'MadaniWord',
  emits: ['select', 'ayah-enter', 'ayah-leave', 'peek-enter', 'peek-leave', 'peek-touchstart', 'peek-touchend', 'peek-touchcancel'],
  props: {
    word: {
      type: Object,
      required: true,
    },
    fontFamily: {
      type: String,
      required: true,
    },
    layoutId: {
      type: String,
      default: MUSHAF_LAYOUT_MADANI_V2,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    selection: {
      type: Object,
      default: null,
    },
    techniqueSnapshot: {
      type: Object,
      default: null,
    },
    audioIndexMap: {
      type: Object,
      default: null,
    },
    tajweedEnabled: {
      type: Boolean,
      default: false,
    },
    codeV2ByLocation: {
      type: Object,
      default: null,
    },
    tajweedHtmlByLocation: {
      type: Object,
      default: null,
    },
    progressSnapshot: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      persistedDomClasses: [],
    }
  },
  beforeUpdate() {
    this.persistedDomClasses = collectQpcMadaniDomManagedClasses(this.$el?.classList)
  },
  updated() {
    restoreQpcMadaniDomManagedClasses(this.$el, this.persistedDomClasses)
  },
  computed: {
    isIndopakLayout() {
      return isIndopakMushafLayout(this.layoutId)
    },
    glyphPresentation() {
      // IndoPak is Unicode text + IndopakNastaleeq — never swap to QCF page glyphs.
      if (this.isIndopakLayout) {
        return {
          text: String(this.word?.text || ''),
          useTajweedFont: false,
          fontFamily: '',
        }
      }
      return resolveQpcMadaniWordGlyph({
        word: this.word,
        tajweedEnabled: this.tajweedEnabled,
        codeV2ByLocation: this.codeV2ByLocation || {},
      })
    },
    displayText() {
      // Permanently strip hard breaks from word / ayah-number glyphs.
      return stripMushafHtmlBreaks(this.glyphPresentation.text)
    },
    indopakTajweedHtml() {
      // Ayah-end ornaments use plain displayText (no tajweed HTML / no <br>).
      if (!this.isIndopakLayout || !this.tajweedEnabled || this.word?.isEnd) return ''
      const location = String(this.word?.location || '').trim()
      const token = location
        ? String(this.tajweedHtmlByLocation?.[location] || '').trim()
        : ''
      if (!token) return ''
      return stripMushafHtmlBreaks(paintUnicodeTextWithTajweedToken(this.displayText, token))
    },
    displayFontFamily() {
      if (this.glyphPresentation.useTajweedFont && this.glyphPresentation.fontFamily) {
        return this.glyphPresentation.fontFamily
      }
      return this.fontFamily
    },
    verseKey() {
      const fromWord = String(this.word?.verseKey || this.word?.verse_key || '').trim()
      if (fromWord && fromWord.split(':').length === 2) return fromWord
      return ayahKeyFromWord(this.word)
    },
    wordPosition() {
      const n = Number(this.word?.wordPosition ?? this.word?.word_position ?? this.word?.word)
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
    },
    ayahKey() {
      return this.verseKey
    },
    techniqueState() {
      return resolveQpcMadaniWordTechniqueState(
        this.word,
        this.techniqueSnapshot || {},
        this.audioIndexMap
      )
    },
    wordAudioIndex() {
      const index = this.techniqueState.wordAudioIndex
      return Number.isFinite(index) ? index : null
    },
    progressState() {
      return resolveQpcMadaniWordProgressState(
        this.word,
        this.progressSnapshot,
        this.audioIndexMap
      )
    },
    visualState() {
      return resolveMadaniAyahVisualState(this.ayahKey, this.selection || {})
    },
    ayahStateAttr() {
      if (this.visualState.active) return 'active'
      return this.visualState.rangeRole || null
    },
    progressAttr() {
      return qpcMadaniProgressAttribute(this.progressState)
    },
    wordClass() {
      return {
        'is-selected': this.selected,
        'qpc-madani-word--tajweed-glyph': this.glyphPresentation.useTajweedFont,
        'qpc-madani-word--indopak': this.isIndopakLayout,
        'qpc-madani-word--indopak-tajweed': !!this.indopakTajweedHtml,
        'qpc-madani-word--ornament': !!this.word?.isEnd,
        ...madaniWordVisualClass(this.visualState),
        ...madaniQpcWordTechniqueClass(this.techniqueState),
        ...qpcMadaniWordProgressClass(this.progressState),
      }
    },
  },
  methods: {
    onSelect() {
      // Ornaments stay in layout for ayah selection, but do not drive word-audio.
      this.$emit('select', this.word.location)
    },
    onMouseEnter() {
      if (this.ayahKey) this.$emit('ayah-enter', this.ayahKey)
      this.onPeekEnter()
    },
    onMouseLeave() {
      if (this.ayahKey) this.$emit('ayah-leave', this.ayahKey)
      this.onPeekLeave()
    },
    onPeekEnter() {
      if (!this.techniqueState.blurUpcoming) return
      this.$emit('peek-enter', this.ayahKey)
    },
    onPeekLeave() {
      if (!this.techniqueState.blurUpcoming) return
      this.$emit('peek-leave', this.ayahKey)
    },
    onPeekTouchStart(event) {
      if (!this.techniqueState.blurUpcoming) return
      this.$emit('peek-touchstart', { event, ayahKey: this.ayahKey })
    },
    onPeekTouchEnd(event) {
      if (!this.techniqueState.blurUpcoming) return
      this.$emit('peek-touchend', { event, ayahKey: this.ayahKey })
    },
    onPeekTouchCancel() {
      this.$emit('peek-touchcancel')
    },
  },
}
</script>

<style scoped>
.qpc-madani-word {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  flex-shrink: 0;
  min-width: 0;
  min-height: 0;
  width: auto;
  height: auto;
  padding: 0.03em 0.02em 0.04em;
  cursor: pointer;
  font-size: var(--qpc-word-size, 22px);
  font-weight: 400;
  line-height: var(--qpc-line-height, 1.32);
  overflow: visible;
  white-space: nowrap;
  border-radius: 0.12em;
  touch-action: manipulation;
  vertical-align: baseline;
}

/*
 * Progressive Mushaf Hiding — preserve occupied width/space.
 * Keep the node in flow; hide via transparent ink + overlay only.
 */
.qpc-madani-word.is-word-masked,
.qpc-madani-word.word-hidden,
.qpc-madani-word.memory-word-hidden,
.qpc-madani-word.amd-word-hidden {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: none;
  user-select: none;
  -webkit-user-select: none;
  /* Keep the glyph box in flow so reveal cannot reflow the line. */
  visibility: visible;
  display: inline-block;
  opacity: 1;
}

.qpc-madani-word.is-word-masked :deep(.tajweed-mark),
.qpc-madani-word.word-hidden :deep(.tajweed-mark),
.qpc-madani-word.memory-word-hidden :deep(.tajweed-mark),
.qpc-madani-word.amd-word-hidden :deep(.tajweed-mark) {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  background: transparent !important;
}

.qpc-madani-word.is-word-masked::after,
.qpc-madani-word.word-hidden::after,
.qpc-madani-word.memory-word-hidden::after,
.qpc-madani-word.amd-word-hidden::after {
  content: '';
  position: absolute;
  inset: 0.02em 0.01em;
  border-radius: 0.12em;
  background: color-mix(in srgb, #a8a29e 22%, transparent);
  box-shadow: inset 0 -0.12em 0 color-mix(in srgb, #a8a29e 45%, transparent);
  pointer-events: none;
}

.qpc-madani-word.word-revealed:not(.word-current) {
  background: color-mix(in srgb, #2e7d32 14%, transparent);
  box-shadow: inset 0 -0.1em 0 color-mix(in srgb, #2e7d32 38%, transparent);
}

.qpc-madani-word.word-current {
  background: color-mix(in srgb, #2e7d32 24%, transparent);
  box-shadow: inset 0 -0.12em 0 color-mix(in srgb, #2e7d32 48%, transparent);
}

.qpc-madani-word.word-error-flash {
  background: color-mix(in srgb, #c62828 22%, transparent) !important;
}

.qpc-madani-word:hover,
.qpc-madani-word:focus-visible {
  background: color-mix(in srgb, #c4a35a 16%, transparent);
  outline: none;
}

.qpc-madani-word.is-word-masked:hover::after,
.qpc-madani-word.word-hidden:hover::after,
.qpc-madani-word.amd-word-hidden:hover::after {
  background: color-mix(in srgb, #a8a29e 28%, transparent);
}

.qpc-madani-word.is-range-ayah {
  background: color-mix(in srgb, #c4a35a 9%, transparent);
}

.qpc-madani-word.is-range-start {
  box-shadow: inset -0.07em 0 0 color-mix(in srgb, #8d6a35 28%, transparent);
}

.qpc-madani-word.is-range-end {
  box-shadow: inset 0.07em 0 0 color-mix(in srgb, #8d6a35 28%, transparent);
}

.qpc-madani-word.is-ayah-active {
  background: color-mix(in srgb, #c4a35a 22%, transparent);
  box-shadow: inset 0 -0.08em 0 color-mix(in srgb, #8d6a35 38%, transparent);
}

.qpc-madani-word.is-playing-ayah {
  background: color-mix(in srgb, #4a90a4 11%, transparent);
}

.qpc-madani-word.is-playing-ayah.is-ayah-active {
  background: color-mix(in srgb, #4a90a4 16%, color-mix(in srgb, #c4a35a 14%, transparent));
}

.qpc-madani-word.highlighted,
.qpc-madani-word.phrase-highlighted {
  background: color-mix(in srgb, #2b8a9a 38%, transparent);
  box-shadow:
    inset 0 -0.14em 0 color-mix(in srgb, #1f5f6c 70%, transparent),
    0 0 0 0.08em color-mix(in srgb, #2b8a9a 45%, transparent);
  border-radius: 0.18em;
}

.qpc-madani-word.is-selected:not(.is-ayah-active) {
  background: color-mix(in srgb, #c4a35a 18%, transparent);
}

.qpc-madani-word--tajweed-glyph {
  display: inline-block;
  font-synthesis: none;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  /* Match plain QCF metrics so mobile fit is identical with tajweed on/off. */
  line-height: var(--qpc-line-height, 1.32);
  padding-block: 0.03em;
}

.qpc-madani-word__tajweed {
  display: inline;
}

.qpc-madani-word__tajweed :deep(.tajweed-mark),
.qpc-madani-word__tajweed :deep([class*="tajweed-"]) {
  display: inline;
  padding: 0;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none;
  -webkit-text-fill-color: currentColor !important;
}

.qpc-madani-word--tajweed-glyph:not(.is-word-masked):not(.word-hidden):not(.memory-word-hidden):not(.amd-word-hidden) {
  color: unset !important;
  -webkit-text-fill-color: unset !important;
}

.qpc-madani-word.qpc-progress-weak-word,
.qpc-madani-word.qpc-progress-weak-ayah,
.qpc-madani-word.qpc-progress-confidence-low,
.qpc-madani-word.qpc-progress-confidence-building,
.qpc-madani-word.qpc-progress-confidence-high,
.qpc-madani-word.qpc-progress-retention-due,
.qpc-madani-word.qpc-progress-review {
  box-shadow: inset 0 -0.07em 0 color-mix(in srgb, #c4a35a 46%, transparent);
}

.qpc-madani-word.qpc-progress-weak-word {
  box-shadow: inset 0 -0.11em 0 color-mix(in srgb, #c9891f 70%, transparent);
}

.qpc-madani-word.qpc-progress-weak-word--active {
  box-shadow: inset 0 -0.14em 0 color-mix(in srgb, #8d6a35 78%, transparent);
}

.qpc-madani-word.qpc-progress-confidence-high {
  box-shadow: inset 0 -0.06em 0 color-mix(in srgb, #2e7d32 42%, transparent);
}

.qpc-madani-word.qpc-progress-retention-due,
.qpc-madani-word.qpc-progress-review {
  box-shadow: inset 0 -0.08em 0 color-mix(in srgb, #d97706 55%, transparent);
}

.qpc-madani-word.qpc-progress-weak-word {
  box-shadow: inset 0 -0.11em 0 color-mix(in srgb, #c9891f 70%, transparent);
}
</style>

<style>
.main.focus-mode-active .qpc-madani-word.is-focus-dim:not(.is-ayah-active):not(.highlighted):not(.peek-revealed):not(.is-playing-ayah) {
  opacity: var(--focus-dim-opacity, 0.46);
}

.main.blur-mode-active .qpc-madani-word.blur-upcoming:not(.peek-revealed):not(.is-ayah-active):not(.highlighted):not(.is-playing-ayah) {
  filter: blur(var(--recall-blur, 10px));
}

.main.blur-mode-active .qpc-madani-word.blur-upcoming.peek-revealed,
.main.blur-mode-active .qpc-madani-word.is-ayah-active,
.main.blur-mode-active .qpc-madani-word.highlighted,
.main.blur-mode-active .qpc-madani-word.is-playing-ayah {
  filter: none;
}

.main.blur-mode-active .qpc-madani-word.blur-upcoming.anchor-highlight:not(.peek-revealed) {
  filter: blur(calc(var(--recall-blur, 10px) - 4px));
}

.qpc-madani-word.anchor-highlight {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.28), rgba(255, 152, 0, 0.34));
  box-shadow: inset 0 -0.14em 0 #ff9800;
  border-radius: 0.08em;
}

.qpc-madani-word.anchor-highlight::after {
  content: none;
}

.qpc-madani-word.anchor-pulse {
  animation: qpcMadaniAnchorPulse 0.6s ease-out;
}

.qpc-madani-word.is-chain-member {
  box-shadow: inset 0 -0.12em 0 color-mix(in srgb, #c9a36a 70%, transparent);
}

.qpc-madani-word.is-chain-dim:not(.is-ayah-active):not(.highlighted):not(.is-playing-ayah) {
  opacity: 0.42;
}

.qpc-madani-word.is-talqin-listen {
  box-shadow: inset 0 -0.12em 0 color-mix(in srgb, #7eb6c9 72%, transparent);
}

.qpc-madani-word.is-talqin-repeat {
  background: color-mix(in srgb, #7eb6c9 16%, transparent);
  box-shadow: inset 0 -0.14em 0 color-mix(in srgb, #4f8fa3 80%, transparent);
}

@keyframes qpcMadaniAnchorPulse {
  0%,
  100% {
    box-shadow: inset 0 -0.14em 0 #ff9800;
  }

  50% {
    box-shadow:
      inset 0 -0.14em 0 #ff9800,
      0 0 0 0.18em rgba(255, 152, 0, 0);
  }
}

.qpc-madani-word.practice-focus-word {
  box-shadow: inset 0 -0.14em 0 color-mix(in srgb, #7b5cff 55%, transparent);
  border-radius: 0.12em;
}

.qpc-madani-word.practice-focus-word--active {
  background: color-mix(in srgb, #7b5cff 18%, transparent);
}

.qpc-madani-word.practice-focus-word--emphasis {
  box-shadow: inset 0 -0.16em 0 color-mix(in srgb, #5a3fd6 62%, transparent);
}

.madani-qpc-workspace .qpc-madani-word[class*='recitation-word-'] {
  border-radius: 0.12em;
}
</style>
