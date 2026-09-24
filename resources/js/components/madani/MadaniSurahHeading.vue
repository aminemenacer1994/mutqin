<template>
  <div class="madani-surah-heading" :data-surah="surahNumber">
    <svg
      class="madani-surah-heading__frame"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g class="madani-surah-heading__art" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <rect class="madani-surah-heading__outer" x="4" y="4" width="992" height="62" rx="0.5" />
        <rect class="madani-surah-heading__inner" x="9" y="9" width="982" height="52" rx="0.5" />

        <path class="madani-surah-heading__rule" d="M 62 14 H 938 M 62 17 H 938 M 62 53 H 938 M 62 56 H 938" />

        <g class="madani-surah-heading__corner" transform="translate(0 0)">
          <path d="M14 14c0 8 6 14 14 14-6-2-10-6-12-12" />
          <path d="M14 14c8 0 14 6 14 14-4-6-8-10-14-12" />
          <path d="M22 18c4 2 7 6 8 11-3-3-6-5-10-6" />
          <path d="M18 22c2 4 2 8 0 12" />
          <path d="M26 14c3 4 3 9 1 13" />
          <path d="M14 26c4 2 9 2 13 0" />
          <path d="M30 24c2 3 2 7 0 10" />
          <path d="M24 30c3 1 7 1 10-1" />
          <path d="M34 16c2 5 1 10-2 14M16 34c5 2 10 1 14-2" />
          <path d="M20 20c3 3 3 7 0 10M20 20c3-3 7-3 10 0" />
          <path d="M38 22c1 4-1 8-4 10M22 38c4 1 8-1 10-4" />
          <path d="M42 28c-2 2-5 3-8 2M28 42c2-2 3-5 2-8" />
        </g>
        <g class="madani-surah-heading__corner" transform="translate(1000 0) scale(-1 1)">
          <path d="M14 14c0 8 6 14 14 14-6-2-10-6-12-12" />
          <path d="M14 14c8 0 14 6 14 14-4-6-8-10-14-12" />
          <path d="M22 18c4 2 7 6 8 11-3-3-6-5-10-6" />
          <path d="M18 22c2 4 2 8 0 12" />
          <path d="M26 14c3 4 3 9 1 13" />
          <path d="M14 26c4 2 9 2 13 0" />
          <path d="M30 24c2 3 2 7 0 10" />
          <path d="M24 30c3 1 7 1 10-1" />
          <path d="M34 16c2 5 1 10-2 14M16 34c5 2 10 1 14-2" />
          <path d="M20 20c3 3 3 7 0 10M20 20c3-3 7-3 10 0" />
          <path d="M38 22c1 4-1 8-4 10M22 38c4 1 8-1 10-4" />
          <path d="M42 28c-2 2-5 3-8 2M28 42c2-2 3-5 2-8" />
        </g>
        <g class="madani-surah-heading__corner" transform="translate(0 70) scale(1 -1)">
          <path d="M14 14c0 8 6 14 14 14-6-2-10-6-12-12" />
          <path d="M14 14c8 0 14 6 14 14-4-6-8-10-14-12" />
          <path d="M22 18c4 2 7 6 8 11-3-3-6-5-10-6" />
          <path d="M18 22c2 4 2 8 0 12" />
          <path d="M26 14c3 4 3 9 1 13" />
          <path d="M14 26c4 2 9 2 13 0" />
          <path d="M30 24c2 3 2 7 0 10" />
          <path d="M24 30c3 1 7 1 10-1" />
          <path d="M34 16c2 5 1 10-2 14M16 34c5 2 10 1 14-2" />
          <path d="M20 20c3 3 3 7 0 10M20 20c3-3 7-3 10 0" />
          <path d="M38 22c1 4-1 8-4 10M22 38c4 1 8-1 10-4" />
          <path d="M42 28c-2 2-5 3-8 2M28 42c2-2 3-5 2-8" />
        </g>
        <g class="madani-surah-heading__corner" transform="translate(1000 70) scale(-1 -1)">
          <path d="M14 14c0 8 6 14 14 14-6-2-10-6-12-12" />
          <path d="M14 14c8 0 14 6 14 14-4-6-8-10-14-12" />
          <path d="M22 18c4 2 7 6 8 11-3-3-6-5-10-6" />
          <path d="M18 22c2 4 2 8 0 12" />
          <path d="M26 14c3 4 3 9 1 13" />
          <path d="M14 26c4 2 9 2 13 0" />
          <path d="M30 24c2 3 2 7 0 10" />
          <path d="M24 30c3 1 7 1 10-1" />
          <path d="M34 16c2 5 1 10-2 14M16 34c5 2 10 1 14-2" />
          <path d="M20 20c3 3 3 7 0 10M20 20c3-3 7-3 10 0" />
          <path d="M38 22c1 4-1 8-4 10M22 38c4 1 8-1 10-4" />
          <path d="M42 28c-2 2-5 3-8 2M28 42c2-2 3-5 2-8" />
        </g>

        <g class="madani-surah-heading__scroll">
          <path d="M118 22c8-2 16 0 22 6-6-1-12 0-16 4" />
          <path d="M118 48c8 2 16 0 22-6-6 1-12 0-16-4" />
          <path d="M132 26c6 2 10 6 12 12-4-3-8-5-13-5" />
          <path d="M132 44c6-2 10-6 12-12-4 3-8 5-13 5" />
          <path d="M148 28c5 3 8 8 8 14-3-4-7-7-12-8" />
          <path d="M148 42c5-3 8-8 8-14-3 4-7 7-12 8" />
          <path d="M164 32c4 2 6 6 6 10-2-3-5-5-9-5" />
          <path d="M164 38c4-2 6-6 6-10-2 3-5 5-9 5" />
          <path d="M178 34h18M178 36h14" />
          <path d="M196 24c6 1 10 5 11 10M196 46c6-1 10-5 11-10" />
          <path d="M210 26c5 2 8 6 8 11M210 44c5-2 8-6 8-11" />
        </g>
        <g class="madani-surah-heading__scroll" transform="translate(1000 0) scale(-1 1)">
          <path d="M118 22c8-2 16 0 22 6-6-1-12 0-16 4" />
          <path d="M118 48c8 2 16 0 22-6-6 1-12 0-16-4" />
          <path d="M132 26c6 2 10 6 12 12-4-3-8-5-13-5" />
          <path d="M132 44c6-2 10-6 12-12-4 3-8 5-13 5" />
          <path d="M148 28c5 3 8 8 8 14-3-4-7-7-12-8" />
          <path d="M148 42c5-3 8-8 8-14-3 4-7 7-12 8" />
          <path d="M164 32c4 2 6 6 6 10-2-3-5-5-9-5" />
          <path d="M164 38c4-2 6-6 6-10-2 3-5 5-9 5" />
          <path d="M178 34h18M178 36h14" />
          <path d="M196 24c6 1 10 5 11 10M196 46c6-1 10-5 11-10" />
          <path d="M210 26c5 2 8 6 8 11M210 44c5-2 8-6 8-11" />
        </g>

        <g class="madani-surah-heading__medallion">
          <circle cx="228" cy="35" r="15.5" />
          <circle cx="228" cy="35" r="10.5" />
          <path d="M228 20.5v29M213.5 35h29M218 25.5l20 19M238 25.5l-20 19" />
          <path d="M221 24.5c4 3 4 7 0 10M235 24.5c-4 3-4 7 0 10M221 45.5c4-3 4-7 0-10M235 45.5c-4-3 4-7 0-10" />
        </g>
        <g class="madani-surah-heading__medallion">
          <circle cx="772" cy="35" r="15.5" />
          <circle cx="772" cy="35" r="10.5" />
          <path d="M772 20.5v29M757.5 35h29M762 25.5l20 19M782 25.5l-20 19" />
          <path d="M765 24.5c4 3 4 7 0 10M779 24.5c-4 3-4 7 0 10M765 45.5c4-3 4-7 0-10M779 45.5c-4-3 4-7 0-10" />
        </g>

        <path class="madani-surah-heading__cartouche" :d="cartoucheOuter" />
        <path class="madani-surah-heading__cartouche madani-surah-heading__cartouche--inner" :d="cartoucheInner" />
      </g>
    </svg>
    <div class="madani-surah-heading__title">
      <span
        class="qpc-madani-surah-name"
        :class="{ 'is-surah-font-ready': ready }"
        :style="titleStyle"
        aria-hidden="true"
      >{{ glyph }}</span>
    </div>
  </div>
