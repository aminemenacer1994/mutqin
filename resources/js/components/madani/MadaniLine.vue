<template>
  <div
    class="qpc-madani-line"
    :class="[
      `qpc-madani-line--${line.line_type}`,
      { 'qpc-madani-line--centered': Number(line.is_centered) === 1 },
    ]"
    :data-line="line.line_number"
    :data-line-type="line.line_type"
    :data-centered="line.is_centered"
    :data-surah="line.surah_number"
  >
    <span
      v-if="line.line_type === 'surah_name'"
      class="qpc-madani-surah-name"
      :data-surah="line.surah_number"
      :style="{ fontFamily: `'${surahFontFamily}', serif` }"
      aria-hidden="true"
    >{{ headerText }}</span>
    <span
      v-if="line.line_type === 'surah_name'"
      class="visually-hidden"
    >Surah {{ line.surah_number }}</span>

    <template v-else-if="line.line_type === 'basmallah'">
      <span
        v-if="line.words.length"
        class="qpc-madani-basmallah-words"
      >
        <MadaniWord
          v-for="word in line.words"
          :key="word.id"
          :word="word"
          :font-family="fontFamily"
          :selected="selectedLocation === word.location"
          :selection="selection"
          @select="$emit('select', $event)"
        />
      </span>
      <span
        v-else
        class="qpc-madani-basmallah"
        :style="{ fontFamily: `'${surahFontFamily}', serif` }"
        aria-label="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
      >﷽</span>
    </template>

    <template v-else-if="line.line_type === 'ayah'">
      <MadaniWord
        v-for="word in line.words"
        :key="word.id"
        :word="word"
        :font-family="fontFamily"
        :selected="selectedLocation === word.location"
        :selection="selection"
        @select="$emit('select', $event)"
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
  emits: ['select'],
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
  },
  computed: {
    headerText() {
      if (this.line.line_type !== 'surah_name' || this.line.surah_number === '') {
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
  min-height: var(--qpc-line-min-height, 1.95em);
  padding-inline: 0;
  overflow: visible;
  white-space: nowrap;
  line-height: var(--qpc-line-height, 1.72);
}

.qpc-madani-line--centered,
.qpc-madani-line--surah_name,
.qpc-madani-line--basmallah {
  justify-content: center;
}

.qpc-madani-line--surah_name,
.qpc-madani-line--basmallah {
  min-height: 2.15em;
}

.qpc-madani-basmallah-words {
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
}

.qpc-madani-surah-name,
.qpc-madani-basmallah {
  font-size: calc(var(--qpc-word-size, 22px) * 1.16);
  font-weight: 400;
  line-height: 1.2;
  white-space: nowrap;
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
