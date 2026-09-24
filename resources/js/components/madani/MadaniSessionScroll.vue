<template>
  <section
    class="qpc-madani-session-scroll"
    :data-pages="resolvedPageNumbers.join(',')"
    :data-focus-page="focusPageNumber || null"
  >
    <div
      v-for="pageNumber in resolvedPageNumbers"
      :key="pageNumber"
      :ref="(el) => setPageAnchor(pageNumber, el)"
      class="qpc-madani-session-scroll__page"
      :data-madani-page="pageNumber"
    >
      <MadaniPage
        v-if="leafByPage[pageNumber]?.page"
        :page="leafByPage[pageNumber].page"
        :font-family="leafByPage[pageNumber].fontFamily"
        :font-url="leafByPage[pageNumber].fontUrl"
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
import { prefetchQpcMadaniPageFonts } from '../../scripts/mushaf/qpcMadaniFontLoader'
import { prefetchQcfPageFonts } from '../../scripts/mushaf/qcfFontLoader'

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
  },
  data() {
    return {
      leafByPage: {},
      pageAnchors: Object.create(null),
      loadToken: 0,
    }
  },
  computed: {
    resolvedPageNumbers() {
      const pages = (this.pageNumbers || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
      if (pages.length) return [...new Set(pages)].sort((left, right) => left - right)
      const focus = Number(this.focusPageNumber)
      return Number.isFinite(focus) && focus > 0 ? [focus] : []
    },
  },
  watch: {
    resolvedPageNumbers: {
      immediate: true,
      handler() {
        void this.ensurePagesLoaded()
      },
    },
    focusPageNumber() {
      this.$nextTick(() => this.scrollToFocusPage({ smooth: true }))
    },
    tajweedEnabled() {
      void this.prefetchFonts()
    },
  },
  mounted() {
    this.$nextTick(() => this.scrollToFocusPage({ smooth: false }))
  },
  methods: {
    setPageAnchor(pageNumber, el) {
      const key = Number(pageNumber)
      if (!Number.isFinite(key)) return
      if (el instanceof HTMLElement) {
        this.pageAnchors[key] = el
      } else {
        delete this.pageAnchors[key]
      }
    },
    async ensurePagesLoaded() {
      const token = ++this.loadToken
      const pages = this.resolvedPageNumbers
      if (!pages.length) return

      const next = { ...this.leafByPage }
      for (const pageNumber of pages) {
        const cached = getCachedMadaniPageLeaf(pageNumber)
        if (cached?.page) {
          next[pageNumber] = cached
          continue
        }
        try {
          const leaf = await loadMadaniPageLeaf(pageNumber)
          if (token !== this.loadToken) return
          if (leaf?.page) next[pageNumber] = leaf
        } catch {
          // keep placeholder until retry
        }
      }
      if (token !== this.loadToken) return
      this.leafByPage = next
      void this.prefetchFonts()
      this.$nextTick(() => this.scrollToFocusPage({ smooth: false }))
    },
    prefetchFonts() {
      const pages = this.resolvedPageNumbers
      if (!pages.length) return
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
  padding-bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px));
  scroll-padding-bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px));
}

.qpc-madani-session-scroll__page {
  width: 100%;
  max-width: 100%;
}

.qpc-madani-session-scroll__page + .qpc-madani-session-scroll__page {
  margin-top: 0.08rem;
}

.qpc-madani-session-scroll__placeholder {
  min-height: 8rem;
  width: 100%;
}
</style>
