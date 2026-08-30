<template>
  <div
    class="original-madani-frame"
    :class="[
      `original-madani-frame--${side}`,
      `original-madani-frame--${variant}`,
      {
        'is-active': active,
        'is-ready': sheetReady,
        'original-madani-frame--loading': !sheetReady && !hasLines,
        'original-madani-frame--glyphs': true,
      }
    ]"
    :style="frameStyle"
  >
    <img
      class="original-madani-frame__art"
      :src="frameSrc"
      alt=""
      draggable="false"
      aria-hidden="true"
    >
    <header v-if="juzLabel || surahLabel" class="original-madani-frame__meta" dir="rtl">
      <span class="original-madani-frame__meta-outer">{{ juzLabel }}</span>
      <span class="original-madani-frame__meta-inner">{{ surahLabel }}</span>
    </header>

    <div class="original-madani-frame__window">
      <div
        ref="sheet"
        class="original-madani-sheet madani-page-sheet"
        dir="rtl"
        :class="{
          'madani-page-sheet--glyphs-ready': glyphsReady,
          'madani-page-sheet--unicode': !glyphsReady,
          'madani-page-sheet--tajweed': !!tajweedEnabled && glyphsReady,
        }"
        :style="sheetStyle"
        :aria-label="alt"
      >
        <div
          v-for="line in displayLines"
          :key="line.key"
          class="madani-line original-madani-sheet__line"
          :class="[
            `madani-line--${line.type}`,
            {
              'madani-line--empty': line.type === 'empty',
              'madani-line--glyphs': line.useGlyphs && line.fontReady && line.type === 'ayah',
              'madani-line--ayah': line.type === 'ayah',
              'madani-line--basmala-ayah': line.type === 'basmala_ayah',
              'original-madani-sheet__line--ayah': line.type === 'ayah' || line.type === 'basmala_ayah',
            }
          ]"
          :data-line-number="line.lineNumber"
        >
          <template v-if="line.type === 'surah_name'">
            <span
              class="madani-surah-name"
              :style="{ fontFamily: `'${surahNamesFontFamily}'` }"
              aria-hidden="true"
            >{{ line.glyphText }}</span>
            <span class="sr-only">{{ surahLabel || line.glyphText }}</span>
          </template>
          <template v-else-if="line.type === 'basmala'">
            <div
              class="madani-basmala"
              dir="rtl"
              lang="ar"
            >بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
          </template>
          <template v-else-if="line.type === 'ayah' || line.type === 'basmala_ayah'">
            <span
              v-for="(word, wordIndex) in line.words"
              :key="`${line.key}-w-${word.position || wordIndex}-${word.verseKey}`"
              class="madani-word"
              :class="wordClassList(word)"
              :data-verse-key="word.verseKey"
              :data-word-index="word.wordIndex != null ? word.wordIndex : null"
              :data-practice-focus="word.isPracticeFocus ? 'true' : null"
              :title="word.meaningLabel || null"
              :style="word.useGlyph ? { fontFamily: `'${line.fontFamily}'` } : null"
              role="button"
              :tabindex="word.inSession === false ? -1 : 0"
              @click.stop="onWordClick(word)"
              @mouseenter="onWordEnter(word)"
              @mouseleave="onWordLeave(word)"
              @keydown.enter.prevent="onWordClick(word)"
              @keydown.space.prevent="onWordClick(word)"
              v-html="word.html"
            ></span>
          </template>
        </div>
        <p v-if="!hasLines" class="original-madani-frame__image-error" role="status">
          {{ pageLabel }}
        </p>
      </div>
    </div>

    <footer class="original-madani-frame__footer" dir="rtl">
      <span>{{ pageLabel }}</span>
    </footer>
  </div>
</template>

<script>
import {
  fitOriginalMadaniGlyphSize,
  originalMadaniFrameSrc,
  originalMadaniFrameVariant,
  originalMadaniTextInsets,
} from '../scripts/mushaf/originalMadaniMushaf.js'
import { MADANI_LINES_PER_PAGE, toEasternArabicDigits } from '../scripts/mushaf/madaniPageLayout.js'

