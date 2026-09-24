<template>
  <section
    class="qpc-madani-shell"
    :class="{ 'qpc-madani-shell--reader': hideDevNav }"
    :data-spread-mode="mode"
    :data-current-page="displayedPageNumber"
    :data-spread-pages="visiblePageNumbers.join(',')"
    :data-active-ayah="activeAyah || null"
    :data-range-start="rangeStartAyah || null"
    :data-range-end="rangeEndAyah || null"
    :data-session-start="sessionStartAyah || null"
    :data-session-end="sessionEndAyah || null"
    :data-last-selected="selectedLocation"
    tabindex="0"
    @keydown="onKeydown"
  >
    <nav
      v-if="!hideDevNav"
      class="qpc-madani-dev-nav"
      data-testid="madani-dev-nav"
      aria-label="Madani page navigation"
    >
      <button
        v-if="previousTarget"
        type="button"
        class="qpc-madani-nav-prev"
        :aria-label="previousLabel"
        @click="navigateClient(previousTarget)"
      ><span class="qpc-madani-nav-chevron" aria-hidden="true">‹</span><span class="qpc-madani-nav-text">← Previous</span></button>
      <span
        v-else
        class="qpc-madani-nav-prev"
        aria-disabled="true"
      ><span class="qpc-madani-nav-chevron" aria-hidden="true">‹</span><span class="qpc-madani-nav-text">← Previous</span></span>
      <strong class="qpc-madani-nav-label">{{ navLabel }}</strong>
      <button
        v-if="nextTarget"
        type="button"
        class="qpc-madani-nav-next"
        :aria-label="nextLabel"
        @click="navigateClient(nextTarget)"
      ><span class="qpc-madani-nav-text">Next →</span><span class="qpc-madani-nav-chevron" aria-hidden="true">›</span></button>
      <span
        v-else
        class="qpc-madani-nav-next"
        aria-disabled="true"
      ><span class="qpc-madani-nav-text">Next →</span><span class="qpc-madani-nav-chevron" aria-hidden="true">›</span></span>
    </nav>

    <div
      class="qpc-madani-spread"
      :class="`qpc-madani-spread--${mode}`"
      dir="rtl"
    >
      <div
        v-for="leaf in visibleLeaves"
        :key="leaf.number"
        class="qpc-madani-spread__leaf"
        :data-spread-leaf="leaf.number"
      >
        <MadaniPage
          v-if="leaf.page"
          :key="`${leaf.number}-${leaf.page?.page_number || 0}`"
          :page="leaf.page"
          :font-family="leaf.fontFamily"
          :font-url="leaf.fontUrl"
          :borderless="hideDevNav || readerMode"
          :embedded="mode === 'spread'"
          :active-ayah="activeAyah"
          :range-start-ayah="rangeStartAyah"
          :range-end-ayah="rangeEndAyah"
          :session-start-ayah="sessionStartAyah"
          :session-end-ayah="sessionEndAyah"
          :technique-snapshot="techniqueSnapshot"
          :progress-snapshot="progressSnapshot"
          :audio-index-map="audioIndexMap"
          :font-scale="fontScale"
          :tajweed-enabled="tajweedEnabled"
          :code-v2-by-location="codeV2ByLocation"
          @select="onWordSelect"
          @ayah-enter="onAyahEnter"
          @ayah-leave="onAyahLeave"
          @peek-enter="onPeekEnter"
          @peek-leave="onPeekLeave"
          @peek-touchstart="onPeekTouchStart"
          @peek-touchend="onPeekTouchEnd"
          @peek-touchcancel="onPeekTouchCancel"
        />
        <div v-else class="qpc-madani-spread__placeholder" aria-busy="true" :aria-label="`Page ${leaf.number}`"></div>
      </div>
    </div>
  </section>
</template>

<script>
import MadaniPage from './MadaniPage.vue'
import {
  clampMadaniPage,
  nextMadaniPage,
  nextMadaniSpread,
  previousMadaniPage,
  previousMadaniSpread,
  resolveMadaniSpread,
  shouldShowTwoMadaniPages,
} from '../../scripts/mushaf/madaniPagePair'
import {
  cacheMadaniPageLeaf,
  getCachedMadaniPageLeaf,
  loadMadaniPageLeaf,
  preloadMadaniNavigationTargets,
} from '../../scripts/mushaf/qpcMadaniPageData'
import { prefetchQpcMadaniPageFonts } from '../../scripts/mushaf/qpcMadaniFontLoader'
import { prefetchQcfPageFonts } from '../../scripts/mushaf/qcfFontLoader'

