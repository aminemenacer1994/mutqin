<template>
  <div class="madani-surah-heading" :data-surah="surahNumber">
    <span
      class="qpc-madani-surah-name madani-surah-heading__title"
      :class="{ 'is-surah-font-ready': ready }"
      :style="titleStyle"
      dir="rtl"
      lang="ar"
    >{{ glyph }}</span>
  </div>
</template>

<script>
import { INDOPAK_NASTALEEQ_FONT_STACK } from '../../scripts/mushaf/indopakNastaleeqFont.js'

export default {
  name: 'MadaniSurahHeading',
  props: {
    surahNumber: {
      type: [Number, String],
      default: '',
    },
    glyph: {
      type: String,
      default: '',
    },
    fontFamily: {
      type: String,
      default: '',
    },
    ready: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    titleStyle() {
      const family = String(this.fontFamily || '').trim()
      return { fontFamily: family || INDOPAK_NASTALEEQ_FONT_STACK }
    },
  },
}
</script>

<style scoped>
.madani-surah-heading {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 0.1rem 0.35rem 0.05rem;
  color: inherit;
}

.madani-surah-heading__title {
  display: block;
  max-width: 100%;
  font-size: calc(var(--qpc-word-size, 22px) * var(--qpc-surah-title-scale, 2.35));
  font-weight: 400;
  font-synthesis: none;
  line-height: 1.15;
  white-space: nowrap;
  letter-spacing: 0;
  text-align: center;
  color: currentColor;
  opacity: 0.35;
}

.madani-surah-heading__title.is-surah-font-ready {
  opacity: 1;
}

@media (max-width: 767.98px) {
  .madani-surah-heading__title {
    font-size: calc(var(--qpc-word-size, 22px) * var(--qpc-surah-title-scale, 2.15));
  }
}
</style>
