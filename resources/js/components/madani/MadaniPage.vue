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
          :key="line.line_number"
          :line="line"
          :font-family="fontFamily"
          :selected-location="selectedLocation"
          :selection="selection"
          @select="onWordSelect"
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
import { loadSurahNamesFont } from '../../scripts/mushaf/qcfFontLoader'
import { ensureQpcMadaniPageFont } from '../../scripts/mushaf/qpcMadaniFontLoader'
import { buildMadaniSelection } from '../../scripts/mushaf/qpcMadaniSelection'
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
  },
  emits: ['select'],
  data() {
    return {
      selectedLocation: '',
      resizeObserver: null,
      fitTimer: null,
      lastFitWidth: 0,
      fitted: false,
      fitting: false,
      fontReady: false,
    }
  },
  computed: {
    pageNumber() {
      return Number(this.page?.page_number) || 1
    },
    lines() {
      return Array.isArray(this.page?.lines) ? this.page.lines : []
    },
    isOpening() {
      return this.lines.length > 0 && this.lines.length < 15
    },
    folioLabel() {
      if (this.embedded) return String(this.pageNumber)
      return new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(this.pageNumber)
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
      this.readyAndFit()
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
    observeResize() {
      if (typeof ResizeObserver === 'undefined' || !(this.$el instanceof HTMLElement)) return
      this.resizeObserver = new ResizeObserver((entries) => {
        const width = Math.round(entries[0]?.contentRect?.width || this.sheetWidth())
        if (width < 40 || Math.abs(width - this.lastFitWidth) < 2) return
        this.scheduleFit()
      })
      this.resizeObserver.observe(this.$el)
      if (this.$el.parentElement) this.resizeObserver.observe(this.$el.parentElement)
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
        await ensureQpcMadaniPageFont(this.pageNumber, this.fontFamily, this.fontUrl)
        this.fontReady = true
      } catch {
        this.fontReady = false
        return
      }
      if (this.lines.some(line => line.line_type === 'surah_name' || line.line_type === 'basmallah')) {
        await loadSurahNamesFont().catch(() => null)
      }
      await this.$nextTick()
      this.fitLines()
      window.setTimeout(() => this.fitLines(), 200)
    },
    fitLines() {
      if (this.fitting) return
      const root = this.$el
      const sheet = this.$refs.sheet
      if (!(root instanceof HTMLElement) || !(sheet instanceof HTMLElement)) return
      if (sheet.clientWidth < 40) return

      const lines = [...sheet.querySelectorAll('.qpc-madani-line')]
      if (!lines.length) return

      this.fitting = true
      root.style.setProperty('--qpc-word-size', `${MEASURE_SIZE}px`)
      const previous = lines.map(line => ({
        width: line.style.width,
        justify: line.style.justifyContent,
      }))
      for (const line of lines) {
        line.style.width = 'max-content'
        line.style.maxWidth = 'none'
        line.style.justifyContent = 'flex-start'
      }
      void sheet.offsetWidth

      const widest = Math.max(1, ...lines.map(line => this.lineAdvanceWidth(line)))
      for (const [index, line] of lines.entries()) {
        line.style.width = previous[index].width
        line.style.maxWidth = ''
        line.style.justifyContent = previous[index].justify
      }

      const available = this.contentWidth(sheet)
      this.fitting = false
      if (available <= 0) return

      const safety = this.embedded ? 0.97 : 0.995
      const cap = this.embedded ? 34 : 36
      const size = Math.min(cap, available / widest * MEASURE_SIZE * safety)
      root.style.setProperty('--qpc-word-size', `${size.toFixed(2)}px`)
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
  --qpc-ink: #1b140d;
  --qpc-rule: #8d6a35;
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

.qpc-madani-page:not(.is-font-ready),
.qpc-madani-page:not(.is-fitted) {
  opacity: 0;
}

.qpc-madani-page__ornament {
  box-sizing: border-box;
  padding: 0.28rem;
  border: 2px solid var(--qpc-rule);
  background: #fffdf8;
}

.qpc-madani-page__sheet {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0.95rem 1.15rem 0.45rem;
  border: 1px solid rgba(141, 106, 53, 0.42);
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
  --qpc-line-min-height: 1.62em;
  --qpc-line-height: 1.42;
  width: 100%;
  max-width: none;
  height: auto;
  min-height: 0;
  margin: 0.4rem auto 1rem;
  padding: 0.28rem;
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
  padding: 0.55rem 0.45rem 0.2rem;
}

.qpc-madani-page--single.qpc-madani-page--opening .qpc-madani-page__sheet {
  padding-block: 0.7rem 0.35rem;
}

.qpc-madani-page--single .qpc-madani-page__folio {
  min-height: 1.35rem;
  padding: 0.18rem 0 0.04rem;
  font-size: 0.88rem;
}
</style>
