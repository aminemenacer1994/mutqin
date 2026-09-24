<template>
  <div
    class="qpc-madani-line"
    :class="[
      `qpc-madani-line--${lineType}`,
      {
        'qpc-madani-line--centered': Number(line.is_centered) === 1,
        'qpc-madani-line--session-partial': sessionPartialLine,
      },
    ]"
    :data-line="line.line_number"
    :data-line-type="lineType"
    :data-centered="line.is_centered"
    :data-surah="line.surah_number"
  >
    <div
      v-if="isSurahNameLine"
      class="qpc-madani-surah-header"
      :data-surah="line.surah_number"
    >
      <div class="qpc-madani-surah-header__frame">
        <span
          class="qpc-madani-surah-name"
          :class="{ 'is-surah-font-ready': surahNamesReady }"
          :style="{ fontFamily: `'${surahFontFamily}', serif` }"
          aria-hidden="true"
        >{{ headerText }}</span>
      </div>
      <span class="visually-hidden">Surah {{ line.surah_number }}</span>
    </div>

    <template v-else-if="isBasmalaLine">
      <span
        v-if="line.words?.length"
        class="qpc-madani-basmallah-words"
      >
        <MadaniWord
          v-for="word in line.words"
          :key="word.id"
          :word="word"
          :font-family="fontFamily"
          :selected="selectedLocation === word.location"
          :selection="selection"
          :technique-snapshot="techniqueSnapshot"
          :progress-snapshot="progressSnapshot"
          :audio-index-map="audioIndexMap"
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
      </span>
      <span
        v-else
        class="qpc-madani-basmallah"
        dir="rtl"
        lang="ar"
        aria-label="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
      >بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</span>
    </template>

    <template v-else-if="lineType === 'ayah'">
      <MadaniWord
        v-for="word in line.words"
        :key="word.id"
        :word="word"
        :font-family="fontFamily"
        :selected="selectedLocation === word.location"
        :selection="selection"
        :technique-snapshot="techniqueSnapshot"
        :progress-snapshot="progressSnapshot"
        :audio-index-map="audioIndexMap"
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
    </template>
  </div>
</template>

<script>
import { surahNameGlyphText } from '../../scripts/mushaf/madaniPageLayout'
import { SURAH_NAMES_FONT_FAMILY } from '../../scripts/mushaf/qcfFontLoader'
import MadaniWord from './MadaniWord.vue'

export default {
  name: 'MadaniLine',
  components: { MadaniWord },
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
    sessionPartialLine() {
      return this.sessionScoped && Number(this.line?.session_partial_line) === 1
    },
    lineType() {
      return String(this.line?.line_type || this.line?.type || '')
    },
    isSurahNameLine() {
      return this.lineType === 'surah_name'
    },
    isBasmalaLine() {
      return this.lineType === 'basmallah' || this.lineType === 'basmala'
    },
    headerText() {
      if (!this.isSurahNameLine || this.line.surah_number === '' || this.line.surah_number == null) {
        return ''
      }

      return surahNameGlyphText(this.line.surah_number)
    },
    surahFontFamily() {
      return SURAH_NAMES_FONT_FAMILY
    },
  },
}
</script>

<style scoped>
.qpc-madani-line {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: calc(var(--qpc-word-size, 22px) * 1.32);
  padding-inline: 0;
  padding-block: calc(var(--qpc-word-size, 22px) * 0.05);
  overflow: visible;
  white-space: nowrap;
  line-height: 1;
}

.qpc-madani-line--centered,
.qpc-madani-line--surah_name,
.qpc-madani-line--basmallah,
.qpc-madani-line--basmala {
  justify-content: center;
  overflow: visible;
}

.qpc-madani-line--surah_name {
  min-height: 0;
  padding-block: calc(var(--qpc-word-size, 22px) * 0.12);
}

.qpc-madani-line--basmallah,
.qpc-madani-line--basmala {
  min-height: 1.6em;
}

.qpc-madani-line--session-partial {
  justify-content: flex-start !important;
}

.qpc-madani-basmallah-words {
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
}

.qpc-madani-surah-header {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  padding-block: calc(var(--qpc-word-size, 22px) * 0.18);
}

.qpc-madani-surah-header__frame {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(100%, 22rem);
  min-height: calc(var(--qpc-word-size, 22px) * 1.55);
  padding: calc(var(--qpc-word-size, 22px) * 0.14) calc(var(--qpc-word-size, 22px) * 0.55);
  border: 1px solid color-mix(in srgb, var(--qpc-ink, #1b140d) 42%, transparent);
  outline: 1px solid color-mix(in srgb, var(--qpc-ink, #1b140d) 18%, transparent);
  outline-offset: 3px;
  border-radius: 999px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--qpc-ink, #1b140d) 4%, transparent),
      transparent 42%,
      color-mix(in srgb, var(--qpc-ink, #1b140d) 3%, transparent)
    );
}

.qpc-madani-surah-name {
  font-family: surahnames, serif !important;
  font-size: calc(var(--qpc-word-size, 22px) * 1.34);
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 0;
  color: var(--qpc-ink, #1b140d);
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
