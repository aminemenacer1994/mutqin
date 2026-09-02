<template>
  <article
    class="madani-mushaf-page mushaf-page mushaf-page--madani"
    :class="{
      'madani-mushaf-page--loading': loading,
      'madani-mushaf-page--glyphs-ready': glyphsReady,
    }"
    :data-madani-page="pageNumber"
    :aria-label="pageLabel"
  >
    <MushafPageHeader :juz-label="juzLabel" :surah-label="surahLabel" />

    <div
      ref="sheet"
      class="madani-mushaf-page__sheet madani-page-sheet mushaf-page-body"
      dir="rtl"
      lang="ar"
      :class="{
        'madani-page-sheet--glyphs-ready': glyphsReady,
        'madani-page-sheet--unicode': !glyphsReady,
        'madani-page-sheet--tajweed': tajweedEnabled && glyphsReady,
      }"
      :style="sheetStyle"
    >
      <MushafLoadingSkeleton v-if="loading && !lines.length" />
      <MushafLine
        v-for="line in lines"
        :key="line.key"
        :line="line"
        :font-family="fontFamily"
        :surah-names-font-family="surahNamesFontFamily"
        :surah-label="surahLabel"
        :bismillah-label="bismillahLabel"
        @select-word="$emit('select-word', $event)"
        @peek-enter="$emit('peek-enter', $event)"
        @peek-leave="$emit('peek-leave', $event)"
        @touch-start="(e, w) => $emit('touch-start', e, w)"
        @touch-end="(e, w) => $emit('touch-end', e, w)"
        @touch-cancel="$emit('touch-cancel')"
      />
    </div>

    <footer class="madani-mushaf-page__footer" dir="rtl" aria-hidden="true">
      <span>{{ pageNumberLabel }}</span>
    </footer>
  </article>
</template>

<script>
import MushafPageHeader from './MushafPageHeader.vue'
import MushafLine from './MushafLine.vue'
import MushafLoadingSkeleton from './MushafLoadingSkeleton.vue'
import { MADANI_LINES_PER_PAGE, toEasternArabicDigits } from '../../scripts/mushaf/madaniPageLayout.js'
import { fitOriginalMadaniGlyphSize } from '../../scripts/mushaf/originalMadaniMushaf.js'

export default {
  name: 'MushafPage',
  components: { MushafPageHeader, MushafLine, MushafLoadingSkeleton },
  props: {
    pageNumber: { type: Number, required: true },
    lines: { type: Array, default: () => [] },
    fontFamily: { type: String, default: '' },
    fontSize: { type: Number, default: 120 },
    juzLabel: { type: String, default: '' },
    surahLabel: { type: String, default: '' },
    pageLabel: { type: String, default: '' },
    bismillahLabel: { type: String, default: 'Bismillah' },
    glyphsReady: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    tajweedEnabled: { type: Boolean, default: false },
    surahNamesFontFamily: { type: String, default: 'surahnames' },
    side: { type: String, default: 'right' },
  },
  emits: ['select-word', 'peek-enter', 'peek-leave', 'touch-start', 'touch-end', 'touch-cancel'],
  data() {
    return { fitRaf: 0 }
  },
  computed: {
    sheetStyle() {
      return {
        '--verse-font-percent': String(this.fontSize || 120),
        '--madani-page-font': this.fontFamily ? `'${this.fontFamily}'` : undefined,
        '--madani-line-count': String(MADANI_LINES_PER_PAGE),
      }
    },
    pageNumberLabel() {
      return toEasternArabicDigits(this.pageNumber)
    },
  },
  watch: {
    lines: { deep: true, handler() { this.scheduleGlyphFit() } },
    glyphsReady() {
      this.scheduleGlyphFit()
      ;[80, 240, 700].forEach((ms) => {
        window.setTimeout(() => this.scheduleGlyphFit(), ms)
      })
    },
    fontSize() { this.scheduleGlyphFit() },
    pageNumber() { this.scheduleGlyphFit() },
  },
  mounted() {
    this.scheduleGlyphFit()
  },
  beforeUnmount() {
    if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
  },
  methods: {
    scheduleGlyphFit() {
      if (this.fitRaf) cancelAnimationFrame(this.fitRaf)
      this.fitRaf = requestAnimationFrame(() => {
        this.fitRaf = 0
        this.$nextTick(() => {
          const sheet = this.$refs.sheet
          if (!sheet || !this.lines?.length) return
          fitOriginalMadaniGlyphSize(sheet, {
            lineSelector: '.madani-mushaf-line--ayah',
            targetFill: 0.988,
          })
        })
      })
    },
  },
}
</script>