</template>

<script>
import {
  MADANI_SURAH_HEADING_CARTOUCHE_INNER,
  MADANI_SURAH_HEADING_CARTOUCHE_OUTER,
  MADANI_SURAH_HEADING_VIEWBOX,
} from './madaniSurahHeadingArt.js'

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
      default: 'surahnames',
    },
    ready: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    viewBox() {
      return MADANI_SURAH_HEADING_VIEWBOX
    },
    cartoucheOuter() {
      return MADANI_SURAH_HEADING_CARTOUCHE_OUTER
    },
    cartoucheInner() {
      return MADANI_SURAH_HEADING_CARTOUCHE_INNER
    },
    titleStyle() {
      const family = String(this.fontFamily || 'surahnames')
      return { fontFamily: `'${family}', serif` }
    },
  },
}
</script>

<style scoped>
.madani-surah-heading {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding-inline: 0.2rem;
  color: inherit;
}

.madani-surah-heading__frame {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1000 / 70;
  overflow: visible;
}

.madani-surah-heading__outer {
  stroke-width: 1.35;
}

.madani-surah-heading__inner {
  stroke-width: 1;
}

.madani-surah-heading__rule {
  stroke-width: 1.05;
}

.madani-surah-heading__corner {
  stroke-width: 1.05;
}

.madani-surah-heading__scroll {
  stroke-width: 0.95;
}

.madani-surah-heading__medallion {
  stroke-width: 1.15;
}

.madani-surah-heading__medallion path:nth-of-type(n + 3) {
  stroke-width: 0.8;
}

.madani-surah-heading__cartouche {
  stroke-width: 1.25;
}

.madani-surah-heading__cartouche--inner {
  stroke-width: 1;
}

.madani-surah-heading__title {
  position: absolute;
  left: 34%;
  right: 34%;
  top: 18%;
  bottom: 18%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  pointer-events: none;
}

.qpc-madani-surah-name {
  display: block;
  max-width: 100%;
  font-family: surahnames, serif;
  font-size: calc(var(--qpc-word-size, 22px) * 1.52);
  font-weight: 400;
  font-synthesis: none;
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 0;
  text-align: center;
  color: currentColor;
  font-variant-ligatures: common-ligatures discretionary-ligatures;
  font-feature-settings: "liga" 1, "dlig" 1, "calt" 1;
  opacity: 0.35;
}

.qpc-madani-surah-name.is-surah-font-ready {
  opacity: 1;
}

@media (max-width: 767.98px) {
  .qpc-madani-surah-name {
    font-size: calc(var(--qpc-word-size, 22px) * 1.38);
  }
}
</style>
