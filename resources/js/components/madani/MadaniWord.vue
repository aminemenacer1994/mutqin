<template>
  <span
    class="qpc-madani-word"
    :data-location="word.location"
    :data-surah="word.surah"
    :data-ayah="word.ayah"
    :data-word="word.word"
    :data-page="word.page"
    :data-line="word.line"
    :data-word-id="word.id"
    :data-ayah-key="ayahKey || null"
    :data-verse-key="ayahKey || null"
    :data-word-index="wordAudioIndex != null ? wordAudioIndex : null"
    :data-ayah-state="ayahStateAttr"
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
  >{{ displayText }}</span>
</template>

<script>
import { ayahKeyFromWord, madaniWordVisualClass, resolveMadaniAyahVisualState } from '../../scripts/mushaf/qpcMadaniSelection'
import {
  madaniQpcWordTechniqueClass,
  resolveQpcMadaniWordTechniqueState,
} from '../../scripts/mushaf/qpcMadaniTechniques'
import { resolveQpcMadaniWordGlyph } from '../../scripts/mushaf/qpcMadaniReadingTools'
import {
  qpcMadaniProgressAttribute,
  qpcMadaniWordProgressClass,
  resolveQpcMadaniWordProgressState,
} from '../../scripts/mushaf/qpcMadaniProgress'

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
    progressSnapshot: {
      type: Object,
      default: null,
    },
  },
  computed: {
    glyphPresentation() {
      return resolveQpcMadaniWordGlyph({
        word: this.word,
        tajweedEnabled: this.tajweedEnabled,
        codeV2ByLocation: this.codeV2ByLocation || {},
      })
    },
    displayText() {
      return this.glyphPresentation.text
    },
    displayFontFamily() {
      if (this.glyphPresentation.useTajweedFont && this.glyphPresentation.fontFamily) {
        return this.glyphPresentation.fontFamily
      }
      return this.fontFamily
    },
    ayahKey() {
      return ayahKeyFromWord(this.word)
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
        ...madaniWordVisualClass(this.visualState),
        ...madaniQpcWordTechniqueClass(this.techniqueState),
        ...qpcMadaniWordProgressClass(this.progressState),
      }
    },
  },
  methods: {
    onSelect() {
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
  min-width: 0;
  min-height: 0;
  width: auto;
  height: auto;
  padding: 0.08em 0.02em 0.1em;
  cursor: pointer;
  font-size: var(--qpc-word-size, 22px);
  font-weight: 400;
  line-height: var(--qpc-line-height, 1.72);
  overflow: visible;
  white-space: nowrap;
  border-radius: 0.12em;
  touch-action: manipulation;
  vertical-align: baseline;
}

.qpc-madani-word.is-word-masked,
.qpc-madani-word.word-hidden,
.qpc-madani-word.memory-word-hidden {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: none;
  user-select: none;
  -webkit-user-select: none;
}

.qpc-madani-word.is-word-masked::after,
.qpc-madani-word.word-hidden::after,
.qpc-madani-word.memory-word-hidden::after {
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
.qpc-madani-word.word-hidden:hover::after {
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
  background: color-mix(in srgb, #4a90a4 26%, transparent);
  box-shadow: inset 0 -0.1em 0 color-mix(in srgb, #2d6a7a 42%, transparent);
}

.qpc-madani-word.is-selected:not(.is-ayah-active) {
  background: color-mix(in srgb, #c4a35a 18%, transparent);
}

.qpc-madani-word--tajweed-glyph {
  display: inline-block;
  color: unset !important;
  -webkit-text-fill-color: unset !important;
  font-synthesis: none;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  line-height: 1.45;
  padding-block: 0.1em;
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
.main.focus-mode-active .qpc-madani-word.is-focus-dim:not(.is-ayah-active):not(.highlighted):not(.peek-revealed) {
  opacity: var(--focus-dim-opacity, 0.46);
}

.main.blur-mode-active .qpc-madani-word.blur-upcoming:not(.peek-revealed):not(.is-ayah-active):not(.highlighted) {
  filter: blur(var(--recall-blur, 10px));
}

.main.blur-mode-active .qpc-madani-word.blur-upcoming.peek-revealed,
.main.blur-mode-active .qpc-madani-word.is-ayah-active,
.main.blur-mode-active .qpc-madani-word.highlighted {
  filter: none;
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
