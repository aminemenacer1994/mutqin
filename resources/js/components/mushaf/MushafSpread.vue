<template>
  <div
    class="madani-mushaf-spread mushaf-spread"
    :class="{
      'mushaf-spread--pair': showPair,
      'mushaf-spread--single': !showPair,
    }"
  >
    <article
      v-if="showPair && leftPage"
      class="madani-mushaf-spread__leaf madani-mushaf-spread__leaf--left"
      :data-side="'left'"
    >
      <MushafPage
        :page-number="leftPage.pageNumber"
        :lines="leftPage.lines"
        :font-family="leftPage.fontFamily"
        :font-size="fontSize"
        :juz-label="leftPage.juzLabel"
        :surah-label="leftPage.surahLabel"
        :page-label="leftPage.pageLabel"
        :glyphs-ready="leftPage.glyphsReady"
        :loading="leftPage.loading"
        :tajweed-enabled="tajweedEnabled"
        :surah-names-font-family="surahNamesFontFamily"
        :bismillah-label="bismillahLabel"
        side="left"
        @select-word="$emit('select-word', $event)"
        @peek-enter="$emit('peek-enter', $event)"
        @peek-leave="$emit('peek-leave', $event)"
        @touch-start="(e, w) => $emit('touch-start', e, w)"
        @touch-end="(e, w) => $emit('touch-end', e, w)"
        @touch-cancel="$emit('touch-cancel')"
      />
    </article>

    <div v-if="showPair" class="madani-mushaf-spread__gutter" aria-hidden="true" />

    <article
      v-if="showPair && rightPage"
      class="madani-mushaf-spread__leaf madani-mushaf-spread__leaf--right"
      :data-side="'right'"
    >
      <MushafPage
        :page-number="rightPage.pageNumber"
        :lines="rightPage.lines"
        :font-family="rightPage.fontFamily"
        :font-size="fontSize"
        :juz-label="rightPage.juzLabel"
        :surah-label="rightPage.surahLabel"
        :page-label="rightPage.pageLabel"
        :glyphs-ready="rightPage.glyphsReady"
        :loading="rightPage.loading"
        :tajweed-enabled="tajweedEnabled"
        :surah-names-font-family="surahNamesFontFamily"
        :bismillah-label="bismillahLabel"
        side="right"
        @select-word="$emit('select-word', $event)"
        @peek-enter="$emit('peek-enter', $event)"
        @peek-leave="$emit('peek-leave', $event)"
        @touch-start="(e, w) => $emit('touch-start', e, w)"
        @touch-end="(e, w) => $emit('touch-end', e, w)"
        @touch-cancel="$emit('touch-cancel')"
      />
    </article>

    <article v-if="!showPair && singlePage" class="madani-mushaf-spread__leaf madani-mushaf-spread__leaf--single">
      <MushafPage
        :page-number="singlePage.pageNumber"
        :lines="singlePage.lines"
        :font-family="singlePage.fontFamily"
        :font-size="fontSize"
        :juz-label="singlePage.juzLabel"
        :surah-label="singlePage.surahLabel"
        :page-label="singlePage.pageLabel"
        :glyphs-ready="singlePage.glyphsReady"
        :loading="singlePage.loading"
        :tajweed-enabled="tajweedEnabled"
        :surah-names-font-family="surahNamesFontFamily"
        :bismillah-label="bismillahLabel"
        side="single"
        @select-word="$emit('select-word', $event)"
        @peek-enter="$emit('peek-enter', $event)"
        @peek-leave="$emit('peek-leave', $event)"
        @touch-start="(e, w) => $emit('touch-start', e, w)"
        @touch-end="(e, w) => $emit('touch-end', e, w)"
        @touch-cancel="$emit('touch-cancel')"
      />
    </article>
  </div>
</template>

<script>
import MushafPage from './MushafPage.vue'

export default {
  name: 'MushafSpread',
  components: { MushafPage },
  props: {
    spread: { type: Boolean, default: false },
    leftPage: { type: Object, default: null },
    rightPage: { type: Object, default: null },
    singlePage: { type: Object, default: null },
    fontSize: { type: Number, default: 120 },
    tajweedEnabled: { type: Boolean, default: false },
    surahNamesFontFamily: { type: String, default: 'surahnames' },
    bismillahLabel: { type: String, default: 'Bismillah' },
  },
  emits: ['select-word', 'peek-enter', 'peek-leave', 'touch-start', 'touch-end', 'touch-cancel'],
  computed: {
    showPair() {
      return !!(this.spread && this.leftPage && this.rightPage)
    },
  },
}
</script>