function wordClassList(word = {}) {
  const raw = word.classes
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (raw && typeof raw === 'object') return Object.keys(raw).filter(key => !!raw[key])
  if (raw != null && raw !== '') return String(raw).split(/\s+/).filter(Boolean)
  return []
}

export default {
  name: 'OriginalMadaniPageFrame',
  props: {
    pageNumber: { type: Number, required: true },
    side: { type: String, default: 'right' },
    juzLabel: { type: String, default: '' },
    surahLabel: { type: String, default: '' },
    active: { type: Boolean, default: false },
    alt: { type: String, default: '' },
    lines: { type: Array, default: () => [] },
    glyphsReady: { type: Boolean, default: false },
    fontFamily: { type: String, default: '' },
    tajweedEnabled: { type: Boolean, default: false },
    fontSize: { type: Number, default: 150 },
    surahNamesFontFamily: { type: String, default: 'surah_names' },
  },
  emits: ['select-ayah', 'select-word', 'peek-enter', 'peek-leave', 'sheet-ready'],
  data() {
    return {
      fitRaf: 0,
      sheetFitted: false,
    }
  },
  computed: {
    variant() {
      return originalMadaniFrameVariant(this.pageNumber)
    },
    frameSrc() {
      return originalMadaniFrameSrc(this.pageNumber)
    },
    insets() {
      return originalMadaniTextInsets(this.pageNumber)
    },
    pageLabel() {
      return toEasternArabicDigits(this.pageNumber)
    },
    hasLines() {
      return Array.isArray(this.lines) && this.lines.length > 0
    },
    displayLines() {
      return (this.lines || []).filter(line => line && line.type !== 'empty')
    },
    sheetReady() {
      return this.hasLines && (this.glyphsReady || this.sheetFitted)
    },
    lineCount() {
      if (this.variant === 'opening') {
        return Math.max(1, ...this.displayLines.map(line => Number(line.lineNumber) || 1), 1)
      }
      return MADANI_LINES_PER_PAGE
    },
    frameStyle() {
      const inset = this.insets
      return {
        '--madani-inset-top': `${inset.top}%`,
        '--madani-inset-right': `${inset.right}%`,
        '--madani-inset-bottom': `${inset.bottom}%`,
        '--madani-inset-left': `${inset.left}%`,
        '--verse-font-percent': String(this.fontSize || 150),
        '--madani-line-count': String(this.lineCount),
      }
    },
    sheetStyle() {
      const family = this.fontFamily
        || (this.displayLines.find(line => line.fontFamily)?.fontFamily)
        || `p${this.pageNumber}${this.tajweedEnabled ? '-v4' : '-v2'}`
      return {
        '--verse-font-percent': String(this.fontSize || 150),
        '--madani-page-font': `'${family}'`,
        '--madani-line-count': String(this.lineCount),
      }
    },
  },
  watch: {
    lines: {
      deep: true,
      handler() {
        this.scheduleGlyphFit()
      },
    },
    glyphsReady() {
      this.scheduleGlyphFit()
    },
    fontSize() {
      this.scheduleGlyphFit()
    },
    pageNumber() {
      this.sheetFitted = false
      this.scheduleGlyphFit()
    },
  },
  mounted() {
    this.scheduleGlyphFit()
  },
  beforeUnmount() {
    if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
  },
  methods: {
    wordClassList,
    scheduleGlyphFit() {
      if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
      this.fitRaf = requestAnimationFrame(() => {
        this.fitRaf = 0
        this.$nextTick(() => this.runGlyphFit())
      })
    },
    runGlyphFit() {
      const sheet = this.$refs.sheet
      if (!sheet || !this.hasLines) return
      const size = fitOriginalMadaniGlyphSize(sheet)
      if (size != null) {
        this.sheetFitted = true
        this.$emit('sheet-ready', this.pageNumber)
      }
    },
    onWordClick(word) {
      if (!word?.verseKey || word.inSession === false) return
      this.$emit('select-ayah', word.verseKey)
      this.$emit('select-word', word)
    },
    onWordEnter(word) {
      if (!word?.verseKey || word.inSession === false) return
      this.$emit('peek-enter', word.verseKey)
    },
    onWordLeave(word) {
      if (!word?.verseKey) return
      this.$emit('peek-leave')
    },
  },
}
</script>
