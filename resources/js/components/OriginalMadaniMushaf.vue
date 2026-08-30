<template>
  <div
    class="original-madani-workspace"
    :class="{
      'original-madani-workspace--tajweed': tajweedEnabled,
      'original-madani-workspace--blur': blurEnabled,
      'original-madani-workspace--focus': focusEnabled,
      'original-madani-workspace--fullscreen': fullscreenActive,
      'original-madani-workspace--spread': showPair,
    }"
    :style="workspaceStyle"
  >
    <div class="container-fluid original-madani-workspace__fluid px-0">
      <section class="mushaf-shell original-madani-shell" :aria-label="t('memorisation.view.original')">
        <header class="mushaf-shell__bar navbar navbar-expand original-madani-shell__navbar" :aria-label="t('memorisation.a11y.originalMadaniTools')">
          <div class="mushaf-shell__bar-group d-flex align-items-center gap-2 flex-wrap">
            <span class="original-madani-shell__title navbar-brand mb-0 py-0">{{ t('memorisation.view.original') }}</span>
            <span v-if="sessionLabel" class="original-madani-shell__session">{{ sessionLabel }}</span>
            <div class="btn-group btn-group-sm" role="group" :aria-label="t('common.fontSize')">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="Number(fontSize || 150) <= minFontSize"
                @click.stop.prevent="$emit('decrease-font')"
                :title="t('memorisation.a11y.decreaseFontSize')"
                :aria-label="t('memorisation.a11y.decreaseFontSize')"
              >
                <i class="bi bi-dash-lg" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="Number(fontSize || 150) >= maxFontSize"
                @click.stop.prevent="$emit('increase-font')"
                :title="t('memorisation.a11y.increaseFontSize')"
                :aria-label="t('memorisation.a11y.increaseFontSize')"
              >
                <i class="bi bi-plus-lg" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="mushaf-shell__bar-group mushaf-shell__bar-group--end d-flex align-items-center gap-2 ms-auto">
            <div class="btn-group btn-group-sm" role="group" :aria-label="t('memorisation.open_controls')">
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click.stop="$emit('open-controls')"
                :title="t('memorisation.open_controls')"
                :aria-label="t('memorisation.open_controls')"
              >
                <i class="bi bi-sliders" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click.stop="$emit('toggle-fullscreen')"
                :title="fullscreenActive ? t('memorisation.a11y.exitOriginalFullScreen') : t('memorisation.a11y.enterOriginalFullScreen')"
                :aria-label="fullscreenActive ? t('memorisation.a11y.exitOriginalFullScreen') : t('memorisation.a11y.enterOriginalFullScreen')"
                :aria-pressed="fullscreenActive ? 'true' : 'false'"
              >
                <i class="bi" :class="fullscreenActive ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'" aria-hidden="true"></i>
              </button>
            </div>
            <div class="btn-group btn-group-sm" role="group" :aria-label="t('memorisation.a11y.originalMadaniTools')">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="!canPrevious"
                @click="$emit('previous-page')"
                :aria-label="t('memorisation.a11y.previousOriginalPage')"
              >
                <i class="bi" :class="isRtl ? 'bi-chevron-right' : 'bi-chevron-left'" aria-hidden="true"></i>
              </button>
              <span class="btn btn-outline-secondary disabled original-madani-shell__page-label" aria-current="page">
                {{ paginationLabel }}
              </span>
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="!canNext"
                @click="$emit('next-page')"
                :aria-label="t('memorisation.a11y.nextOriginalPage')"
              >
                <i class="bi" :class="isRtl ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </header>

        <div
          class="original-madani-viewport"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <div v-if="error" class="mushaf-empty-page mushaf-empty-page--error">
            <AppStatus
              :variant="offline ? 'offline' : 'error'"
              fill
              compact
              :title="offline ? t('common.status.offlineTitle') : t('memorisation.originalMadani.errorTitle')"
              :description="offline ? t('common.status.offlineDesc') : t('memorisation.originalMadani.errorDesc')"
              :action-label="t('memorisation.originalMadani.retry')"
              :secondary-action-label="t('memorisation.originalMadani.switchMushaf')"
              @action="$emit('retry')"
              @secondary-action="$emit('switch-mushaf')"
            />
          </div>

          <template v-else>
            <button
              type="button"
              class="btn btn-light original-madani-nav original-madani-nav--prev rounded-circle shadow-sm"
              :disabled="!canPrevious"
              :aria-label="t('memorisation.a11y.previousOriginalPage')"
              @click="$emit('previous-page')"
            >
              <i class="bi" :class="isRtl ? 'bi-chevron-right' : 'bi-chevron-left'" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="btn btn-light original-madani-nav original-madani-nav--next rounded-circle shadow-sm"
              :disabled="!canNext"
              :aria-label="t('memorisation.a11y.nextOriginalPage')"
              @click="$emit('next-page')"
            >
              <i class="bi" :class="isRtl ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true"></i>
            </button>

            <Transition :name="pageTransitionName" mode="out-in">
              <div
                :key="spreadKey"
                class="original-madani-spread"
                :class="{
                  'original-madani-spread--pair': showPair,
                  'original-madani-spread--single': !showPair
                }"
              >
                <article
                  v-if="showPair && leftPage"
                  class="original-madani-leaf original-madani-leaf--left"
                  :class="{ 'is-current': leftPage === pageNumber }"
                  :data-madani-page="leftPage"
                  @click="$emit('select-page', leftPage)"
                >
                  <OriginalMadaniPageFrame
                    :page-number="leftPage"
                    side="left"
                    :juz-label="leftJuzLabel"
                    :surah-label="leftSurahLabel"
                    :active="leftPage === pageNumber"
                    :alt="pageAlt(leftPage)"
                    :lines="(leftPageData && leftPageData.lines) || []"
                    :glyphs-ready="!!(leftPageData && leftPageData.glyphsReady)"
                    :font-family="(leftPageData && leftPageData.fontFamily) || ''"
                    :tajweed-enabled="tajweedEnabled"
                    :font-size="fontSize"
                    :surah-names-font-family="surahNamesFontFamily"
                    @select-ayah="$emit('select-ayah', $event)"
                    @select-word="$emit('select-word', $event)"
                    @peek-enter="$emit('peek-enter', $event)"
                    @peek-leave="$emit('peek-leave')"
                  />
                </article>

                <div
                  v-if="showPair && leftPage && rightPage"
                  class="original-madani-spine"
                  aria-hidden="true"
                ></div>

                <article
                  v-if="showPair && rightPage"
                  class="original-madani-leaf original-madani-leaf--right"
                  :class="{ 'is-current': rightPage === pageNumber }"
                  :data-madani-page="rightPage"
                  @click="$emit('select-page', rightPage)"
                >
                  <OriginalMadaniPageFrame
                    :page-number="rightPage"
                    side="right"
                    :juz-label="rightJuzLabel"
                    :surah-label="rightSurahLabel"
                    :active="rightPage === pageNumber"
                    :alt="pageAlt(rightPage)"
                    :lines="(rightPageData && rightPageData.lines) || []"
                    :glyphs-ready="!!(rightPageData && rightPageData.glyphsReady)"
                    :font-family="(rightPageData && rightPageData.fontFamily) || ''"
                    :tajweed-enabled="tajweedEnabled"
                    :font-size="fontSize"
                    :surah-names-font-family="surahNamesFontFamily"
                    @select-ayah="$emit('select-ayah', $event)"
                    @select-word="$emit('select-word', $event)"
                    @peek-enter="$emit('peek-enter', $event)"
                    @peek-leave="$emit('peek-leave')"
                  />
                </article>

                <article
                  v-if="!showPair && pageNumber"
                  class="original-madani-leaf original-madani-leaf--single is-current"
                  :data-madani-page="pageNumber"
                  @click="$emit('select-page', pageNumber)"
                >
                  <OriginalMadaniPageFrame
                    :page-number="pageNumber"
                    :side="pageNumber % 2 === 1 ? 'right' : 'left'"
                    :juz-label="currentJuzLabel"
                    :surah-label="currentSurahLabel"
                    :active="true"
                    :alt="pageAlt(pageNumber)"
                    :lines="(currentPageData && currentPageData.lines) || []"
                    :glyphs-ready="!!(currentPageData && currentPageData.glyphsReady)"
                    :font-family="(currentPageData && currentPageData.fontFamily) || ''"
                    :tajweed-enabled="tajweedEnabled"
                    :font-size="fontSize"
                    :surah-names-font-family="surahNamesFontFamily"
                    @select-ayah="$emit('select-ayah', $event)"
                    @select-word="$emit('select-word', $event)"
                    @peek-enter="$emit('peek-enter', $event)"
                    @peek-leave="$emit('peek-leave')"
                  />
                </article>
              </div>
            </Transition>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import AppStatus from './AppStatus.vue'
