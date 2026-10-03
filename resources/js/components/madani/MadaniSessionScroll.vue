<template>
  <section
    class="qpc-madani-session-scroll"
    :data-pages="resolvedPageNumbers.join(',')"
    :data-focus-page="focusPageNumber || null"
    :data-desktop-short-surah="desktopShortSurahLayout ? 'true' : null"
    :data-layout="layoutId"
  >
    <div
      v-for="pageNumber in resolvedPageNumbers"
      :key="pageNumber"
      :ref="(el) => setPageAnchor(pageNumber, el)"
      class="qpc-madani-session-scroll__page"
      :data-madani-page="pageNumber"
    >
      <MadaniPage
        v-if="shouldPaintPage(pageNumber) && leafByPage[pageNumber]?.page"
        :page="leafByPage[pageNumber].page"
        :font-family="leafByPage[pageNumber].fontFamily"
        :font-url="leafByPage[pageNumber].fontUrl"
        :layout-id="layoutId"
        :borderless="true"
        :active-ayah="activeAyah"
        :range-start-ayah="rangeStartAyah"
        :range-end-ayah="rangeEndAyah"
        :session-start-ayah="sessionStartAyah"
        :session-end-ayah="sessionEndAyah"
        :show-session-surah-header="sessionHeaderPageNumber != null && pageNumber === sessionHeaderPageNumber"
        :technique-snapshot="techniqueSnapshot"
        :progress-snapshot="progressSnapshot"
        :audio-index-map="audioIndexMap"
        :font-scale="fontScale"
        :tajweed-enabled="tajweedEnabled"
        :code-v2-by-location="codeV2ByLocation"
        :tajweed-html-by-location="tajweedHtmlByLocation"
        @select="$emit('select', $event)"
        @ayah-enter="$emit('ayah-enter', $event)"
        @ayah-leave="$emit('ayah-leave', $event)"
        @peek-enter="$emit('peek-enter', $event)"
        @peek-leave="$emit('peek-leave', $event)"
        @peek-touchstart="$emit('peek-touchstart', $event)"
        @peek-touchend="$emit('peek-touchend', $event)"
        @peek-touchcancel="$emit('peek-touchcancel')"
      />
      <div
        v-else
        class="qpc-madani-session-scroll__placeholder"
        :style="placeholderStyle(pageNumber)"
        aria-busy="true"
        :aria-label="`Page ${pageNumber}`"
      />
    </div>
  </section>
</template>

<script>
import MadaniPage from './MadaniPage.vue'
import {
  getCachedMadaniPageLeaf,
  loadMadaniPageLeaf,
} from '../../scripts/mushaf/qpcMadaniPageData'
import {
  getCachedMushafPageLeaf,
  loadMushafPageLeaf,
} from '../../scripts/mushaf/mushafPageData'
import { prefetchQpcMadaniPageFonts } from '../../scripts/mushaf/qpcMadaniFontLoader'
import { prefetchQcfPageFonts } from '../../scripts/mushaf/qcfFontLoader'
import { ensureIndopakNastaleeqFontForLayout } from '../../scripts/mushaf/indopakNastaleeqFont'
import { isIndopakMushafLayout } from '../../scripts/mushaf/indopakPageAdapter'
import { MUSHAF_LAYOUT_MADANI_V2 } from '../../scripts/mushaf/mushafLayouts'
import {
  mapWithConcurrency,
  orderPagesAroundFocus,
  selectPriorityPages,
} from '../../scripts/mushaf/sessionPageLoad'

/** Paint every page when the session is this short; window the rest. */
const FULL_PAINT_PAGE_LIMIT = 4
const FOCUS_RADIUS = 1

