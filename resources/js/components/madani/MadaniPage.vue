<template>
  <article
    class="qpc-madani-page"
    dir="rtl"
    lang="ar"
    :data-madani-page="pageNumber"
    :data-page="pageNumber"
    :data-active-ayah="activeAyah || null"
    :data-range-start="rangeStartAyah || null"
    :data-range-end="rangeEndAyah || null"
    :data-last-selected="selectedLocation"
    :class="{
      'qpc-madani-page--embedded': embedded,
      'qpc-madani-page--single': !embedded,
      'qpc-madani-page--opening': isOpening,
      'is-font-ready': fontReady,
      'is-fitted': fitted,
      'qpc-madani-page--tajweed': tajweedEnabled,
      'qpc-madani-page--borderless': borderless,
      'qpc-madani-page--session-scoped': sessionScoped,
    }"
    :aria-busy="!fontReady || !fitted ? 'true' : 'false'"
  >
    <div class="qpc-madani-page__ornament">
      <div
        ref="sheet"
        class="qpc-madani-page__sheet"
      >
        <MadaniLine
          v-for="line in lines"
          :key="`${line.line_type || line.type}-${line.line_number}-${line.surah_number || 0}`"
          :line="line"
          :session-scoped="sessionScoped"
          :font-family="fontFamily"
          :selected-location="selectedLocation"
          :selection="selection"
          :technique-snapshot="techniqueSnapshot"
          :progress-snapshot="progressSnapshot"
          :audio-index-map="audioIndexMap"
          :tajweed-enabled="tajweedEnabled"
          :code-v2-by-location="codeV2ByLocation"
          :surah-names-ready="surahNamesReady"
          @select="onWordSelect"
          @ayah-enter="onAyahEnter"
          @ayah-leave="onAyahLeave"
          @peek-enter="onPeekEnter"
          @peek-leave="onPeekLeave"
          @peek-touchstart="onPeekTouchStart"
          @peek-touchend="onPeekTouchEnd"
          @peek-touchcancel="onPeekTouchCancel"
        />
      </div>
      <div
        class="qpc-madani-page__folio"
        aria-hidden="true"
      >{{ folioLabel }}</div>
    </div>
  </article>
</template>

<script>
import { loadSurahNamesFont, loadQcfPageFont } from '../../scripts/mushaf/qcfFontLoader'
import { ensureQpcMadaniPageFont } from '../../scripts/mushaf/qpcMadaniFontLoader'
import { buildMadaniSelection, prepareQpcMadaniSessionLines } from '../../scripts/mushaf/qpcMadaniSelection'
import MadaniLine from './MadaniLine.vue'

const MEASURE_SIZE = 40

