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
      'qpc-madani-page--session-viewport-fill': sessionViewportFill,
      'qpc-madani-page--spread-viewport-fill': spreadViewportFill,
      'qpc-madani-page--indopak': isIndopakLayout,
    }"
    :data-layout="layoutId"
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
          :layout-id="layoutId"
          :session-scoped="sessionScoped"
          :font-family="fontFamily"
          :selected-location="selectedLocation"
          :selection="selection"
          :technique-snapshot="techniqueSnapshot"
          :progress-snapshot="progressSnapshot"
          :audio-index-map="audioIndexMap"
          :tajweed-enabled="tajweedEnabled"
          :code-v2-by-location="codeV2ByLocation"
          :tajweed-html-by-location="tajweedHtmlByLocation"
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
        :class="{ 'qpc-madani-page__folio--session-break': sessionScoped }"
        aria-hidden="true"
      >
        <div
          v-if="sessionScoped"
          class="qpc-madani-page__folio-break"
        >
          <span class="qpc-madani-page__folio-number">{{ folioLabel }}</span>
        </div>
        <span
          v-else
          class="qpc-madani-page__folio-number"
        >{{ folioLabel }}</span>
      </div>
    </div>
  </article>
</template>

<script>
import { loadSurahNamesFont, loadQcfPageFont } from '../../scripts/mushaf/qcfFontLoader'
import { ensureQpcMadaniPageFont } from '../../scripts/mushaf/qpcMadaniFontLoader'
import { ensureIndopakNastaleeqFontForLayout } from '../../scripts/mushaf/indopakNastaleeqFont'
import { isIndopakMushafLayout } from '../../scripts/mushaf/indopakPageAdapter'
import { MUSHAF_LAYOUT_MADANI_V2 } from '../../scripts/mushaf/mushafLayouts'
import {
  applyIndopakPageTypographyVars,
  clearIndopakPageTypographyVars,
  indopakFitSafety,
  indopakFitWordSizeCap,
  INDOPAK_PAGE_TYPOGRAPHY,
  mushafTwoPageMinWidth,
} from '../../scripts/mushaf/indopakPageTypography'
import { buildMadaniSelection, prepareQpcMadaniSessionLines } from '../../scripts/mushaf/qpcMadaniSelection'
import MadaniLine from './MadaniLine.vue'