export default {
  name: 'MadaniSessionScroll',
  components: { MadaniPage },
  emits: [
    'select',
    'ayah-enter',
    'ayah-leave',
    'peek-enter',
    'peek-leave',
    'peek-touchstart',
    'peek-touchend',
    'peek-touchcancel',
  ],
  props: {
    pageNumbers: { type: Array, default: () => [] },
    layoutId: { type: String, default: MUSHAF_LAYOUT_MADANI_V2 },
    desktopShortSurahLayout: { type: Boolean, default: false },
    focusPageNumber: { type: Number, default: null },
    activeAyah: { type: String, default: '' },
    rangeStartAyah: { type: String, default: '' },
    rangeEndAyah: { type: String, default: '' },
    sessionStartAyah: { type: String, default: '' },
    sessionEndAyah: { type: String, default: '' },
    sessionHeaderPageNumber: { type: Number, default: null },
    techniqueSnapshot: { type: Object, default: null },
    progressSnapshot: { type: Object, default: null },
    audioIndexMap: { type: Object, default: null },
    fontScale: { type: Number, default: 1 },
    tajweedEnabled: { type: Boolean, default: false },
    codeV2ByLocation: { type: Object, default: null },
    tajweedHtmlByLocation: { type: Object, default: null },
  },
  data() {
    return {
      leafByPage: {},
      pageAnchors: Object.create(null),
      visiblePages: {},
      pageHeights: {},
      reservedPageHeight: 0,
      loadToken: 0,
      pageObserver: null,
      heightObserver: null,
    }
  },
  computed: {
    isIndopakLayout() {
      return isIndopakMushafLayout(this.layoutId)
    },
    resolvedPageNumbers() {
      const pages = (this.pageNumbers || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
      if (pages.length) return [...new Set(pages)].sort((left, right) => left - right)
      const focus = Number(this.focusPageNumber)
      return Number.isFinite(focus) && focus > 0 ? [focus] : []
    },
    windowedSession() {
      return this.resolvedPageNumbers.length > FULL_PAINT_PAGE_LIMIT
        && typeof IntersectionObserver === 'function'
    },
    mountAllow() {
      const pages = this.resolvedPageNumbers
      if (!this.windowedSession) {
        return Object.fromEntries(pages.map((page) => [page, true]))
      }
      const allow = { ...this.visiblePages }
      const focus = Number(this.focusPageNumber) || pages[0]
      const center = Math.max(0, pages.indexOf(focus))
      const start = Math.max(0, center - FOCUS_RADIUS)
      const end = Math.min(pages.length - 1, center + FOCUS_RADIUS)
      for (let index = start; index <= end; index += 1) {
        allow[pages[index]] = true
      }
      return allow
    },
  },
  watch: {
    resolvedPageNumbers: {
      immediate: true,
      handler() {
        void this.ensurePagesLoaded()
      },
    },
    layoutId() {
      this.leafByPage = {}
      this.pageHeights = {}
      this.reservedPageHeight = 0
      void this.ensurePagesLoaded()
    },
    focusPageNumber() {
      this.hydrateMountedLeaves()
      this.$nextTick(() => this.scrollToFocusPage({ smooth: true }))
    },
    mountAllow() {
      this.hydrateMountedLeaves()
    },
    tajweedEnabled() {
      const painted = this.resolvedPageNumbers.filter((page) => this.shouldPaintPage(page))
      this.prefetchFonts(painted)
    },
  },
  mounted() {
    this.pageObserver = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => this.onPageIntersect(entries), {
        root: null,
        rootMargin: '45% 0px 80% 0px',
        threshold: 0,
      })
      : null
    this.heightObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this.rememberMountedPageHeights())
      : null
    for (const el of Object.values(this.pageAnchors)) {
      if (!(el instanceof HTMLElement)) continue
      this.pageObserver?.observe(el)
      this.heightObserver?.observe(el)
    }
    this.$nextTick(() => this.scrollToFocusPage({ smooth: false }))
  },
  beforeUnmount() {
    this.loadToken += 1
    if (this._restLoadTimer) clearTimeout(this._restLoadTimer)
    this.pageObserver?.disconnect()
    this.pageObserver = null
    this.heightObserver?.disconnect()
    this.heightObserver = null
  },
  methods: {
    setPageAnchor(pageNumber, el) {
      const key = Number(pageNumber)
      if (!Number.isFinite(key)) return
      const previous = this.pageAnchors[key]
      if (previous && previous !== el) {
        this.pageObserver?.unobserve(previous)
        this.heightObserver?.unobserve(previous)
      }
      if (el instanceof HTMLElement) {
        this.pageAnchors[key] = el
        this.pageObserver?.observe(el)
        this.heightObserver?.observe(el)
      } else {
        delete this.pageAnchors[key]
      }
    },
    shouldPaintPage(pageNumber) {
      return !!this.mountAllow[Number(pageNumber)]
    },
    placeholderStyle(pageNumber) {
      const height = Number(this.pageHeights[pageNumber] || this.reservedPageHeight || 0)
      return height > 80 ? { minHeight: `${height}px` } : null
    },
    onPageIntersect(entries) {
      if (!this.windowedSession) return
      const next = { ...this.visiblePages }
      let changed = false
      for (const entry of entries) {
        const page = Number(entry.target?.getAttribute?.('data-madani-page'))
        if (!Number.isFinite(page) || page < 1) continue
        if (entry.isIntersecting) {
          if (!next[page]) {
            next[page] = true
            changed = true
          }
        } else if (next[page]) {
          delete next[page]
          changed = true
        }
      }
      if (changed) this.visiblePages = next
    },
    cachedLeaf(pageNumber) {
      return this.isIndopakLayout
        ? getCachedMushafPageLeaf(pageNumber, this.layoutId)
        : getCachedMadaniPageLeaf(pageNumber)
    },
    noteLeaf(pageNumber, leaf) {
      if (!leaf?.page || !this.shouldPaintPage(pageNumber)) return
      if (this.leafByPage[pageNumber] === leaf) return
      this.leafByPage = {
        ...this.leafByPage,
        [pageNumber]: leaf,
      }
    },
    hydrateMountedLeaves() {
      const next = { ...this.leafByPage }
      let changed = false
      for (const pageNumber of this.resolvedPageNumbers) {
        if (!this.shouldPaintPage(pageNumber) || next[pageNumber]?.page) continue
        const cached = this.cachedLeaf(pageNumber)
        if (!cached?.page) continue
        next[pageNumber] = cached
        changed = true
      }
      if (changed) this.leafByPage = next
      this.$nextTick(() => this.rememberMountedPageHeights())
    },
    rememberMountedPageHeights() {
      const next = { ...this.pageHeights }
      let reserved = this.reservedPageHeight
      let changed = false
      for (const pageNumber of this.resolvedPageNumbers) {
        const anchor = this.pageAnchors[pageNumber]
        const pageEl = anchor?.querySelector?.('.qpc-madani-page')
        const height = Math.round(pageEl?.getBoundingClientRect?.().height || 0)
        if (height < 80) continue
        if (Math.abs((next[pageNumber] || 0) - height) > 2) {
          next[pageNumber] = height
          changed = true
        }
        if (height > reserved) reserved = height
      }
      if (changed) this.pageHeights = next
      if (reserved !== this.reservedPageHeight) this.reservedPageHeight = reserved
    },
    async ensurePagesLoaded() {
      const token = ++this.loadToken
      const pages = this.resolvedPageNumbers
      if (!pages.length) {
        this.leafByPage = {}
        return
      }

      const focus = Number(this.focusPageNumber) || pages[0]
      const immediate = this.windowedSession
        ? selectPriorityPages(pages, focus, FOCUS_RADIUS)
        : pages
      await this.loadPageBatch(immediate, token, 3)
      if (token !== this.loadToken) return
      this.hydrateMountedLeaves()
      this.prefetchFonts(immediate)
      this.$nextTick(() => {
        this.scrollToFocusPage({ smooth: false })
        this.rememberMountedPageHeights()
      })
      if (!this.windowedSession) return

      const immediateSet = new Set(immediate)
      const rest = orderPagesAroundFocus(pages, focus).filter((page) => !immediateSet.has(page))
      if (this._restLoadTimer) clearTimeout(this._restLoadTimer)
      this._restLoadTimer = setTimeout(() => {
        this._restLoadTimer = null
        if (token !== this.loadToken) return
        void this.loadPageBatch(rest, token, 2)
      }, 200)
    },
    async loadPageBatch(pages, token, concurrency) {
      await mapWithConcurrency(pages, concurrency, async (pageNumber) => {
        if (token !== this.loadToken) return null
        const cached = this.cachedLeaf(pageNumber)
        if (cached?.page) {
          this.noteLeaf(pageNumber, cached)
          return cached
        }
        try {
          const leaf = this.isIndopakLayout
            ? await loadMushafPageLeaf(pageNumber, this.layoutId)
            : await loadMadaniPageLeaf(pageNumber)
          if (token !== this.loadToken) return null
          if (leaf?.page) this.noteLeaf(pageNumber, leaf)
          return leaf
        } catch {
          return null
        }
      }, () => token === this.loadToken)
    },
    prefetchFonts(pageNumbers = []) {
      const pages = (Array.isArray(pageNumbers) ? pageNumbers : []).filter((page) => page > 0)
      if (!pages.length) return
      if (this.isIndopakLayout) {
        void ensureIndopakNastaleeqFontForLayout(this.layoutId)
        return
      }
      prefetchQpcMadaniPageFonts(pages)
      if (this.tajweedEnabled) {
        prefetchQcfPageFonts(pages, { tajweed: true }).catch(() => {})
      }
    },
    scrollToFocusPage({ smooth = true } = {}) {
      const page = Number(this.focusPageNumber)
      if (!Number.isFinite(page) || page < 1) return
      const anchor = this.pageAnchors[page]
      if (!(anchor instanceof HTMLElement)) return
      anchor.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'start',
      })
    },
  },
}
</script>

<style scoped>
.qpc-madani-session-scroll {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
  overflow-y: visible;
  padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
  scroll-padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
}

.qpc-madani-session-scroll[data-layout='indopak-15-qudratullah'] {
  /* Mobile/tablet single-page: fit viewport width; vertical scroll only. */
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
  overflow-y: visible;
}

.qpc-madani-session-scroll__page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
  overflow-y: visible;
}

.qpc-madani-session-scroll[data-layout='indopak-15-qudratullah'] .qpc-madani-session-scroll__page + .qpc-madani-session-scroll__page {
  margin-top: 0.55rem;
}

.qpc-madani-session-scroll__page + .qpc-madani-session-scroll__page {
  margin-top: 0.35rem;
}

.qpc-madani-session-scroll__placeholder {
  min-height: 85dvh;
  width: 100%;
}
</style>
