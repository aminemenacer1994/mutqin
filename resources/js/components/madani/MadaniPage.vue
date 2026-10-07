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
      'is-page-revealed': pageRevealed,
      'qpc-madani-page--tajweed': tajweedEnabled,
      'qpc-madani-page--borderless': borderless,
      'qpc-madani-page--session-scoped': sessionScoped,
      'qpc-madani-page--session-compact': sessionDesktopSpreadCompact,
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
          v-for="(line, lineIndex) in displayLines"
          :key="`${line.line_type || line.type}-${line.line_number}-${line.surah_number || 0}-${lineIndex}`"
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
        aria-hidden="true"
      >
        <span class="qpc-madani-page__folio-number">{{ folioLabel }}</span>
      </div>
    </div>
  </article>
</template>

<script>
import { loadSurahNamesFont, loadQcfPageFont } from '../../scripts/mushaf/qcfFontLoader'
import {
  ensureQpcMadaniPageFont,
  warmQpcMadaniPageFont,
} from '../../scripts/mushaf/qpcMadaniFontLoader'
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
import {
  DESKTOP_SPREAD_FOLIO_RESERVE_PX,
  DESKTOP_SPREAD_LINE_SLOTS,
  desktopSpreadSheetHeight,
  desktopSpreadStableWordSize,
} from '../../scripts/mushaf/mushafDesktopFit'
import {
  DESKTOP_MUSHAF_SPARSE_RATIO,
  MOBILE_MUSHAF_HAIRLINE_PX,
  MOBILE_MUSHAF_SPARSE_RATIO,
  MOBILE_MUSHAF_WORD_SIZE_CAP,
  MOBILE_MUSHAF_WORD_SIZE_FLOOR,
  clampMobileMushafWordSize,
  compactMobileMushafDisplayLines,
  isMobileMushafAyahSparse,
  mobileMushafAyahJustify,
  mobileMushafFitSafety,
  mobileMushafWordSizePx,
  mobileViewportInnerWidth,
  qcfSideBearingPx,
  reorderMushafOpeningLines,
} from '../../scripts/mushaf/mobileMushafLineFit'
import {
  buildMadaniSelection,
  parseAyahKey,
  prepareQpcMadaniSessionLines,
} from '../../scripts/mushaf/qpcMadaniSelection'
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
    sharedWordSize: {
      type: Number,
      default: 0,
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
      lastEmittedFitWordSize: 0,
      lastSessionFitWordSize: 0,
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
      if (!this.sessionScoped) return raw
      const showHeader = this.showSessionSurahHeader
      const desktopSessionSpread = this.sessionDesktopSpreadCompact
      return prepareQpcMadaniSessionLines(raw, this.sessionStartAyah, this.sessionEndAyah, {
        showSurahHeader: showHeader,
        preservePrintedGrid: !!this.spreadViewportFill && !desktopSessionSpread,
        includeSurahOpening: showHeader,
      })
    },
    isOpening() {
      if (this.sessionScoped || this.spreadViewportFill) return false
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
    sessionDesktopSpreadCompact() {
      return this.sessionScoped && this.desktopSpreadLayout()
    },
    displayLines() {
      const rows = this.lines
      if (this.sessionDesktopSpreadCompact) {
        return reorderMushafOpeningLines(rows.filter((line) => this.lineTypeOf(line) !== 'empty'))
      }
      if (this.isPhoneViewport()) return compactMobileMushafDisplayLines(rows)
      if (this.isTabletViewport()) return compactMobileMushafDisplayLines(rows)
      return reorderMushafOpeningLines(rows)
    },
    singleAyahSession() {
      if (!this.sessionScoped) return false
      const start = parseAyahKey(this.sessionStartAyah)?.key || ''
      const end = parseAyahKey(this.sessionEndAyah)?.key || start
      return !!(start && end && start === end)
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
    /** Ink stays hidden until the correct face is loaded and lines are measured. */
    pageRevealed() {
      return !!(this.fontReady && this.fitted)
    },
  },
  watch: {
    pageNumber() {
      this.fontReady = false
      this.fitted = false
      this.surahNamesReady = false
      this.lastEmittedFitWordSize = 0
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
    sharedWordSize() {
      this.applySharedWordSize()
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
      this.lastFitWidth = 0
      this.lastSessionFitWordSize = 0
      this.lastEmittedFitWordSize = 0
      this.readyAndFit()
    },
    codeV2ByLocation: {
      deep: true,
      handler() {
        // Tajweed code map can arrive after first paint — re-fit in both modes once
        // glyphs (or their plain fallbacks) settle.
        this.fitted = false
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
    lineTypeOf(line) {
      return String(line?.line_type || line?.type || '')
    },
    desktopSpreadLayout() {
      return !!(
        this.spreadViewportFill
        && typeof window !== 'undefined'
        && window.innerWidth >= this.twoPageMinWidth()
      )
    },
    spreadDesktopLayoutLocked() {
      if (!this.sessionScoped || !this.desktopSpreadLayout()) return false
      const root = this.$el
      if (!(root instanceof HTMLElement)) return false
      const spread = root.closest('.qpc-madani-spread--viewport-fill')
      return spread instanceof HTMLElement
        && spread.hasAttribute('data-desktop-session-spread-lock')
    },
    spreadLayoutLineSlots(sheet) {
      if (!this.spreadViewportFill) return 15
      return Math.max(15, sheet.querySelectorAll('.qpc-madani-line').length)
    },
    isPhoneViewport() {
      if (typeof window === 'undefined') return false
      if (window.innerWidth < 768) return true
      const coarse = window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches
      return !!(coarse && Math.min(window.innerWidth, window.innerHeight) < 520)
    },
    isTabletViewport() {
      if (typeof window === 'undefined') return false
      if (this.isPhoneViewport()) return false
      return window.innerWidth < this.twoPageMinWidth()
    },
    ayahLineOverflows(line, available, wordSize) {
      if (!(line instanceof HTMLElement)) return false
      const phone = this.isPhoneViewport()
      // Phones: lighter slack so readable sizes are not crushed by ink bearing.
      const slack = phone
        ? Math.max(8, Math.round(qcfSideBearingPx(wordSize) * 0.55))
        : qcfSideBearingPx(wordSize)
      const natural = this.lineAdvanceWidth(line)
      const viewW = typeof window !== 'undefined'
        ? mobileViewportInnerWidth(0, 0)
        : 0
      const inset = phone ? MOBILE_MUSHAF_HAIRLINE_PX : 12
      // Always clamp to the real viewport — a content-expanded sheet hides overflow.
      const fitWidth = Math.min(
        Math.max(0, Number(available) || 0),
        viewW > 0 ? Math.max(0, viewW - inset * 2) : Number.POSITIVE_INFINITY,
      )
      if (fitWidth > 0 && natural > Math.max(0, fitWidth - slack) + 1) return true
      if (line.scrollWidth > line.clientWidth + 2) return true
      if (typeof window === 'undefined') return false
      const viewLeft = inset
      const viewRight = (window.visualViewport?.width || window.innerWidth || 0) - inset
      const words = line.querySelectorAll('.qpc-madani-word, .qpc-madani-surah-name, .qpc-madani-basmallah')
      for (const word of words) {
        const box = word.getBoundingClientRect()
        if (box.width < 1) continue
        if (box.right > viewRight + 1.5 || box.left < viewLeft - 1.5) return true
      }
      return false
    },
    applyMobileAyahRowPacking(sheet, available) {
      if (!(sheet instanceof HTMLElement)) return
      const phone = this.isPhoneViewport()
      const sparseRatio = phone ? MOBILE_MUSHAF_SPARSE_RATIO : DESKTOP_MUSHAF_SPARSE_RATIO
      const ayahLines = [...sheet.querySelectorAll('.qpc-madani-line')].filter((line) => {
        return String(line.dataset.lineType || '') === 'ayah'
      })
      for (const line of ayahLines) {
        if (!(line instanceof HTMLElement)) continue
        line.classList.remove('qpc-madani-line--sparse')
        line.style.setProperty('justify-content', 'flex-start', 'important')
        line.style.setProperty('gap', '0', 'important')
        line.style.width = 'max-content'
        line.style.maxWidth = 'none'
        void line.offsetWidth
        const natural = this.lineAdvanceWidth(line)
        const wordCount = line.querySelectorAll('.qpc-madani-word').length
        // Pack against the real painted row width (not a reduced fit inset).
        line.style.width = '100%'
        line.style.maxWidth = '100%'
        void line.offsetWidth
        const rowWidth = Math.max(1, line.clientWidth || Number(available) || 0)
        const sparse = isMobileMushafAyahSparse({
          naturalWidth: natural,
          availableWidth: rowWidth,
          wordCount,
          ratio: sparseRatio,
        })
        line.classList.toggle('qpc-madani-line--sparse', sparse)
        line.style.setProperty('justify-content', mobileMushafAyahJustify(sparse), 'important')
        line.style.setProperty('align-self', 'stretch', 'important')
        line.style.setProperty('margin-inline', '0', 'important')
      }
    },
    shrinkWordSizeToFit(root, sheet, size, lines) {
      if (!(root instanceof HTMLElement) || !(sheet instanceof HTMLElement)) {
        return size
      }
      const ayahLines = (lines || []).filter((line) => String(line.dataset.lineType || '') === 'ayah')
      if (!ayahLines.length) return size
      const available = this.contentWidth(sheet)
      const phone = this.isPhoneViewport()
      const floor = phone ? MOBILE_MUSHAF_WORD_SIZE_FLOOR : 8
      const previous = ayahLines.map((line) => ({
        width: line.style.width,
        maxWidth: line.style.maxWidth,
        justify: line.style.getPropertyValue('justify-content'),
      }))
      // Measure natural ink width — justified 100% rows hide overflow from scrollWidth.
      for (const line of ayahLines) {
        line.style.width = 'max-content'
        line.style.maxWidth = 'none'
        line.style.setProperty('justify-content', 'flex-start', 'important')
      }
      void sheet.offsetWidth
      let lo = floor
      let hi = Math.max(floor, Math.round(size))
      let best = lo
      for (let step = 0; step < 14; step += 1) {
        const mid = Math.round((lo + hi) / 2)
        root.style.setProperty('--qpc-word-size', `${mid}px`)
        void sheet.offsetWidth
        const overflows = ayahLines.some((line) => this.ayahLineOverflows(line, available, mid))
        if (overflows) {
          hi = mid - 1
        } else {
          best = mid
          lo = mid + 1
        }
      }
      root.style.setProperty('--qpc-word-size', `${best}px`)
      void sheet.offsetWidth
      while (best > floor && ayahLines.some((line) => this.ayahLineOverflows(line, available, best))) {
        best -= 1
        root.style.setProperty('--qpc-word-size', `${best}px`)
        void sheet.offsetWidth
      }
      for (const [index, line] of ayahLines.entries()) {
        line.style.width = previous[index].width
        line.style.maxWidth = previous[index].maxWidth
        if (previous[index].justify) {
          line.style.setProperty('justify-content', previous[index].justify, 'important')
        } else {
          line.style.removeProperty('justify-content')
        }
      }
      return phone ? clampMobileMushafWordSize(best) : best
    },
    applySharedWordSize() {
      const root = this.$el
      if (!(root instanceof HTMLElement)) return
      const shared = Number(this.sharedWordSize)
      if (!Number.isFinite(shared) || shared <= 0) return
      const current = Number.parseFloat(root.style.getPropertyValue('--qpc-word-size')) || 0
      let next = Math.round(shared)
      if (this.isPhoneViewport()) next = clampMobileMushafWordSize(next)
      if (current > 0 && next >= current) return
      root.style.setProperty('--qpc-word-size', `${next}px`)
      const sheet = this.$refs.sheet
      if (sheet instanceof HTMLElement) {
        void sheet.offsetWidth
        this.applyMobileAyahRowPacking(sheet, this.contentWidth(sheet))
      }
    },
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
        const trackHeight = (this.sessionViewportFill || this.spreadViewportFill)
          && !this.spreadDesktopLayoutLocked
        const heightChanged = trackHeight
          && height >= 80
          && Math.abs(height - (this.lastFitHeight || 0)) >= 8
        if (!widthChanged && !heightChanged) return
        if (heightChanged) this.lastFitHeight = height
        this.scheduleFit()
      })
      this.resizeObserver.observe(this.$el)
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
        if (this.isIndopakLayout) {
          await ensureIndopakNastaleeqFontForLayout(this.layoutId)
        } else if (this.fontFamily && this.fontUrl) {
          // Warm known path in parallel with the leaf face — does not change fit math.
          await Promise.all([
            warmQpcMadaniPageFont(this.pageNumber).catch(() => null),
            ensureQpcMadaniPageFont(this.pageNumber, this.fontFamily, this.fontUrl),
          ])
        } else if (!this.isIndopakLayout) {
          await warmQpcMadaniPageFont(this.pageNumber).catch(() => null)
        }
      } catch (error) {
        console.warn('[MadaniPage] page font load failed', this.pageNumber, error)
      }
      // Always load the plain page font path; tajweed COLR is an extra face on top.
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
      this.fitted = false
      this.fitLines()
      // Plain ↔ tajweed swaps glyph faces; measure again after paint so both modes
      // get the same viewport-clamped mobile fit.
      window.requestAnimationFrame(() => {
        this.fitted = false
        this.fitLines()
        window.requestAnimationFrame(() => {
          this.fitted = false
          this.fitLines()
        })
      })
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
      const sheetWidth = Math.round(sheet.clientWidth)
      if (this.fitted && Math.abs(sheetWidth - this.lastFitWidth) < 4) return

      const lines = [...sheet.querySelectorAll('.qpc-madani-line')]
      if (!lines.length) {
        this.fitted = true
        return
      }

      const measurable = lines.filter((line) => String(line.dataset.lineType || '') === 'ayah')
      const targets = measurable.length ? measurable : lines.filter((line) => {
        const type = String(line.dataset.lineType || '')
        return type !== 'surah_name' && type !== 'empty'
      })

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

      let measureTargets = targets
      if (this.singleAyahSession) {
        const ayahLines = targets.filter((line) => String(line.dataset.lineType || '') === 'ayah')
        if (ayahLines.length) measureTargets = ayahLines
      }
      const widest = Math.max(1, ...measureTargets.map(line => this.lineAdvanceWidth(line)))
      for (const [index, line] of targets.entries()) {
        line.style.width = previous[index].width
        line.style.maxWidth = ''
        const type = String(line.dataset.lineType || '')
        line.style.justifyContent = type === 'ayah' ? '' : previous[index].justify
        if (type === 'ayah') {
          line.style.setProperty('justify-content', 'space-between', 'important')
          line.style.setProperty('align-self', 'stretch', 'important')
          line.style.setProperty('width', '100%', 'important')
          line.style.setProperty('max-width', '100%', 'important')
          line.style.setProperty('margin-inline', '0', 'important')
        }
      }

      const available = this.contentWidth(sheet)
      this.fitting = false
      if (available <= 0) {
        if (retry < 30) window.requestAnimationFrame(() => this.fitLines(retry + 1))
        else this.fitted = true
        return
      }

      const narrow = available < 440
      const mobile = this.isPhoneViewport()
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
        if (mobile) safety = Math.min(safety, mobileMushafFitSafety({ indopak: true }))
        cap = indopakFitWordSizeCap(fitCtx)
      } else {
        safety = this.embedded || sessionSheet
          ? (narrow ? 0.88 : 0.92)
          : (mobile ? 0.9 : (narrow ? 0.9 : 0.95))
        if (sessionSheet) {
          safety = narrow ? 0.9 : 0.92
        }
        if (this.sessionScoped && !desktopSpread) {
          safety = 0.94
        }
        if (this.spreadViewportFill && !desktopSpread && !mobile) {
          safety = Math.min(safety, narrow ? 0.74 : 0.78)
        } else if (desktopSpread && this.embedded) {
          safety = narrow ? 0.9 : 0.95
        }
        if (mobile) {
          safety = Math.min(safety, mobileMushafFitSafety({ indopak: false }))
        }
        // Phone caps stay modest — high caps + failed width measure = edge overflow.
        cap = this.embedded
          ? (narrow ? 28 : 30)
          : (mobile ? (narrow ? 28 : 30) : (narrow ? 40 : 46))
        if (sessionSheet) {
          cap = narrow ? 28 : 30
        }
        if (desktopSpread && this.embedded) {
          cap = narrow ? 44 : 52
        }
        if (mobile) {
          cap = Math.min(cap, MOBILE_MUSHAF_WORD_SIZE_CAP)
        }
      }
      const requested = Number.isFinite(Number(this.fontScale)) && Number(this.fontScale) > 0
        ? Number(this.fontScale)
        : 1
      // Font-scale must not inflate past the hard cap on phones.
      const scale = mobile ? Math.min(requested, 1.08) : requested
      const widthFit = (available / widest) * measureSize * safety
      // Never let a short surah explode — size as if the row were a full mushaf line.
      const densityCap = Math.max(10, Math.floor(available / (mobile ? 12 : 18)))
      let rawSize
      if (mobile && !desktopSpread) {
        const viewW = window.visualViewport?.width || window.innerWidth || available
        // CRITICAL: start from the readable phone target — do NOT seed from widthFit
        // (that path produced ~14px ink and unreadable pages).
        rawSize = mobileMushafWordSizePx(viewW)
        rawSize = Math.min(rawSize, MOBILE_MUSHAF_WORD_SIZE_CAP, cap * scale, densityCap)
        // Prefer the target when widthFit is pessimistic; shrink-to-fit still gates overflow.
        if (Number.isFinite(widthFit) && widthFit > 0) {
          rawSize = Math.min(rawSize, Math.max(MOBILE_MUSHAF_WORD_SIZE_FLOOR, widthFit * 1.15))
        }
        rawSize = clampMobileMushafWordSize(rawSize)
      } else {
        rawSize = Math.min(cap * scale, widthFit, densityCap)
      }
      if (desktopSpread && this.embedded) {
        const lineSlots = this.sessionScoped
          ? Math.max(1, targets.filter((line) => String(line.dataset.lineType || '') !== 'empty').length)
          : DESKTOP_SPREAD_LINE_SLOTS
        const heightFit = this.sessionScoped
          ? null
          : this.viewportBandHeightFit(root, sheet, lineSlots, measureSize)
        const stable = desktopSpreadStableWordSize({
          measureSize,
          safety,
          cap,
          fontScale: scale,
          heightFit,
        })
        // Fill the leaf edge-to-edge: widthFit drives size; height/stable only cap it.
        rawSize = Math.min(cap * scale, widthFit, densityCap)
        if (Number.isFinite(heightFit) && heightFit > 0) {
          rawSize = Math.min(rawSize, heightFit)
        }
        if (!(rawSize > 0)) rawSize = stable
      } else if (this.sessionViewportFill) {
        const heightFit = this.viewportBandHeightFit(root, sheet, targets.length, measureSize)
        if (Number.isFinite(heightFit) && heightFit > 0) {
          rawSize = Math.min(cap * scale, widthFit, heightFit, densityCap)
        }
      } else if (this.spreadViewportFill) {
        const heightFit = this.viewportBandHeightFit(root, sheet, 15, measureSize)
        if (Number.isFinite(heightFit) && heightFit > 0) {
          rawSize = Math.min(cap * scale, widthFit, heightFit, densityCap)
        }
      }
      const syncedSize = Math.max(8, Math.round(rawSize))
      let probe = syncedSize
      if (
        this.spreadViewportFill
        && Number.isFinite(Number(this.spreadUnifiedWordSize))
        && Number(this.spreadUnifiedWordSize) > 0
      ) {
        probe = Math.min(syncedSize, Math.round(Number(this.spreadUnifiedWordSize)))
      }
      // Whole-pixel sizes avoid COLR / QCF glyph clipping in WebKit.
      let pageNatural = this.shrinkWordSizeToFit(root, sheet, probe, targets)
      if (mobile) pageNatural = clampMobileMushafWordSize(pageNatural)
      root.style.setProperty('--qpc-word-size', `${pageNatural}px`)
      if (mobile) {
        root.style.setProperty('width', '100%', 'important')
        root.style.setProperty('max-width', '100%', 'important')
        root.style.setProperty('margin-inline', '0', 'important')
        sheet.style.setProperty('width', '100%', 'important')
        sheet.style.setProperty('max-width', '100%', 'important')
        sheet.style.setProperty('overflow-x', 'clip', 'important')
      }
      this.applyMobileAyahRowPacking(sheet, this.contentWidth(sheet))
      // One more shrink after packing — phones stay within the readable floor/cap.
      pageNatural = this.shrinkWordSizeToFit(root, sheet, pageNatural, targets)
      if (mobile) pageNatural = clampMobileMushafWordSize(pageNatural)
      let size = pageNatural
      const shared = Number(this.sharedWordSize)
      // Unify every session page (phone included) so adjacent pages match.
      if (Number.isFinite(shared) && shared > 0) {
        size = Math.min(size, Math.round(shared))
      }
      if (mobile) size = clampMobileMushafWordSize(size)
      root.style.setProperty('--qpc-word-size', `${size}px`)
      this.applyMobileAyahRowPacking(sheet, this.contentWidth(sheet))
      this.lastFitWidth = Math.round(sheet.clientWidth)
      this.fitted = true
      if (this.sessionScoped && pageNatural !== this.lastSessionFitWordSize) {
        this.lastSessionFitWordSize = pageNatural
        this.$emit('fit-word-size', pageNatural)
      }
      if (this.spreadViewportFill) {
        if (pageNatural !== this.lastEmittedFitWordSize) {
          this.lastEmittedFitWordSize = pageNatural
          this.$emit('fit-word-size', pageNatural)
        }
        if (!this.spreadDesktopLayoutLocked) {
          this.applySpreadViewportLayout(root, sheet)
          window.requestAnimationFrame(() => {
            this.applySpreadViewportLayout(root, sheet)
            this.applyMobileAyahRowPacking(sheet, this.contentWidth(sheet))
          })
        } else {
          this.applyMobileAyahRowPacking(sheet, this.contentWidth(sheet))
        }
      }
    },
    applySpreadViewportLayout(root, sheet) {
      if (!this.spreadViewportFill) return
      if (!(root instanceof HTMLElement) || !(sheet instanceof HTMLElement)) return
      const desktopSpread = typeof window !== 'undefined' && window.innerWidth >= this.twoPageMinWidth()
      const rowCount = desktopSpread
        ? DESKTOP_SPREAD_LINE_SLOTS
        : this.spreadLayoutLineSlots(sheet)
      const ornament = root.querySelector('.qpc-madani-page__ornament')
      const folio = root.querySelector('.qpc-madani-page__folio')
      if (this.isPhoneViewport()) {
        if (ornament instanceof HTMLElement) {
          ornament.style.minHeight = '0'
          ornament.style.height = 'auto'
          ornament.style.justifyContent = 'flex-start'
        }
        sheet.style.flex = '0 1 auto'
        sheet.style.display = 'flex'
        sheet.style.flexDirection = 'column'
        sheet.style.gridTemplateRows = 'none'
        sheet.style.alignContent = 'start'
        sheet.style.justifyContent = 'stretch'
        sheet.style.minHeight = '0'
        sheet.style.height = 'auto'
        sheet.querySelectorAll('.qpc-madani-line').forEach((line) => {
          if (!(line instanceof HTMLElement)) return
          const empty = String(line.dataset.lineType || '') === 'empty'
          line.style.display = empty ? 'none' : 'flex'
          line.style.flex = '0 0 auto'
          line.style.minHeight = '0'
          line.style.height = 'auto'
          line.style.margin = '0'
        })
        return
      }

      if (this.sessionScoped && desktopSpread) {
        const slot = 'var(--qpc-spread-line-slot, calc(var(--qpc-word-size, 22px) * 2.15))'
        if (ornament instanceof HTMLElement) {
          ornament.style.minHeight = '0'
          ornament.style.height = 'auto'
          ornament.style.display = 'flex'
          ornament.style.flexDirection = 'column'
          ornament.style.justifyContent = 'flex-start'
        }
        sheet.style.flex = '0 1 auto'
        sheet.style.display = 'grid'
        sheet.style.gridTemplateRows = `repeat(${rowCount}, ${slot})`
        sheet.style.alignContent = 'start'
        sheet.style.justifyContent = 'stretch'
        sheet.style.minHeight = '0'
        sheet.style.height = 'auto'
        sheet.querySelectorAll('.qpc-madani-line').forEach((line) => {
          if (!(line instanceof HTMLElement)) return
          line.style.flex = 'unset'
          line.style.margin = '0'
          line.style.padding = '0'
          line.style.minHeight = '0'
          line.style.maxHeight = 'none'
          line.style.height = '100%'
          line.style.overflow = 'hidden'
          line.style.display = ''
        })
        return
      }

      const spread = root.closest('.qpc-madani-spread--viewport-fill')
      let bandPx = this.sessionViewportTargetHeight()
      if (spread instanceof HTMLElement) {
        const fromSpread = Number.parseFloat(spread.style.getPropertyValue('--qpc-spread-band'))
        if (Number.isFinite(fromSpread) && fromSpread > 0) bandPx = fromSpread
      }
      if (ornament instanceof HTMLElement) {
        ornament.style.minHeight = `${bandPx}px`
        ornament.style.display = 'flex'
        ornament.style.flexDirection = 'column'
        ornament.style.justifyContent = 'stretch'
      }
      const folioHeight = desktopSpread
        ? DESKTOP_SPREAD_FOLIO_RESERVE_PX
        : (folio instanceof HTMLElement ? folio.offsetHeight : 0)
      const sheetStyles = getComputedStyle(sheet)
      const sheetPaddingY = Number.parseFloat(sheetStyles.paddingTop) + Number.parseFloat(sheetStyles.paddingBottom)
      sheet.style.flex = '1 1 auto'
      sheet.style.display = 'grid'
      sheet.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`
      sheet.style.alignContent = 'stretch'
      sheet.style.justifyContent = 'stretch'
      sheet.style.minHeight = desktopSpread
        ? `${desktopSpreadSheetHeight({ targetHeight: bandPx, sheetPaddingY })}px`
        : `${Math.max(160, bandPx - folioHeight)}px`
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
      const padLeft = Number.parseFloat(styles.paddingLeft) || 0
      const padRight = Number.parseFloat(styles.paddingRight) || 0
      const painted = Math.round(sheet.getBoundingClientRect?.().width || 0)
      const clientW = Math.max(0, sheet.clientWidth || 0)
      // Prefer the smaller reported width — content-expanded sheets must not win.
      const layoutW = clientW > 0 && painted > 0
        ? Math.min(clientW, painted)
        : Math.max(clientW, painted)
      let inner = Math.max(0, layoutW - padLeft - padRight)
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768
      if (typeof window !== 'undefined') {
        const viewportInner = mobileViewportInnerWidth(padLeft, padRight)
        if (viewportInner > 0) {
          const gutter = mobile ? MOBILE_MUSHAF_HAIRLINE_PX * 2 : 24
          inner = Math.min(inner, Math.max(0, viewportInner - (mobile ? 0 : gutter)))
        }
      }
      if (mobile) {
        const extra = Math.max(0, MOBILE_MUSHAF_HAIRLINE_PX - padLeft)
          + Math.max(0, MOBILE_MUSHAF_HAIRLINE_PX - padRight)
        inner = Math.max(0, inner - extra)
      }
      if ((this.spreadViewportFill || this.embedded) && !mobile) {
        // Keep fit width aligned with the painted row so space-between does not
        // invent large gaps between words.
        const desktopSpread = typeof window !== 'undefined' && window.innerWidth >= this.twoPageMinWidth()
        const spreadInset = desktopSpread && this.sessionDesktopSpreadCompact ? 8 : (desktopSpread ? 12 : 10)
        inner = Math.max(0, inner - spreadInset)
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
      const desktopSpread = typeof window !== 'undefined' && window.innerWidth >= this.twoPageMinWidth()
      const folioHeight = desktopSpread
        ? DESKTOP_SPREAD_FOLIO_RESERVE_PX
        : (folio instanceof HTMLElement ? folio.offsetHeight : 0)
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

/*
 * QCF Presentation Forms look like garbage in fallback Arabic faces.
 * Keep ink invisible until the page woff2 is loaded AND lines are fitted,
 * then fade in — no encoding/wrong-font flash on mobile or desktop.
 */
.qpc-madani-page:not(.is-page-revealed) .qpc-madani-page__sheet {
  visibility: hidden;
  opacity: 0;
}

.qpc-madani-page:not(.is-page-revealed) .qpc-madani-page__folio {
  visibility: hidden;
  opacity: 0;
}

.qpc-madani-page.is-page-revealed .qpc-madani-page__sheet,
.qpc-madani-page.is-page-revealed .qpc-madani-page__folio {
  visibility: visible;
  opacity: 1;
  transition: opacity 180ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .qpc-madani-page.is-page-revealed .qpc-madani-page__sheet,
  .qpc-madani-page.is-page-revealed .qpc-madani-page__folio {
    transition: none;
  }
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
  border: 0;
  border-bottom: 0;
  box-shadow: none;
  color: var(--qpc-rule);
  font-family: "Amiri Quran", "Amiri", serif;
  font-size: 0.98rem;
  line-height: 1;
}

.qpc-madani-page__folio-number {
  display: inline-block;
  line-height: 1;
  border: 0;
  border-bottom: 0;
  box-shadow: none;
}

.qpc-madani-page--borderless.qpc-madani-page--session-scoped .qpc-madani-page__folio {
  min-height: 1.15rem;
  margin: 0.2rem 0 0.28rem;
  padding: 0.28rem 0 0.36rem;
}

.qpc-madani-page--borderless.qpc-madani-page--session-scoped .qpc-madani-page__folio-number {
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.04em;
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

@media (max-width: 1079.98px) {
  .qpc-madani-page--embedded .qpc-madani-page__sheet {
    flex: 1 1 auto;
    padding: 1.45rem 1.5rem 0.55rem;
  }
}

@media (min-width: 1080px) {
  .qpc-madani-page--embedded.qpc-madani-page--spread-viewport-fill {
    flex: 1 1 auto;
    min-height: 100%;
  }

  .qpc-madani-page--spread-viewport-fill .qpc-madani-page__ornament {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .qpc-madani-page--spread-viewport-fill .qpc-madani-page__sheet {
    flex: 1 1 auto;
    min-height: 0;
  }

  .qpc-madani-page--spread-viewport-fill .qpc-madani-page__folio {
    flex: 0 0 auto;
    margin-top: auto;
  }

  .qpc-madani-page--session-compact {
    --qpc-line-min-height: 1.42;
    --qpc-line-height: 1.26;
    --qpc-line-gap: 0;
  }

  .qpc-madani-page--embedded .qpc-madani-page__ornament,
  .qpc-madani-page--borderless .qpc-madani-page__ornament {
    padding: 0;
  }

  .qpc-madani-page--session-scoped.qpc-madani-page--spread-viewport-fill .qpc-madani-page__sheet {
    display: grid;
    grid-template-rows: repeat(15, auto);
    justify-content: stretch;
    height: auto;
    min-height: 0;
    padding: 0 !important;
  }

  .qpc-madani-page--embedded:not(.qpc-madani-page--session-scoped) .qpc-madani-page__sheet,
  .qpc-madani-page--spread-viewport-fill:not(.qpc-madani-page--session-scoped) .qpc-madani-page__sheet,
  .qpc-madani-page--borderless.qpc-madani-page--embedded:not(.qpc-madani-page--session-scoped) .qpc-madani-page__sheet,
  .qpc-madani-page--indopak.qpc-madani-page--embedded:not(.qpc-madani-page--session-scoped) .qpc-madani-page__sheet {
    display: grid;
    grid-template-rows: repeat(15, minmax(0, 1fr));
    justify-content: stretch;
    height: 100%;
    padding: 0 !important;
  }

  .qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet,
  .qpc-madani-page--indopak.qpc-madani-page--single .qpc-madani-page__sheet,
  .qpc-madani-page--indopak.qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet {
    padding: 0 !important;
  }

  .qpc-madani-page--embedded .qpc-madani-page__sheet {
    flex: 1 1 auto;
  }

  .qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet,
  .qpc-madani-page--indopak.qpc-madani-page--single .qpc-madani-page__sheet,
  .qpc-madani-page--indopak.qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet {
    display: flex;
    flex-direction: column;
    grid-template-rows: none;
    height: auto;
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
  min-height: 1.15rem;
  margin: 0.22rem 0 0.3rem;
  padding: 0.3rem 0 0.4rem;
  color: #8a7048;
  font-family: inherit;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
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

.qpc-madani-page--session-scoped,
.qpc-madani-page--borderless.qpc-madani-page--session-scoped {
  width: 100%;
  max-width: 100%;
  margin-inline: 0;
}

.qpc-madani-page--session-scoped .qpc-madani-page__sheet,
.qpc-madani-page--borderless.qpc-madani-page--session-scoped .qpc-madani-page__sheet {
  align-items: stretch;
  width: 100%;
  max-width: 100%;
  padding-inline: 0;
}

@media (max-width: 1079.98px) {
  .qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet {
    padding:
      max(0.35rem, calc(env(safe-area-inset-top, 0px) + 0.2rem))
      max(0.04rem, env(safe-area-inset-right, 0px))
      max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.35rem))
      max(0.04rem, env(safe-area-inset-left, 0px));
  }
}

@media (max-width: 767.98px) {
  .qpc-madani-page--single,
  .qpc-madani-page--borderless.qpc-madani-page--single,
  .qpc-madani-page--session-scoped,
  .qpc-madani-page--opening {
    --qpc-line-min-height: 1.4;
    --qpc-line-height: 1.3;
    --qpc-line-gap: 0.14;
    --qpc-surah-title-scale: 3.5;
    width: 100%;
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  .qpc-madani-page--borderless .qpc-madani-page__sheet,
  .qpc-madani-page--single .qpc-madani-page__sheet,
  .qpc-madani-page--session-scoped .qpc-madani-page__sheet,
  .qpc-madani-page--opening .qpc-madani-page__sheet,
  .qpc-madani-page--borderless.qpc-madani-page--opening .qpc-madani-page__sheet,
  .qpc-madani-page--indopak.qpc-madani-page--borderless.qpc-madani-page--single .qpc-madani-page__sheet {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    min-height: 0;
    height: auto;
    grid-template-rows: none;
    padding-block: 0.08rem 0.12rem;
    padding-inline:
      max(2px, env(safe-area-inset-left, 0px))
      max(2px, env(safe-area-inset-right, 0px));
  }

  .qpc-madani-page__sheet {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    grid-template-rows: none;
    min-height: 0;
    height: auto;
  }

  .qpc-madani-page :deep(.qpc-madani-line--empty) {
    display: none;
    min-height: 0;
    height: 0;
    margin: 0;
    padding: 0;
  }

  .qpc-madani-page__folio,
  .qpc-madani-page--embedded .qpc-madani-page__folio,
  .qpc-madani-page--borderless.qpc-madani-page--session-scoped .qpc-madani-page__folio {
    min-height: 1.15rem;
    margin: 0.22rem 0 0.3rem;
    padding: 0.3rem 0 0.4rem;
    border: 0;
    border-bottom: 0;
    box-shadow: none;
  }

  .qpc-madani-page__folio-number {
    font-size: 0.9rem;
    font-weight: 600;
    border: 0;
    border-bottom: 0;
    box-shadow: none;
  }
}

.qpc-madani-page--session-scoped.qpc-madani-page--borderless .qpc-madani-page__sheet,
.qpc-madani-page--session-scoped.qpc-madani-page--single .qpc-madani-page__sheet {
  padding-inline: 0 !important;
}

@media (max-width: 767.98px) {
  .qpc-madani-page--session-scoped.qpc-madani-page--borderless .qpc-madani-page__sheet,
  .qpc-madani-page--session-scoped.qpc-madani-page--single .qpc-madani-page__sheet,
  .qpc-madani-page--session-scoped .qpc-madani-page__sheet {
    padding-inline:
      max(2px, env(safe-area-inset-left, 0px))
      max(2px, env(safe-area-inset-right, 0px)) !important;
  }
}

.qpc-madani-page--borderless.qpc-madani-page--opening .qpc-madani-page__sheet {
  padding-block: 0.85rem 0.35rem;
}

@media (max-width: 767.98px) {
  .qpc-madani-page--opening .qpc-madani-page__sheet,
  .qpc-madani-page--borderless.qpc-madani-page--opening .qpc-madani-page__sheet {
    padding-block: 0.08rem 0.12rem !important;
  }
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

@media (max-width: 1079.98px) {
  .qpc-madani-page--borderless.qpc-madani-page--embedded .qpc-madani-page__sheet {
    padding:
      max(clamp(0.55rem, 1.4vw, 0.95rem), calc(env(safe-area-inset-top, 0px) + 0.2rem))
      max(clamp(0.45rem, 1.1vw, 0.85rem), env(safe-area-inset-right, 0px))
      max(clamp(0.28rem, 0.8vw, 0.42rem), env(safe-area-inset-bottom, 0px))
      max(clamp(0.45rem, 1.1vw, 0.85rem), env(safe-area-inset-left, 0px));
  }
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