export default {
  name: 'MadaniSpread',
  components: { MadaniPage },
  emits: ['select', 'ayah-enter', 'ayah-leave', 'peek-enter', 'peek-leave', 'peek-touchstart', 'peek-touchend', 'peek-touchcancel'],
  props: {
    page: { type: Object, default: null },
    fontFamily: { type: String, default: '' },
    fontUrl: { type: String, default: '' },
    controlledPageNumber: { type: Number, default: null },
    hideDevNav: { type: Boolean, default: false },
    readerMode: { type: Boolean, default: false },
    activeAyah: { type: String, default: '' },
    rangeStartAyah: { type: String, default: '' },
    rangeEndAyah: { type: String, default: '' },
    sessionStartAyah: { type: String, default: '' },
    sessionEndAyah: { type: String, default: '' },
    techniqueSnapshot: { type: Object, default: null },
    progressSnapshot: { type: Object, default: null },
    audioIndexMap: { type: Object, default: null },
    fontScale: { type: Number, default: 1 },
    tajweedEnabled: { type: Boolean, default: false },
    codeV2ByLocation: { type: Object, default: null },
  },
  data() {
    return {
      viewportWidth: typeof window === 'undefined' ? 1080 : window.innerWidth,
      sibling: null,
      selectedLocation: '',
      onResize: null,
      onPopState: null,
      activePageNumber: null,
      fetchedLeaf: null,
      fetchToken: 0,
      preloadTimer: null,
    }
  },
  computed: {
    displayedPageNumber() {
      if (this.controlledPageNumber != null) {
        return clampMadaniPage(this.controlledPageNumber)
      }
      const seeded = Number(this.page?.page_number) || 1
      return clampMadaniPage(this.activePageNumber ?? seeded)
    },
    mode() {
      return shouldShowTwoMadaniPages(this.viewportWidth) ? 'spread' : 'single'
    },
    spread() {
      return resolveMadaniSpread(this.displayedPageNumber)
    },
    currentLeaf() {
      if (
        this.fetchedLeaf
        && Number(this.fetchedLeaf.page?.page_number) === this.displayedPageNumber
      ) {
        return this.fetchedLeaf
      }
      const cached = getCachedMadaniPageLeaf(this.displayedPageNumber)
      if (cached) {
        return cached
      }
      if (
        this.page
        && Number(this.page.page_number) === this.displayedPageNumber
        && this.fontFamily
        && this.fontUrl
      ) {
        return {
          page: this.page,
          fontFamily: this.fontFamily,
          fontUrl: this.fontUrl,
        }
      }
      return { page: null, fontFamily: '', fontUrl: '' }
    },
    visibleLeaves() {
      if (this.mode !== 'spread') {
        return [{ number: this.displayedPageNumber, ...this.currentLeaf }]
      }
      return this.spread.pages.map((number) => {
        if (number === this.displayedPageNumber) {
          return { number, ...this.currentLeaf }
        }
        if (this.sibling && Number(this.sibling.page?.page_number) === number) {
          return { number, ...this.sibling }
        }
        return { number, page: null }
      })
    },
    visiblePageNumbers() {
      return this.visibleLeaves.filter(leaf => leaf.page).map(leaf => Number(leaf.number))
    },
    previousTarget() {
      return this.mode === 'spread'
        ? previousMadaniSpread(this.displayedPageNumber)
        : previousMadaniPage(this.displayedPageNumber)
    },
    nextTarget() {
      return this.mode === 'spread'
        ? nextMadaniSpread(this.displayedPageNumber)
        : nextMadaniPage(this.displayedPageNumber)
    },
    navLabel() {
      if (this.mode === 'spread' && this.visiblePageNumbers.length === 2) {
        return `${this.spread.right} – ${this.spread.left}`
      }
      return `Page ${this.displayedPageNumber}`
    },
    previousLabel() {
      return this.mode === 'spread' ? 'Previous spread' : 'Previous page'
    },
    nextLabel() {
      return this.mode === 'spread' ? 'Next spread' : 'Next page'
    },
  },
  watch: {
    mode() {
      this.ensureSibling()
      this.schedulePreload()
    },
    displayedPageNumber() {
      this.ensureCurrentLeaf()
    },
    controlledPageNumber() {
      this.ensureCurrentLeaf()
    },
    tajweedEnabled() {
      this.schedulePreload()
    },
  },
  created() {
    if (
      this.page
      && this.fontFamily
      && this.fontUrl
      && Number(this.page.page_number) > 0
    ) {
      cacheMadaniPageLeaf(Number(this.page.page_number), {
        page: this.page,
        fontFamily: this.fontFamily,
        fontUrl: this.fontUrl,
      })
    }
    this.activePageNumber = this.displayedPageNumber
  },
  mounted() {
    this.viewportWidth = window.innerWidth
    this.onResize = () => {
      this.viewportWidth = window.innerWidth
    }
    window.addEventListener('resize', this.onResize)
    if (this.controlledPageNumber == null && typeof window !== 'undefined') {
      this.onPopState = () => {
        const match = String(window.location.pathname || '').match(/\/madani\/page\/(\d+)/)
        if (!match) return
        this.activePageNumber = clampMadaniPage(Number(match[1]))
      }
      window.addEventListener('popstate', this.onPopState)
    }
    void this.ensureCurrentLeaf()
  },
  beforeUnmount() {
    if (this.onResize) window.removeEventListener('resize', this.onResize)
    if (this.onPopState) window.removeEventListener('popstate', this.onPopState)
    if (this.preloadTimer) window.clearTimeout(this.preloadTimer)
  },
  methods: {
    onWordSelect(location) {
      this.selectedLocation = String(location || '')
      this.$emit('select', location)
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
    onKeydown(event) {
      if (this.readerMode) return
      if (event.target.closest('input, textarea, select, [contenteditable="true"], .qpc-madani-word')) return
      if (event.key === 'ArrowLeft' && this.nextTarget) {
        event.preventDefault()
        this.navigateClient(this.nextTarget)
      }
      if (event.key === 'ArrowRight' && this.previousTarget) {
        event.preventDefault()
        this.navigateClient(this.previousTarget)
      }
    },
    navigateClient(page) {
      if (this.controlledPageNumber != null) return
      const target = clampMadaniPage(page)
      if (target === this.displayedPageNumber) return
      this.activePageNumber = target
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState({ madaniPage: target }, '', `/madani/page/${target}`)
      }
    },
    schedulePreload() {
      if (this.preloadTimer) window.clearTimeout(this.preloadTimer)
      this.preloadTimer = window.setTimeout(() => {
        preloadMadaniNavigationTargets(this.mode, this.displayedPageNumber)
        const pages = this.visibleLeaves.map((leaf) => leaf.number)
        prefetchQpcMadaniPageFonts(pages)
        if (this.tajweedEnabled) {
          prefetchQcfPageFonts(pages, { tajweed: true }).catch(() => {})
        }
      }, 120)
    },
    async ensureCurrentLeaf() {
      const page = this.displayedPageNumber
      const cached = getCachedMadaniPageLeaf(page)
      if (cached?.page) {
        this.fetchedLeaf = cached
        await this.ensureSibling()
        this.schedulePreload()
        return
      }

      if (Number(this.fetchedLeaf?.page?.page_number) !== page) {
        this.fetchedLeaf = null
      }

      if (
        this.page
        && Number(this.page.page_number) === page
        && this.fontFamily
        && this.fontUrl
      ) {
        const leaf = {
          page: this.page,
          fontFamily: this.fontFamily,
          fontUrl: this.fontUrl,
        }
        cacheMadaniPageLeaf(page, leaf)
        this.fetchedLeaf = leaf
        await this.ensureSibling()
        this.schedulePreload()
        return
      }

      const token = ++this.fetchToken
      try {
        const leaf = await loadMadaniPageLeaf(page)
        if (token !== this.fetchToken) return
        this.fetchedLeaf = leaf
      } catch {
        if (token === this.fetchToken) this.fetchedLeaf = null
      }
      await this.ensureSibling()
      this.schedulePreload()
    },
    async ensureSibling() {
      if (this.mode !== 'spread') {
        this.sibling = null
        return
      }
      const other = this.spread.pages.find(number => number !== this.displayedPageNumber)
      if (!other) {
        this.sibling = null
        return
      }
      const cached = getCachedMadaniPageLeaf(other)
      if (cached) {
        this.sibling = cached
        return
      }
      try {
        this.sibling = await loadMadaniPageLeaf(other)
      } catch {
        this.sibling = null
      }
    },
  },
}
</script>

