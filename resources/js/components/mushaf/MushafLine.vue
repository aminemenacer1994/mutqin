<template>
  <div
    class="madani-mushaf-line madani-line"
    :class="lineClasses"
    :data-line-number="line.lineNumber"
    lang="ar"
  >
    <template v-if="line.type === 'surah_name'">
      <span
        class="madani-surah-name"
        :style="{ fontFamily: `'${surahNamesFontFamily}'` }"
        aria-hidden="true"
      >{{ line.glyphText }}</span>
      <span class="sr-only">{{ surahLabel }}</span>
    </template>
    <template v-else-if="line.type === 'basmala'">
      <div class="madani-basmala" dir="rtl" lang="ar" :aria-label="bismillahLabel">
        {{ basmalaText }}
      </div>
    </template>
    <template v-else-if="line.type === 'empty'">
      <span class="madani-mushaf-line__spacer" aria-hidden="true">&nbsp;</span>
    </template>
    <template v-else>
      <MushafWord
        v-for="(word, index) in line.words"
        :key="`${line.key}-w-${word.id || index}-${word.verseKey}`"
        :word="word"
        :font-family="line.fontFamily || fontFamily"
        @select="$emit('select-word', $event)"
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
import MushafWord from './MushafWord.vue'

export default {
  name: 'MushafLine',
  components: { MushafWord },
  props: {
    line: { type: Object, required: true },
    fontFamily: { type: String, default: '' },
    surahNamesFontFamily: { type: String, default: 'surahnames' },
    surahLabel: { type: String, default: '' },
    bismillahLabel: { type: String, default: 'Bismillah' },
    basmalaText: {
      type: String,
      default: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    },
  },
  emits: ['select-word', 'peek-enter', 'peek-leave', 'touch-start', 'touch-end', 'touch-cancel'],
  computed: {
    lineClasses() {
      const centered = !!this.line.isCentered
      return [
        `madani-line--${this.line.type}`,
        {
          'madani-line--centered': centered,
          'madani-line--empty': this.line.type === 'empty',
          'madani-line--glyphs': this.line.useGlyphs && this.line.type === 'ayah',
          'madani-line--ayah': this.line.type === 'ayah',
          'madani-mushaf-line--ayah': this.line.type === 'ayah' || this.line.type === 'basmala_ayah',
          'madani-line--basmala-ayah': this.line.type === 'basmala_ayah',
        },
      ]
    },
  },
}
</script>