export default {
  name: 'MadaniPage',
  components: { MadaniLine },
  props: {
    page: {
      type: Object,
      required: true,
    },
    fontFamily: {
      type: String,
      required: true,
    },
    fontUrl: {
      type: String,
      required: true,
    },
    embedded: {
      type: Boolean,
      default: false,
    },
    borderless: {
      type: Boolean,
      default: false,
    },
    activeAyah: {
      type: String,
      default: '',
    },
    rangeStartAyah: {
      type: String,
      default: '',
    },
    rangeEndAyah: {
      type: String,
      default: '',
    },
    sessionStartAyah: {
      type: String,
      default: '',
    },
    sessionEndAyah: {
      type: String,
      default: '',
    },
    showSessionSurahHeader: {
      type: Boolean,
      default: true,
    },
    techniqueSnapshot: {
      type: Object,
      default: null,
    },
    progressSnapshot: {
      type: Object,
      default: null,
    },
    audioIndexMap: {
      type: Object,
      default: null,
    },
    fontScale: {
      type: Number,
      default: 1,
    },
    tajweedEnabled: {
      type: Boolean,
      default: false,
    },
    codeV2ByLocation: {
      type: Object,
      default: null,
    },
  },
  emits: ['select', 'ayah-enter', 'ayah-leave', 'peek-enter', 'peek-leave', 'peek-touchstart', 'peek-touchend', 'peek-touchcancel'],
  data() {
    return {
      selectedLocation: '',
      resizeObserver: null,
      fitTimer: null,
      lastFitWidth: 0,
      fitted: false,
      fitting: false,
      fontReady: false,
      surahNamesReady: false,
    }
  },
  computed: {
    pageNumber() {
      return Number(this.page?.page_number) || 1
    },
    lines() {
      const raw = Array.isArray(this.page?.lines) ? this.page.lines : []
      const showHeader = !this.sessionScoped || this.showSessionSurahHeader
      return prepareQpcMadaniSessionLines(raw, this.sessionStartAyah, this.sessionEndAyah, {
        showSurahHeader: showHeader,
      })
    },
    isOpening() {
      if (this.sessionScoped || this.sessionStartAyah) return false
      const raw = Array.isArray(this.page?.lines) ? this.page.lines : []
      return raw.length > 0 && raw.length < 15
    },
    folioLabel() {
      if (this.embedded) return String(this.pageNumber)
      return new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(this.pageNumber)
    },
    sessionScoped() {
      return !!(String(this.sessionStartAyah || '').trim() && String(this.sessionEndAyah || '').trim())
    },
    selection() {
      return buildMadaniSelection({
        activeAyah: this.activeAyah,
        rangeStartAyah: this.rangeStartAyah,
        rangeEndAyah: this.rangeEndAyah,
        sessionStartAyah: this.sessionStartAyah,
        sessionEndAyah: this.sessionEndAyah,
      })
    },
  },
  watch: {
    pageNumber() {
      this.fontReady = false
      this.fitted = false
      this.surahNamesReady = false
      this.readyAndFit()
    },
    fontScale() {
      this.scheduleFit()
    },
    sessionStartAyah() {
      this.scheduleFit()
    },
    sessionEndAyah() {
      this.scheduleFit()
    },
    tajweedEnabled() {
      this.fontReady = false
      this.fitted = false
      this.readyAndFit()
    },
    codeV2ByLocation: {
      deep: true,
      handler() {
        if (!this.tajweedEnabled) return
        this.scheduleFit()
      },
    },
  },
  mounted() {
    this.observeResize()
    this.readyAndFit()
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    if (this.fitTimer) window.clearTimeout(this.fitTimer)
  },
  methods: {
    onWordSelect(location) {
      this.selectedLocation = String(location || '')
      this.$emit('select', this.selectedLocation)
    },
    onAyahEnter(ayahKey) {
      this.$emit('ayah-enter', ayahKey)
    },
    onAyahLeave(ayahKey) {
      this.$emit('ayah-leave', ayahKey)
    },
    onPeekEnter(ayahKey) {
      this.$emit('peek-enter', ayahKey)
    },
    onPeekLeave(ayahKey) {
      this.$emit('peek-leave', ayahKey)
    },
    onPeekTouchStart(payload) {
      this.$emit('peek-touchstart', payload)
    },
    onPeekTouchEnd(payload) {
      this.$emit('peek-touchend', payload)
    },
    onPeekTouchCancel() {
      this.$emit('peek-touchcancel')
    },
    observeResize() {
      if (typeof ResizeObserver === 'undefined' || !(this.$el instanceof HTMLElement)) return
      this.resizeObserver = new ResizeObserver((entries) => {
        const width = Math.round(entries[0]?.contentRect?.width || this.sheetWidth())
        if (width < 40 || Math.abs(width - this.lastFitWidth) < 2) return
        this.scheduleFit()
      })
      this.resizeObserver.observe(this.$el)
      if (this.$el.parentElement) this.resizeObserver.observe(this.$el.parentElement)
      this.$nextTick(() => {
        const sheet = this.$refs.sheet
        if (sheet instanceof HTMLElement) this.resizeObserver.observe(sheet)
      })
    },
    sheetWidth() {
      const sheet = this.$refs.sheet
      return sheet instanceof HTMLElement ? sheet.clientWidth : this.$el.clientWidth
    },
    scheduleFit() {
      if (this.fitTimer) window.clearTimeout(this.fitTimer)
      this.fitTimer = window.setTimeout(() => this.fitLines(), 50)
    },
    async readyAndFit() {
      try {
        if (this.fontFamily && this.fontUrl) {
          await ensureQpcMadaniPageFont(this.pageNumber, this.fontFamily, this.fontUrl)
        }
      } catch (error) {
        console.warn('[MadaniPage] page font load failed', this.pageNumber, error)
      }
      this.fontReady = true
      const needsSurahFont = this.sessionScoped || this.lines.some((line) => {
        const type = String(line?.line_type || line?.type || '')
        return type === 'surah_name' || type === 'basmallah' || type === 'basmala'
      })
      if (needsSurahFont) {
        await loadSurahNamesFont()
          .then(() => { this.surahNamesReady = true })
          .catch(() => { this.surahNamesReady = false })
      }
      await this.$nextTick()
      this.fitLines()
      window.requestAnimationFrame(() => this.fitLines())
      if (this.tajweedEnabled) {
        void loadQcfPageFont(this.pageNumber, { tajweed: true })
          .then(() => this.scheduleFit())
          .catch(() => null)
      }
    },
    fitLines(retry = 0) {
      if (this.fitting) return
      const root = this.$el
      const sheet = this.$refs.sheet
      if (!(root instanceof HTMLElement) || !(sheet instanceof HTMLElement)) {
        if (retry < 30) window.requestAnimationFrame(() => this.fitLines(retry + 1))
        return
      }
      if (sheet.clientWidth < 40) {
        if (retry < 30) window.requestAnimationFrame(() => this.fitLines(retry + 1))
        else this.fitted = true
        return
      }

      const lines = [...sheet.querySelectorAll('.qpc-madani-line')]
      if (!lines.length) {
        this.fitted = true
        return
      }

      const measurable = lines.filter((line) => line.dataset.lineType !== 'surah_name')
      const targets = measurable.length ? measurable : lines

      this.fitting = true
      root.style.setProperty('--qpc-word-size', `${MEASURE_SIZE}px`)
      const previous = targets.map(line => ({
        width: line.style.width,
        justify: line.style.justifyContent,
      }))
      for (const line of targets) {
        line.style.width = 'max-content'
        line.style.maxWidth = 'none'
        line.style.justifyContent = 'flex-start'
      }
      void sheet.offsetWidth

      const widest = Math.max(1, ...targets.map(line => this.lineAdvanceWidth(line)))
      for (const [index, line] of targets.entries()) {
        line.style.width = previous[index].width
        line.style.maxWidth = ''
        line.style.justifyContent = previous[index].justify
      }

      const available = this.contentWidth(sheet)
      this.fitting = false
      if (available <= 0) {
        if (retry < 30) window.requestAnimationFrame(() => this.fitLines(retry + 1))
        else this.fitted = true
        return
      }

      const narrow = available < 440
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768
      const safety = this.embedded
        ? (narrow ? 0.9 : 0.94)
        : (mobile ? 0.9 : (narrow ? 0.88 : 0.94))
      const cap = this.embedded
        ? (narrow ? 30 : 34)
        : (narrow ? 32 : 36)
      const requested = Number.isFinite(Number(this.fontScale)) && Number(this.fontScale) > 0
        ? Number(this.fontScale)
        : 1
      const widthFit = (available / widest) * MEASURE_SIZE * safety
      const rawSize = Math.min(cap * requested, widthFit)
      // Whole-pixel sizes avoid COLR / QCF glyph clipping in WebKit.
      const size = Math.max(8, Math.round(rawSize))
      root.style.setProperty('--qpc-word-size', `${size}px`)
      this.lastFitWidth = Math.round(sheet.clientWidth)
      this.fitted = true
    },
    lineAdvanceWidth(line) {
      const nodes = [...line.querySelectorAll('.qpc-madani-word, .qpc-madani-surah-name, .qpc-madani-basmallah')]
      if (!nodes.length) return line.scrollWidth
      return nodes.reduce((sum, node) => sum + node.offsetWidth, 0)
    },
    contentWidth(sheet) {
      const styles = getComputedStyle(sheet)
      const padding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
      return Math.max(0, sheet.clientWidth - padding)
    },
  },
}
</script>