<style scoped>
.qpc-madani-shell {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  padding-inline: 0;
  overflow: visible;
  outline: none;
}

.qpc-madani-dev-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 1.1rem auto 0;
  padding: 0.35rem 0.7rem;
  font-size: 0.92rem;
}

.qpc-madani-dev-nav button,
.qpc-madani-dev-nav span,
.qpc-madani-dev-nav strong {
  color: #5a3e20;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.qpc-madani-dev-nav button:hover {
  background: rgba(141, 106, 53, 0.12);
}

.qpc-madani-dev-nav [aria-disabled="true"] {
  opacity: 0.4;
  pointer-events: none;
}

.qpc-madani-spread--single {
  display: block;
}

.qpc-madani-nav-chevron {
  display: none;
}

.qpc-madani-spread--spread {
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
  width: 100%;
  max-width: 70rem;
  margin: 1rem auto 2.4rem;
  overflow: visible;
  background: #f7f1e4;
  border: 1px solid rgba(132, 104, 64, 0.16);
  box-shadow: 0 10px 28px rgba(70, 48, 22, 0.06);
}

.qpc-madani-spread--spread .qpc-madani-spread__leaf {
  display: flex;
  flex: 1 1 50%;
  min-width: 0;
  box-sizing: border-box;
  overflow: visible;
  background: #fbf6eb;
}

