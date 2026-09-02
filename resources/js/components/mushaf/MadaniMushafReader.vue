<template>
  <div
    class="madani-mushaf-reader"
    :class="{
      'madani-mushaf-reader--spread': spreadActive,
      'madani-mushaf-reader--single': !spreadActive,
      'madani-mushaf-reader--loading': loading,
    }"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div v-if="error" class="mushaf-empty-page mushaf-empty-page--error">
      <AppStatus
        :variant="offline ? 'offline' : 'error'"
        fill
        compact
        :title="errorTitle"
        :description="errorDescription"
        :action-label="retryLabel"
        :secondary-action-label="switchLayoutLabel"
        @action="$emit('retry')"
        @secondary-action="$emit('switch-layout')"
      />
    </div>

    <template v-else>
      <MushafSpread
        :spread="spreadActive"
        :left-page="leftPageView"
        :right-page="rightPageView"
        :single-page="singlePageView"
        :font-size="fontSize"
        :tajweed-enabled="tajweedEnabled"
        :surah-names-font-family="surahNamesFontFamily"
        :bismillah-label="bismillahLabel"
        @select-word="$emit('select-word', $event)"
        @peek-enter="$emit('peek-enter', $event)"
        @peek-leave="$emit('peek-leave', $event)"
        @touch-start="(e, w) => $emit('touch-start', e, w)"
        @touch-end="(e, w) => $emit('touch-end', e, w)"
        @touch-cancel="$emit('touch-cancel')"
      />
    </template>
  </div>
</template>

<script>
import AppStatus from '../AppStatus.vue'
import MushafSpread from './MushafSpread.vue'

export default {
  name: 'MadaniMushafReader',
  components: { AppStatus, MushafSpread },
  props: {
    pageNumber: { type: Number, required: true },
    spread: { type: Boolean, default: false },
    leftPage: { type: Object, default: null },
    rightPage: { type: Object, default: null },
    currentPage: { type: Object, default: null },
    fontSize: { type: Number, default: 120 },
    tajweedEnabled: { type: Boolean, default: false },
    surahNamesFontFamily: { type: String, default: 'surahnames' },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    offline: { type: Boolean, default: false },
    errorTitle: { type: String, default: '' },
    errorDescription: { type: String, default: '' },
    retryLabel: { type: String, default: 'Retry' },
    switchLayoutLabel: { type: String, default: 'Switch layout' },
    bismillahLabel: { type: String, default: 'Bismillah' },
    swipeEnabled: { type: Boolean, default: true },
  },
  emits: [
    'select-word',
    'peek-enter',
    'peek-leave',
    'touch-start',
    'touch-end',
    'touch-cancel',
    'retry',
    'switch-layout',
    'swipe-previous',
    'swipe-next',
  ],
  data() {
    return {
      touchStartX: null,
      touchStartY: null,
      touchOnWord: false,
    }
  },
  computed: {
    spreadActive() {
      return !!(this.spread && this.leftPage && this.rightPage)
    },
    leftPageView() {
      return this.leftPage || null
    },
    rightPageView() {
      return this.rightPage || null
    },
    singlePageView() {
      if (this.spreadActive) return null
      return this.currentPage || this.rightPage || this.leftPage || null
    },
  },
  methods: {
    onTouchStart(event) {
      if (!this.swipeEnabled) return
      const touch = event.changedTouches?.[0]
      if (!touch) return
      this.touchOnWord = !!event.target?.closest?.('.madani-mushaf-word, .madani-word')
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
    },
    onTouchEnd(event) {
      if (!this.swipeEnabled || this.touchOnWord) {
        this.resetTouch()
        return
      }
      const touch = event.changedTouches?.[0]
      if (!touch || this.touchStartX == null) return
      const dx = touch.clientX - this.touchStartX
      const dy = touch.clientY - this.touchStartY
      this.resetTouch()
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
      // RTL: swipe left → next page, swipe right → previous
      if (dx < 0) this.$emit('swipe-next')
      else this.$emit('swipe-previous')
    },
    resetTouch() {
      this.touchStartX = null
      this.touchStartY = null
      this.touchOnWord = false
    },
  },
}
</script>
