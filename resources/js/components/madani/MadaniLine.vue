<template>
  <div
    class="qpc-madani-line"
    :class="[
      `qpc-madani-line--${lineType}`,
      {
        'qpc-madani-line--centered': isCentered,
        'qpc-madani-line--session-partial': sessionPartialLine,
        'qpc-madani-line--session-slot': sessionScoped,
        'qpc-madani-line--indopak': isIndopakLayout,
      },
    ]"
    :data-line="lineNumber"
    :data-line-type="lineType"
    :data-centered="isCentered ? 1 : 0"
    :data-surah="line.surah_number ?? line.surahNumber"
    :data-layout="layoutId"
  >
    <div
      v-if="isSurahNameLine && isIndopakLayout"
      class="qpc-madani-surah-header qpc-madani-surah-header--indopak"
    >
      <MadaniSurahHeading
        :surah-number="line.surah_number ?? line.surahNumber"
        :glyph="indopakHeaderText"
        :font-family="indopakSurahFontFamily"
        :ready="indopakSurahFontReady"
      />
    </div>

    <div
      v-else-if="isSurahNameLine"
      class="qpc-madani-surah-header"
      :data-surah="line.surah_number"
    >
      <span
        ref="surahNameEl"
        class="qpc-madani-surah-name"
        :class="{ 'is-surah-font-ready': surahNamesReady }"
        :style="{ fontFamily: `'${surahFontFamily}', serif` }"
        aria-hidden="true"
      >{{ headerText }}</span>
      <span class="visually-hidden">Surah {{ line.surah_number }}</span>
    </div>

    <template v-else-if="isBasmalaLine">
      <span
        v-if="line.words?.length"
        class="qpc-madani-basmallah-words"
      >
        <MadaniWord
          v-for="word in displayWords"
          :key="wordKey(word)"
          :word="word"
          :layout-id="layoutId"
          :font-family="fontFamily"
          :selected="selectedLocation === word.location"
          :selection="selection"
          :technique-snapshot="techniqueSnapshot"
          :progress-snapshot="progressSnapshot"
          :audio-index-map="audioIndexMap"
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
      </span>
      <span
        v-else
        class="qpc-madani-basmallah"
        :class="{ 'qpc-madani-basmallah--indopak': isIndopakLayout }"
        dir="rtl"
        lang="ar"
        :style="basmalaStyle"
        aria-label="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
      >بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</span>
    </template>

    <template v-else-if="lineType === 'ayah'">
      <MadaniWord
        v-for="word in displayWords"
        :key="wordKey(word)"
        :word="word"
        :layout-id="layoutId"
        :font-family="fontFamily"
        :selected="selectedLocation === word.location"
        :selection="selection"
        :technique-snapshot="techniqueSnapshot"
        :progress-snapshot="progressSnapshot"
        :audio-index-map="audioIndexMap"
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
    </template>
  </div>
</template>

<script>
import {
  ayahKeyFromWord,
  isAyahInSessionSelection,
} from '../../scripts/mushaf/qpcMadaniSelection'
import { surahNameGlyphText } from '../../scripts/mushaf/madaniPageLayout'
import { getSurahArabicBannerText } from '../../scripts/mushaf/surahArabicNameCache.js'
import { SURAH_NAMES_FONT_FAMILY } from '../../scripts/mushaf/qcfFontLoader'
import { MUSHAF_LAYOUT_MADANI_V2 } from '../../scripts/mushaf/mushafLayouts'
import { isIndopakMushafLayout } from '../../scripts/mushaf/indopakPageAdapter'
import { INDOPAK_NASTALEEQ_FONT_STACK } from '../../scripts/mushaf/indopakNastaleeqFont'
import MadaniWord from './MadaniWord.vue'
import MadaniSurahHeading from './MadaniSurahHeading.vue'