<style scoped>
.qpc-madani-page {
  --qpc-word-size: 18px;
  --qpc-line-min-height: 2.85;
  --qpc-line-height: 1.72;
  --qpc-ink: var(--mushaf-reading-ink, #1b140d);
  --qpc-rule: color-mix(in srgb, var(--accent, #8d6a35) 48%, transparent);
  box-sizing: border-box;
  width: min(100%, 40rem);
  max-width: 100%;
  margin: 1rem auto 2rem;
  padding: 0.55rem;
  overflow: visible;
  background:
    linear-gradient(180deg, #f7edd6 0%, #f3e6c8 48%, #efe0bc 100%);
  color: var(--qpc-ink);
  box-shadow: 0 10px 28px rgba(62, 41, 18, 0.1);
}

.qpc-madani-page:not(.is-font-ready) {
  opacity: 0.35;
}

.qpc-madani-page--embedded:not(.is-font-ready) {
  opacity: 1;
}

.qpc-madani-page.is-font-ready {
  opacity: 1;
  transition: opacity 120ms ease;
}

.qpc-madani-page--embedded.is-font-ready {
  transition: none;
}

.qpc-madani-page__ornament {
  box-sizing: border-box;
  padding: 0.28rem;
  border: 2px solid var(--qpc-rule);
  background: #fffdf8;
  overflow: visible;
}

.qpc-madani-page__sheet {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0.95rem 1.15rem 0.45rem;
  border: 1px solid rgba(141, 106, 53, 0.42);
  overflow-x: visible;
  overflow-y: visible;
  max-width: 100%;
}

.qpc-madani-page--opening .qpc-madani-page__sheet {
  justify-content: center;
  padding-block: 2.4rem 1.4rem;
}

.qpc-madani-page__folio {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.7rem;
  padding: 0.28rem 0 0.08rem;
  color: var(--qpc-rule);
  font-family: "Amiri Quran", "Amiri", serif;
  font-size: 0.98rem;
  line-height: 1;
}

.qpc-madani-page--embedded {
  width: 100%;
  max-width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: #fbf6eb;
  box-shadow: none;
}

.qpc-madani-page--embedded .qpc-madani-page__ornament,
.qpc-madani-page--embedded .qpc-madani-page__sheet {
  height: 100%;
  border: 0;
  background: transparent;
}

.qpc-madani-page--embedded .qpc-madani-page__ornament {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.qpc-madani-page--embedded .qpc-madani-page__sheet {
  flex: 1 1 auto;
  padding: 1.45rem 1.5rem 0.55rem;
}

.qpc-madani-page--embedded .qpc-madani-page__folio {
  min-height: 1.55rem;
  padding: 0.2rem 0 0.45rem;
  color: #8a7048;
  font-family: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
}

.qpc-madani-page--single {
  --qpc-line-min-height: 2.85;
  --qpc-line-height: 1.72;
  width: 100%;
  max-width: min(100%, 36rem);
  height: auto;
  min-height: 0;
  margin: 0 auto;
  padding: 0.12rem;
  box-shadow: 0 6px 18px rgba(62, 41, 18, 0.08);
}

.qpc-madani-page--single .qpc-madani-page__ornament,
.qpc-madani-page--single .qpc-madani-page__sheet {
  height: auto;
}

.qpc-madani-page--single .qpc-madani-page__ornament {
  padding: 0.18rem;
}

.qpc-madani-page--single .qpc-madani-page__sheet {
  flex: none;
  padding: 0.5rem 0.38rem 0.18rem;
}

.qpc-madani-page--single.qpc-madani-page--opening .qpc-madani-page__sheet {
  padding-block: 0.7rem 0.35rem;
}

.qpc-madani-page--single .qpc-madani-page__folio {
  min-height: 1.35rem;
  padding: 0.18rem 0 0.04rem;
  font-size: 0.88rem;
}

.qpc-madani-page--borderless,
.qpc-madani-page--borderless.qpc-madani-page--single {
  margin: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.qpc-madani-page--borderless .qpc-madani-page__ornament {
  padding: 0;
  border: 0;
  background: transparent;
}

.qpc-madani-page--borderless .qpc-madani-page__sheet {
  border: 0;
  background: transparent;
}

.qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet {
  padding:
    0.35rem
    max(0.65rem, env(safe-area-inset-right, 0px), env(safe-area-inset-left, 0px))
    0.5rem;
}

.qpc-madani-page--borderless.qpc-madani-page--opening .qpc-madani-page__sheet {
  padding-block: 0.85rem 0.35rem;
}

.qpc-madani-page--borderless .qpc-madani-page__folio {
  color: #8a7048;
}

.qpc-madani-page--borderless.qpc-madani-page--embedded {
  background: transparent;
}

.qpc-madani-page--borderless.qpc-madani-page--embedded .qpc-madani-page__ornament {
  padding: 0;
}

.qpc-madani-page--borderless.qpc-madani-page--embedded .qpc-madani-page__sheet {
  padding: clamp(0.55rem, 1.4vw, 0.95rem) clamp(0.45rem, 1.1vw, 0.85rem) clamp(0.28rem, 0.8vw, 0.42rem);
}
</style>