.qpc-madani-spread--spread .qpc-madani-spread__leaf:first-child {
  box-shadow: inset -12px 0 16px -14px rgba(78, 54, 24, 0.14);
}

.qpc-madani-spread--spread .qpc-madani-spread__leaf + .qpc-madani-spread__leaf {
  border-inline-start: 1px solid rgba(132, 104, 64, 0.12);
  box-shadow: inset 12px 0 16px -14px rgba(78, 54, 24, 0.14);
}

.qpc-madani-spread--spread .qpc-madani-spread__leaf:first-child :deep(.qpc-madani-page__sheet) {
  padding-inline: 1.65rem 1.15rem;
}

.qpc-madani-spread--spread .qpc-madani-spread__leaf:last-child :deep(.qpc-madani-page__sheet) {
  padding-inline: 1.15rem 1.65rem;
}

.qpc-madani-shell[data-spread-mode="spread"] {
  display: grid;
  grid-template-columns: 2.6rem minmax(0, 70rem) 2.6rem;
  grid-template-rows: auto auto;
  justify-content: center;
  align-items: center;
  column-gap: 0.55rem;
  row-gap: 0.7rem;
  box-sizing: border-box;
  width: 100%;
  max-width: 86rem;
  margin: 0 auto;
  padding: 1.55rem 1.4rem 2.4rem;
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-dev-nav {
  display: contents;
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-nav-label {
  grid-column: 2;
  grid-row: 1;
  justify-self: center;
  padding: 0;
  color: #7a6240;
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-nav-prev,
.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-nav-next {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  padding: 0;
  color: #8a7048;
  border-radius: 999px;
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-nav-prev {
  grid-column: 1;
  grid-row: 2;
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-nav-next {
  grid-column: 3;
  grid-row: 2;
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-nav-text {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-nav-chevron {
  display: block;
  font-size: 1.7rem;
  line-height: 1;
}

.qpc-madani-shell[data-spread-mode="spread"] .qpc-madani-spread {
  grid-column: 2;
  grid-row: 2;
  margin: 0;
}

.qpc-madani-shell[data-spread-mode="single"] {
  padding-inline: 0.35rem;
}

.qpc-madani-shell[data-spread-mode="single"] .qpc-madani-dev-nav {
  gap: 0.4rem;
  margin: 0.35rem auto 0.15rem;
  padding: 0.08rem 0.15rem;
  font-size: 0.78rem;
}

.qpc-madani-shell[data-spread-mode="single"] .qpc-madani-dev-nav button,
.qpc-madani-shell[data-spread-mode="single"] .qpc-madani-dev-nav span,
.qpc-madani-shell[data-spread-mode="single"] .qpc-madani-dev-nav strong {
  padding: 0.16rem 0.4rem;
}

.qpc-madani-spread--single {
  width: 100%;
  max-width: none;
  margin: 0;
  height: auto;
}

.qpc-madani-shell--reader[data-spread-mode="single"] {
  padding-inline: 0;
}

.qpc-madani-shell--reader[data-spread-mode="spread"] {
  display: block;
  max-width: 100%;
  margin: 0 auto;
  padding: 0 0 0.2rem;
}

.qpc-madani-shell--reader[data-spread-mode="spread"] .qpc-madani-spread--spread {
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.qpc-madani-shell--reader[data-spread-mode="spread"] .qpc-madani-spread__leaf {
  background: transparent;
  box-shadow: none !important;
}

.qpc-madani-shell--reader[data-spread-mode="spread"] .qpc-madani-spread__leaf + .qpc-madani-spread__leaf {
  border-inline-start: 1px solid color-mix(in srgb, var(--zone-divider, rgba(132, 104, 64, 0.12)) 100%, transparent);
  box-shadow: none;
}

.qpc-madani-shell--reader[data-spread-mode="spread"] .qpc-madani-spread__leaf:first-child :deep(.qpc-madani-page__sheet) {
  padding-inline: clamp(0.38rem, 0.9vw, 0.72rem) clamp(0.22rem, 0.55vw, 0.42rem);
}

.qpc-madani-shell--reader[data-spread-mode="spread"] .qpc-madani-spread__leaf:last-child :deep(.qpc-madani-page__sheet) {
  padding-inline: clamp(0.22rem, 0.55vw, 0.42rem) clamp(0.38rem, 0.9vw, 0.72rem);
}

.qpc-madani-spread__placeholder {
  flex: 1 1 auto;
  min-height: 12rem;
  width: 100%;
}

.qpc-madani-shell--reader .qpc-madani-spread__placeholder {
  min-height: 55dvh;
}
</style>