export default {
  name: 'MadaniLine',
  components: { MadaniWord, MadaniSurahHeading },
  emits: ['select', 'ayah-enter', 'ayah-leave', 'peek-enter', 'peek-leave', 'peek-touchstart', 'peek-touchend', 'peek-touchcancel'],
  props: {
    line: {
      type: Object,
      required: true,
    },
    fontFamily: {
      type: String,
      required: true,
    },
    layoutId: {
      type: String,
      default: MUSHAF_LAYOUT_MADANI_V2,
    },
    selectedLocation: {
      type: String,
      default: '',
    },
    selection: {
      type: Object,
      default: null,
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
    surahNamesReady: {
      type: Boolean,
      default: false,
    },
    sessionScoped: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    displayWords() {
      const words = Array.isArray(this.line?.words) ? this.line.words : []
      if (!this.sessionScoped || !words.length) return words
      const selection = this.selection || {}
      const start = String(selection.sessionStartAyah || selection.rangeStartAyah || '').trim()
      const end = String(selection.sessionEndAyah || selection.rangeEndAyah || start).trim()
      if (!start || !end) return words
      return words.filter((word) => {
        const key = ayahKeyFromWord(word)
        return key && isAyahInSessionSelection(key, selection)
      })
    },
    isIndopakLayout() {
      return isIndopakMushafLayout(this.layoutId)
    },
    sessionPartialLine() {
      return this.sessionScoped && Number(this.line?.session_partial_line) === 1
    },
    lineNumber() {
      return this.line?.line_number ?? this.line?.lineNumber
    },
    lineType() {
      return String(this.line?.line_type || this.line?.type || '')
    },
    isCentered() {
      return this.line?.centered === true
        || this.line?.centered === 1
        || Number(this.line?.is_centered) === 1
    },
    isSurahNameLine() {
      return this.lineType === 'surah_name'
    },
    isBasmalaLine() {
      return this.lineType === 'basmallah' || this.lineType === 'basmala'
    },
    headerText() {
      const surah = this.line.surah_number ?? this.line.surahNumber
      if (!this.isSurahNameLine || surah === '' || surah == null) {
        return ''
      }

      return surahNameGlyphText(surah)
    },
    indopakHeaderText() {
      const surah = this.line.surah_number ?? this.line.surahNumber
      if (!this.isSurahNameLine || surah === '' || surah == null) {
        return ''
      }
      return getSurahArabicBannerText(surah) || `سُورَة ${surah}`
    },
    surahFontFamily() {
      return SURAH_NAMES_FONT_FAMILY
    },
    indopakSurahFontFamily() {
      return INDOPAK_NASTALEEQ_FONT_STACK
    },
    indopakSurahFontReady() {
      return this.isIndopakLayout ? this.surahNamesReady : false
    },
    basmalaStyle() {
      if (!this.isIndopakLayout) return null
      return { fontFamily: INDOPAK_NASTALEEQ_FONT_STACK }
    },
  },
  mounted() {
    this.applySurahNameSize()
  },
  updated() {
    this.applySurahNameSize()
  },
  methods: {
    wordKey(word) {
      return word?.location || word?.id || word?.wordIndex || JSON.stringify(word)
    },
    /**
     * Force surah banner size on the node itself (inline !important).
     * Stylesheet wars (mobile-grid / blade hotfixes) cannot shrink this.
     */
    applySurahNameSize() {
      if (!this.isSurahNameLine || this.isIndopakLayout) return
      const el = this.$refs.surahNameEl
      if (!(el instanceof HTMLElement)) return
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768
      // Slightly above ayah ink; was 96px — nudged down for balance.
      const size = mobile ? '84px' : 'calc(var(--qpc-word-size, 22px) * 2.9)'
      el.style.setProperty('font-size', size, 'important')
      el.style.setProperty('line-height', '1.05', 'important')
      el.style.setProperty('overflow', 'visible', 'important')
      el.style.setProperty('max-width', '100%', 'important')
      el.style.setProperty('transform', 'none', 'important')
    },
  },
}
</script>

<style scoped>
.qpc-madani-line {
  display: flex;
  flex-flow: row nowrap;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  padding-inline: 0;
  padding-block: calc(var(--qpc-word-size, 22px) * 0.01);
  overflow: visible;
  contain: none;
  white-space: nowrap;
  line-height: var(--qpc-line-height, 1.32);
}

.qpc-madani-line--ayah {
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  justify-content: space-between;
  min-height: calc(var(--qpc-word-size, 22px) * var(--qpc-line-min-height, 1.62));
  margin-block-end: calc(var(--qpc-word-size, 22px) * var(--qpc-line-gap, 0));
}

/* Opening-page / printed centered ayah rows (e.g. Al-Fatihah) must not stretch. */
.qpc-madani-line--ayah.qpc-madani-line--centered,
.qpc-madani-line--ayah.qpc-madani-line--centered.qpc-madani-line--sparse {
  justify-content: center !important;
}

.qpc-madani-line--centered,
.qpc-madani-line--surah_name,
.qpc-madani-line--basmallah,
.qpc-madani-line--basmala {
  justify-content: center;
  overflow: visible;
}

.qpc-madani-line--surah_name {
  align-items: center;
  width: 100%;
  min-height: 0;
  padding: 0.08rem 0 0;
  margin-block-end: calc(var(--qpc-word-size, 22px) * 0.36);
}

.qpc-madani-line--basmallah,
.qpc-madani-line--basmala {
  min-height: 1.6em;
  margin-block-end: calc(var(--qpc-word-size, 22px) * 0.55);
  padding-block-end: calc(var(--qpc-word-size, 22px) * 0.42);
}

.qpc-madani-line--session-partial:not(.qpc-madani-line--sparse) {
  /* Same edge-to-edge stretch as full ayah rows (session start mid-line). */
  justify-content: space-between !important;
}

.qpc-madani-line--sparse {
  justify-content: center !important;
}

@media (max-width: 767.98px) {
  .qpc-madani-line {
    padding-block: 0;
    line-height: var(--qpc-line-height, 1.3);
  }

  .qpc-madani-line--ayah {
    min-height: calc(var(--qpc-word-size, 22px) * var(--qpc-line-min-height, 1.4));
    margin-block-end: calc(var(--qpc-word-size, 22px) * var(--qpc-line-gap, 0.14));
  }

  .qpc-madani-line--empty {
    display: none;
    min-height: 0;
    height: 0;
    margin: 0;
    padding: 0;
  }

  .qpc-madani-line--surah_name {
    margin-block-end: calc(var(--qpc-word-size, 22px) * 0.12);
    padding: 0;
  }

  .qpc-madani-line--basmallah,
  .qpc-madani-line--basmala {
    min-height: 0;
    margin-block-end: calc(var(--qpc-word-size, 22px) * 0.72);
    padding-block-end: calc(var(--qpc-word-size, 22px) * 0.55);
  }

  .qpc-madani-surah-name {
    max-width: 100%;
    font-size: min(
      calc(var(--qpc-word-size, 22px) * var(--qpc-surah-title-scale, 3.5)),
      84px
    );
    overflow: visible;
  }

  .qpc-madani-basmallah,
  .qpc-madani-basmallah-words {
    max-width: 100%;
  }
}

@media (min-width: 1080px) {
  .qpc-madani-line--basmallah,
  .qpc-madani-line--basmala,
  .qpc-madani-line--surah_name,
  .qpc-madani-line--ayah,
  .qpc-madani-line--empty {
    margin: 0;
    padding: 0;
    min-height: 0;
    overflow: hidden;
  }

  .qpc-madani-basmallah {
    font-size: calc(var(--qpc-word-size, 22px) * 0.96);
    line-height: 1;
  }
}

.qpc-madani-basmallah-words {
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
}

.qpc-madani-surah-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--qpc-word-size, 22px) * 0.12);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  text-align: center;
  color: var(--qpc-ink, #1b140d);
}