const MADANI_MEASURE_SIZE = 40
/** IndoPak Nastaleeq measure base — independent of Madani QCF 40px probe. */
const INDOPAK_MEASURE_SIZE = 36

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
    layoutId: {
      type: String,
      default: MUSHAF_LAYOUT_MADANI_V2,
    },
    embedded: {
      type: Boolean,
      default: false,
    },
    spreadViewportFill: {
      type: Boolean,
      default: false,
    },
    spreadUnifiedWordSize: {
      type: Number,
      default: null,
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
    tajweedHtmlByLocation: {
      type: Object,
      default: null,
    },
  },
  emits: ['select', 'ayah-enter', 'ayah-leave', 'peek-enter', 'peek-leave', 'peek-touchstart', 'peek-touchend', 'peek-touchcancel', 'fit-word-size'],
  data() {
    return {
      selectedLocation: '',
      resizeObserver: null,
      visualViewportHandler: null,
      fitTimer: null,
      lastFitWidth: 0,
      lastFitHeight: 0,
      fitted: false,
      fitting: false,
      fontReady: false,
      surahNamesReady: false,
    }
  },
  computed: {
    isIndopakLayout() {
      return isIndopakMushafLayout(this.layoutId)
    },
    pageNumber() {
      return Number(this.page?.page_number ?? this.page?.pageNumber) || 1
    },
    lines() {
      const raw = Array.isArray(this.page?.lines) ? [...this.page.lines] : []
      raw.sort((a, b) => {
        const left = Math.trunc(Number(a?.line_number ?? a?.lineNumber) || 0)
        const right = Math.trunc(Number(b?.line_number ?? b?.lineNumber) || 0)
        return left - right
      })
      const showHeader = !this.sessionScoped || this.showSessionSurahHeader
      return prepareQpcMadaniSessionLines(raw, this.sessionStartAyah, this.sessionEndAyah, {
        showSurahHeader: showHeader,
        preservePrintedGrid: !!this.spreadViewportFill,
      })
    },
    isOpening() {
      if (this.spreadViewportFill) return false
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
    sessionViewportFill() {
      return false
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
    layoutId() {
      this.applyLayoutTypography()
      this.fontReady = false
      this.fitted = false
      this.readyAndFit()
    },
    spreadViewportFill() {
      this.scheduleFit()
    },
    spreadUnifiedWordSize() {
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
    this.applyLayoutTypography()
    this.observeResize()
    this.readyAndFit()
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    if (this.visualViewportHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.visualViewportHandler)
    }
    this.visualViewportHandler = null
    if (this.fitTimer) window.clearTimeout(this.fitTimer)
    clearIndopakPageTypographyVars(this.$el)
  },
  methods: {
    applyLayoutTypography() {
      const root = this.$el
      if (!(root instanceof HTMLElement)) return
      if (this.isIndopakLayout) {
        applyIndopakPageTypographyVars(root)
        if (!root.style.getPropertyValue('--qpc-word-size')) {
          root.style.setProperty('--qpc-word-size', INDOPAK_PAGE_TYPOGRAPHY.wordSize)
        }
      } else {
        clearIndopakPageTypographyVars(root)
      }
    },
    measureSize() {
      return this.isIndopakLayout ? INDOPAK_MEASURE_SIZE : MADANI_MEASURE_SIZE
    },
    twoPageMinWidth() {
      return mushafTwoPageMinWidth(this.layoutId)
    },
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
        const entry = entries[0]
        const width = Math.round(entry?.contentRect?.width || this.sheetWidth())
        const height = Math.round(entry?.contentRect?.height || 0)
        const widthChanged = width >= 40 && Math.abs(width - this.lastFitWidth) >= 2
        const heightChanged = (this.sessionViewportFill || this.spreadViewportFill)
          && height >= 80
          && Math.abs(height - (this.lastFitHeight || 0)) >= 8
        if (!widthChanged && !heightChanged) return
        if (heightChanged) this.lastFitHeight = height
        this.scheduleFit()
      })
      this.resizeObserver.observe(this.$el)
      if (this.$el.parentElement) this.resizeObserver.observe(this.$el.parentElement)
      this.$nextTick(() => {
        const sheet = this.$refs.sheet
        if (sheet instanceof HTMLElement) this.resizeObserver.observe(sheet)
      })
      if (typeof window !== 'undefined' && window.innerWidth < 768 && window.visualViewport) {
        this.visualViewportHandler = () => this.scheduleFit()
        window.visualViewport.addEventListener('resize', this.visualViewportHandler)
      }
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
        if (this.isIndopakLayout) {
          await ensureIndopakNastaleeqFontForLayout(this.layoutId)
        } else if (this.fontFamily && this.fontUrl) {
          await ensureQpcMadaniPageFont(this.pageNumber, this.fontFamily, this.fontUrl)
        }
      } catch (error) {
        console.warn('[MadaniPage] page font load failed', this.pageNumber, error)
      }
      if (!this.isIndopakLayout && this.tajweedEnabled) {
        try {
          await loadQcfPageFont(this.pageNumber, { tajweed: true })
        } catch {
          // Page JSON glyphs still paint once v4 loads from prefetch.
        }
      }
      this.fontReady = true
      const needsSurahFont = this.sessionScoped || this.lines.some((line) => {
        const type = String(line?.line_type || line?.type || '')
        return type === 'surah_name' || type === 'basmallah' || type === 'basmala'
      })
      if (needsSurahFont) {
        if (this.isIndopakLayout) {
          this.surahNamesReady = this.fontReady
        } else {
          await loadSurahNamesFont()
            .then(() => { this.surahNamesReady = true })
            .catch(() => { this.surahNamesReady = false })
        }
      }
      await this.$nextTick()
      this.fitLines()
      window.requestAnimationFrame(() => this.fitLines())
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

      const measurable = lines.filter((line) => {
        const type = String(line.dataset.lineType || '')
        return type !== 'surah_name' && type !== 'empty'
      })
      const targets = measurable.length ? measurable : lines

      this.fitting = true
      const measureSize = this.measureSize()
      this.applyLayoutTypography()
      root.style.setProperty('--qpc-word-size', `${measureSize}px`)
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
      const twoPageMin = this.twoPageMinWidth()
      const desktopSpread = typeof window !== 'undefined'
        && window.innerWidth >= twoPageMin
        && this.spreadViewportFill
      const sessionSheet = mobile && !this.embedded
      const fitCtx = {
        mobile,
        narrow,
        desktopSpread,
        sessionSheet,
        embedded: !!this.embedded,
      }
      let safety
      let cap
      if (this.isIndopakLayout) {
        safety = indopakFitSafety(fitCtx)
        cap = indopakFitWordSizeCap(fitCtx)
      } else {
        safety = this.embedded || sessionSheet
          ? (narrow ? 0.88 : 0.92)
          : (mobile ? 0.9 : (narrow ? 0.9 : 0.95))
        if (sessionSheet) {
          safety = 0.985
        }
        if (this.spreadViewportFill && !desktopSpread && !mobile) {
          safety = Math.min(safety, narrow ? 0.74 : 0.78)
        } else if (desktopSpread && this.embedded) {
          safety = narrow ? 0.9 : 0.95
        }
        cap = this.embedded
          ? (narrow ? 36 : 42)
          : (mobile ? (narrow ? 56 : 66) : (narrow ? 44 : 50))
        if (sessionSheet) {
          cap = narrow ? 62 : 72
        }
        if (desktopSpread && this.embedded) {
          cap = narrow ? 52 : 68
        }
      }
      const requested = Number.isFinite(Number(this.fontScale)) && Number(this.fontScale) > 0
        ? Number(this.fontScale)
        : 1
      const widthFit = (available / widest) * measureSize * safety
      let rawSize = Math.min(cap * requested, widthFit)
      if (this.sessionViewportFill) {
        const heightFit = this.viewportBandHeightFit(root, sheet, targets.length, measureSize)
        if (Number.isFinite(heightFit) && heightFit > 0) {
          rawSize = Math.min(cap * requested, widthFit, heightFit)
        }
      } else if (this.spreadViewportFill) {
        const heightFit = this.viewportBandHeightFit(root, sheet, 15, measureSize)
        if (Number.isFinite(heightFit) && heightFit > 0) {
          rawSize = Math.min(cap * requested, widthFit, heightFit)
        }
      }
      const syncedSize = Math.max(8, Math.round(rawSize))
      let size = syncedSize
      if (
        this.spreadViewportFill
        && Number.isFinite(Number(this.spreadUnifiedWordSize))
        && Number(this.spreadUnifiedWordSize) > 0
      ) {
        size = Math.min(syncedSize, Math.round(Number(this.spreadUnifiedWordSize)))
      }
      // Whole-pixel sizes avoid COLR / QCF glyph clipping in WebKit.
      root.style.setProperty('--qpc-word-size', `${size}px`)
      this.lastFitWidth = Math.round(sheet.clientWidth)
      this.fitted = true
      if (this.spreadViewportFill) {
        this.$emit('fit-word-size', syncedSize)
        this.applySpreadViewportLayout(root, sheet)
        window.requestAnimationFrame(() => this.applySpreadViewportLayout(root, sheet))
      }
    },
    applySpreadViewportLayout(root, sheet) {
      if (!this.spreadViewportFill) return
      if (!(root instanceof HTMLElement) || !(sheet instanceof HTMLElement)) return
      const spread = root.closest('.qpc-madani-spread--viewport-fill')
      let bandPx = this.sessionViewportTargetHeight()
      if (spread instanceof HTMLElement) {
        const fromSpread = Number.parseFloat(spread.style.getPropertyValue('--qpc-spread-band'))
        if (Number.isFinite(fromSpread) && fromSpread > 0) bandPx = fromSpread
      }
      const ornament = root.querySelector('.qpc-madani-page__ornament')
      const folio = root.querySelector('.qpc-madani-page__folio')
      if (ornament instanceof HTMLElement) {
        ornament.style.minHeight = `${bandPx}px`
        ornament.style.display = 'flex'
        ornament.style.flexDirection = 'column'
        ornament.style.justifyContent = 'stretch'
      }
      const folioHeight = folio instanceof HTMLElement ? folio.offsetHeight : 0
      const rowCount = Math.max(15, sheet.querySelectorAll('.qpc-madani-line').length)
      sheet.style.flex = '1 1 auto'
      sheet.style.display = 'grid'
      sheet.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`
      sheet.style.alignContent = 'stretch'
      sheet.style.justifyContent = 'stretch'
      sheet.style.minHeight = `${Math.max(160, bandPx - folioHeight)}px`
      sheet.querySelectorAll('.qpc-madani-line').forEach((line) => {
        if (!(line instanceof HTMLElement)) return
        line.style.minHeight = '0'
        line.style.margin = '0'
        line.style.flex = 'unset'
      })
    },
    lineAdvanceWidth(line) {
      const nodes = [...line.querySelectorAll('.qpc-madani-word, .qpc-madani-surah-name, .qpc-madani-basmallah')]
      if (!nodes.length) return line.scrollWidth
      return nodes.reduce(
        (sum, node) => sum + Math.max(node.offsetWidth, node.scrollWidth || 0),
        0,
      )
    },
    contentWidth(sheet) {
      const styles = getComputedStyle(sheet)
      const padding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
      let inner = Math.max(0, sheet.clientWidth - padding)
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768
      if ((this.spreadViewportFill || this.embedded) && !mobile) {
        const desktopSpread = typeof window !== 'undefined' && window.innerWidth >= this.twoPageMinWidth()
        inner = Math.max(0, inner - (desktopSpread ? 6 : 28))
      }
      return inner
    },
    sessionViewportTargetHeight() {
      if (typeof window === 'undefined') return 0
      const viewport = window.visualViewport?.height || window.innerHeight || 0
      const desktop = window.innerWidth >= this.twoPageMinWidth()
      const band = desktop
        ? Math.min(viewport * 0.74, viewport - 184)
        : Math.min(viewport * 0.72, viewport - 168)
      return Math.max(320, Math.round(band))
    },
    viewportBandHeightFit(root, sheet, lineSlots, measureSize = this.measureSize()) {
      if (!(root instanceof HTMLElement) || !(sheet instanceof HTMLElement) || lineSlots < 1) return null
      const targetHeight = this.sessionViewportTargetHeight()
      const folio = root.querySelector('.qpc-madani-page__folio')
      const folioHeight = folio instanceof HTMLElement ? folio.offsetHeight : 0
      const sheetStyles = getComputedStyle(sheet)
      const sheetPadding = Number.parseFloat(sheetStyles.paddingTop) + Number.parseFloat(sheetStyles.paddingBottom)
      const availableHeight = Math.max(0, targetHeight - folioHeight - sheetPadding)
      if (availableHeight < 96) return null
      const defaultMin = this.isIndopakLayout
        ? Number.parseFloat(INDOPAK_PAGE_TYPOGRAPHY.lineMinHeight)
        : 1.62
      const lineMinHeight = Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--qpc-line-min-height') || String(defaultMin),
      ) || defaultMin
      return (availableHeight / lineSlots) / lineMinHeight * measureSize * 0.92
    },
  },
}
</script>

<style scoped>
.qpc-madani-page {
  --qpc-word-size: 18px;
  --qpc-line-min-height: 1.62;
  --qpc-line-height: 1.32;
  --qpc-surah-title-scale: 2.45;
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

.qpc-madani-page__folio--session-break {
  display: block;
  width: 100%;
  padding: 0;
}

.qpc-madani-page__folio-break {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  max-width: 100%;
  margin-inline: clamp(0.75rem, 4.5vw, 1.85rem);
  padding: 0.45rem 0 0.62rem;
  border-bottom: 1px solid color-mix(in srgb, var(--qpc-rule, #8d6a35) 42%, transparent);
}

.qpc-madani-page__folio-number {
  display: block;
  line-height: 1;
}

.qpc-madani-page__folio--session-break .qpc-madani-page__folio-number {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.qpc-madani-page--borderless.qpc-madani-page--session-scoped .qpc-madani-page__folio {
  min-height: 0;
  padding: 0;
}

.qpc-madani-page--borderless.qpc-madani-page--session-scoped .qpc-madani-page__folio-break {
  padding: 0.48rem 0 0.72rem;
  margin-inline: clamp(0.85rem, 5vw, 2.25rem);
  margin-bottom: 0.4rem;
  border-bottom: 1px solid color-mix(in srgb, var(--mushaf-reading-ink, #8a7048) 36%, transparent);
}

.qpc-madani-page--borderless.qpc-madani-page--session-scoped .qpc-madani-page__folio-number {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--mushaf-reading-ink, #f7ebdf) 94%, #fff);
  -webkit-text-fill-color: color-mix(in srgb, var(--mushaf-reading-ink, #f7ebdf) 94%, #fff);
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

@media (min-width: 1080px) {
  .qpc-madani-page--embedded.qpc-madani-page--spread-viewport-fill {
    flex: 1 1 auto;
    min-height: 100%;
  }

  .qpc-madani-page--spread-viewport-fill .qpc-madani-page__ornament {
    min-height: 100%;
  }

  .qpc-madani-page--spread-viewport-fill .qpc-madani-page__sheet {
    display: grid;
    grid-template-rows: repeat(15, minmax(0, 1fr));
    justify-content: stretch;
    height: 100%;
  }

  .qpc-madani-page--spread-viewport-fill .qpc-madani-line {
    min-height: 0;
    margin: 0;
  }

  .qpc-madani-page--spread-viewport-fill .qpc-madani-line--surah_name {
    margin-block-end: 0;
    padding: 0;
  }

  .qpc-madani-page--spread-viewport-fill :deep(.qpc-madani-surah-name) {
    font-size: calc(var(--qpc-word-size, 22px) * 1.55);
  }
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
  --qpc-line-min-height: 1.62;
  --qpc-line-height: 1.32;
  --qpc-surah-title-scale: 2.45;
  width: 100%;
  max-width: 100%;
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
    max(0.35rem, calc(env(safe-area-inset-top, 0px) + 0.2rem))
    max(0.04rem, env(safe-area-inset-right, 0px))
    max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.35rem))
    max(0.04rem, env(safe-area-inset-left, 0px));
}

@media (max-width: 767.98px) {
  .qpc-madani-page--single,
  .qpc-madani-page--borderless.qpc-madani-page--single {
    width: 100%;
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  .qpc-madani-page--borderless .qpc-madani-page__sheet {
    width: 100%;
    max-width: 100%;
  }
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
  padding:
    max(clamp(0.55rem, 1.4vw, 0.95rem), calc(env(safe-area-inset-top, 0px) + 0.2rem))
    max(clamp(0.45rem, 1.1vw, 0.85rem), env(safe-area-inset-right, 0px))
    max(clamp(0.28rem, 0.8vw, 0.42rem), env(safe-area-inset-bottom, 0px))
    max(clamp(0.45rem, 1.1vw, 0.85rem), env(safe-area-inset-left, 0px));
}

/*
 * IndoPak 15 Lines — Qudratullah typography (layout-specific; not Madani QCF values).
 * Word allocation / line breaks stay fixed — only box metrics scale.
 */
.qpc-madani-page--indopak {
  --qpc-word-size: 17px;
  --qpc-line-height: 1.92;
  --qpc-line-min-height: 2.12;
  --qpc-line-gap: 0.14;
  --qpc-surah-title-scale: 2.0;
  --qpc-page-padding-block: 0.62rem;
  --qpc-page-padding-inline: 0.48rem;
  --indopak-embedded-padding-block: 1.15rem;
  --indopak-embedded-padding-inline: 1.05rem;
  --indopak-mobile-padding-block: 0.55rem;
  --indopak-mobile-padding-inline: 0.42rem;
  max-width: 100%;
  overflow-x: clip;
}

.qpc-madani-page--indopak.qpc-madani-page--single {
  --qpc-line-height: 1.92;
  --qpc-line-min-height: 2.12;
  --qpc-surah-title-scale: 2.0;
  width: 100%;
  max-width: 100%;
  padding: 0.08rem;
}

.qpc-madani-page--indopak.qpc-madani-page--single .qpc-madani-page__sheet {
  padding:
    var(--qpc-page-padding-block, 0.62rem)
    var(--qpc-page-padding-inline, 0.48rem)
    0.28rem;
}

.qpc-madani-page--indopak.qpc-madani-page--embedded .qpc-madani-page__sheet {
  padding:
    var(--indopak-embedded-padding-block, 1.15rem)
    var(--indopak-embedded-padding-inline, 1.05rem)
    0.5rem;
}

.qpc-madani-page--indopak.qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet {
  padding:
    max(var(--indopak-mobile-padding-block, 0.55rem), calc(env(safe-area-inset-top, 0px) + 0.2rem))
    max(var(--indopak-mobile-padding-inline, 0.42rem), env(safe-area-inset-right, 0px))
    max(0.85rem, calc(env(safe-area-inset-bottom, 0px) + 0.4rem))
    max(var(--indopak-mobile-padding-inline, 0.42rem), env(safe-area-inset-left, 0px));
}

.qpc-madani-page--indopak .qpc-madani-page__sheet {
  max-width: 100%;
  overflow-x: clip;
}

.qpc-madani-page--indopak :deep(.qpc-madani-line--ayah) {
  /* 15 fixed lines — preserve geometry; gap from --qpc-line-gap only. */
  flex-wrap: nowrap;
  max-width: 100%;
}

@media (max-width: 767.98px) {
  .qpc-madani-page--indopak,
  .qpc-madani-page--indopak.qpc-madani-page--single,
  .qpc-madani-page--indopak.qpc-madani-page--borderless {
    width: 100%;
    max-width: 100%;
    margin-inline: 0;
    overflow-x: clip;
  }

  .qpc-madani-page--indopak .qpc-madani-page__ornament,
  .qpc-madani-page--indopak .qpc-madani-page__sheet {
    width: 100%;
    max-width: 100%;
    overflow-x: clip;
  }
}

@media (min-width: 1200px) {
  .qpc-madani-page--indopak.qpc-madani-page--embedded.qpc-madani-page--spread-viewport-fill {
    flex: 1 1 auto;
    min-height: 100%;
  }

  .qpc-madani-page--indopak.qpc-madani-page--spread-viewport-fill .qpc-madani-page__sheet {
    display: grid;
    grid-template-rows: repeat(15, minmax(0, 1fr));
    justify-content: stretch;
    height: 100%;
  }

  .qpc-madani-page--indopak.qpc-madani-page--spread-viewport-fill .qpc-madani-line {
    min-height: 0;
    margin: 0;
  }
}
</style>