import OriginalMadaniPageFrame from './OriginalMadaniPageFrame.vue'
import { i18nMixin } from '../mixins/i18nMixin'
import { originalMadaniZoomFromFontSize } from '../scripts/mushaf/originalMadaniMushaf.js'

function emptyPageData() {
  return { lines: [], glyphsReady: false, fontFamily: '' }
}

export default {
  name: 'OriginalMadaniMushaf',
  components: { AppStatus, OriginalMadaniPageFrame },
  mixins: [i18nMixin],
  props: {
    pageNumber: { type: Number, required: true },
    spread: { type: Boolean, default: false },
    leftPage: { type: Number, default: null },
    rightPage: { type: Number, default: null },
    paginationLabel: { type: String, default: '' },
    canPrevious: { type: Boolean, default: false },
    canNext: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    offline: { type: Boolean, default: false },
    isRtl: { type: Boolean, default: false },
    leftJuzLabel: { type: String, default: '' },
    leftSurahLabel: { type: String, default: '' },
    rightJuzLabel: { type: String, default: '' },
    rightSurahLabel: { type: String, default: '' },
    currentJuzLabel: { type: String, default: '' },
    currentSurahLabel: { type: String, default: '' },
    leftPageData: { type: Object, default: emptyPageData },
    rightPageData: { type: Object, default: emptyPageData },
    currentPageData: { type: Object, default: emptyPageData },
    fontSize: { type: Number, default: 150 },
    minFontSize: { type: Number, default: 70 },
    maxFontSize: { type: Number, default: 280 },
    tajweedEnabled: { type: Boolean, default: false },
    blurEnabled: { type: Boolean, default: false },
    focusEnabled: { type: Boolean, default: false },
    quranFontFamily: { type: String, default: '' },
    surahNamesFontFamily: { type: String, default: 'surah_names' },
    sessionLabel: { type: String, default: '' },
    fullscreenActive: { type: Boolean, default: false },
  },
  emits: [
    'previous-page',
    'next-page',
    'select-page',
    'select-ayah',
    'select-word',
    'peek-enter',
    'peek-leave',
    'open-controls',
    'retry',
    'switch-mushaf',
    'increase-font',
    'decrease-font',
    'toggle-fullscreen',
  ],
  data() {
    return {
      touchStartX: null,
      touchStartY: null,
      pageTurnDirection: 1,
    }
  },
  computed: {
    showPair() {
      return !!(this.spread && this.leftPage && this.rightPage)
    },
    spreadKey() {
      if (this.showPair) return `pair-${this.rightPage}-${this.leftPage}`
      return `page-${this.pageNumber}`
    },
    pageTransitionName() {
      return this.pageTurnDirection >= 0 ? 'madani-turn-forward' : 'madani-turn-back'
    },
    workspaceStyle() {
      return {
        '--verse-font-percent': String(this.fontSize || 150),
        '--original-madani-zoom': String(originalMadaniZoomFromFontSize(this.fontSize)),
        '--quran-font': this.quranFontFamily || 'var(--font-ar, "Amiri", "Noto Naskh Arabic", serif)',
      }
    },
  },
  watch: {
    pageNumber(next, prev) {
      const a = Number(next) || 0
      const b = Number(prev) || 0
      if (a && b && a !== b) this.pageTurnDirection = a > b ? 1 : -1
    },
  },
  methods: {
    pageAlt(page) {
      return this.t('memorisation.a11y.originalMadaniPage', { page })
    },
    onTouchStart(event) {
      const touch = event.changedTouches?.[0]
      if (!touch) return
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
    },
    onTouchEnd(event) {
      const touch = event.changedTouches?.[0]
      if (!touch || this.touchStartX == null) return
      const dx = touch.clientX - this.touchStartX
      const dy = touch.clientY - this.touchStartY
      this.touchStartX = null
      this.touchStartY = null
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) this.$emit('next-page')
      else this.$emit('previous-page')
    },
  },
}
</script>