.qpc-madani-surah-name {
  display: inline-block;
  font-family: surahnames, serif !important;
  font-size: calc(var(--qpc-word-size, 22px) * var(--qpc-surah-title-scale, 2.45));
  font-weight: 400;
  line-height: 1.05;
  white-space: nowrap;
  letter-spacing: 0;
  color: inherit;
  font-variant-ligatures: common-ligatures discretionary-ligatures;
  font-feature-settings: "liga" 1, "dlig" 1, "calt" 1;
  opacity: 0.35;
}

.qpc-madani-surah-name.is-surah-font-ready {
  opacity: 1;
}

.qpc-madani-basmallah {
  font-family: "Amiri Quran", "Amiri", "Noto Naskh Arabic", "Scheherazade New", serif !important;
  font-size: calc(var(--qpc-word-size, 22px) * 1.08);
  font-weight: 400;
  line-height: 1.35;
  white-space: nowrap;
  letter-spacing: 0;
}

.qpc-madani-basmallah--indopak {
  font-family: IndopakNastaleeq, "Noto Nastaliq Urdu", "Amiri Quran", "Noto Naskh Arabic", serif !important;
}

@media (max-width: 767.98px) {
  .qpc-madani-surah-name {
    font-size: min(calc(var(--qpc-word-size, 22px) * var(--qpc-surah-title-scale, 3.5)), 84px) !important;
    max-width: 100%;
    overflow: visible !important;
    line-height: 1.05;
  }

  .qpc-madani-basmallah {
    font-size: min(calc(var(--qpc-word-size, 22px) * 1), 24px) !important;
    max-width: 100%;
  }

  .qpc-madani-line--surah_name,
  .qpc-madani-line--basmallah,
  .qpc-madani-line--basmala {
    max-width: 100%;
    overflow: hidden;
    justify-content: center;
  }

  .qpc-madani-line--basmallah,
  .qpc-madani-line--basmala {
    margin-block-end: calc(var(--qpc-word-size, 22px) * 0.72) !important;
    padding-block-end: calc(var(--qpc-word-size, 22px) * 0.55) !important;
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
