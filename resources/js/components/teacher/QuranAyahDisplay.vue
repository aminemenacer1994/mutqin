<template>
  <div
    class="teacher-quran-ayah"
    :class="{ 'teacher-quran-ayah--inline': inline, 'teacher-quran-ayah--coloured': coloured }"
    lang="ar"
    dir="rtl"
  >
    <p v-if="loading" class="teacher-quran-ayah__muted">{{ t('teacher.loading_quran_text') }}</p>
    <template v-else-if="groups.length">
      <p
        v-for="group in groups"
        :key="group.ayah || group.words[0].word_index"
        class="teacher-quran-ayah__line"
      >
        <span
          v-if="showMarker(group)"
          class="teacher-quran-ayah__marker"
          :aria-label="t('teacher.ayah_n', { n: group.ayah })"
        >{{ group.ayah }}</span>
        <span
          v-for="word in group.words"
          :key="`${word.ayah || 0}-${word.word_index}`"
          class="teacher-quran-ayah__word"
          :class="[coloured ? wordClass(word) : 'teacher-quran-ayah__word--plain', isFocus(word) ? 'is-coaching-focus' : '']"
          :style="wordStyle(word)"
          :title="coloured ? wordTitle(word) : undefined"
        >{{ word.text }}</span>
      </p>
    </template>
    <p v-else-if="emptyLabel" class="teacher-quran-ayah__muted">{{ emptyLabel }}</p>
    <p v-else class="teacher-quran-ayah__muted">{{ t('teacher.madani_text_unavailable') }}</p>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { wordReviewClass, wordReviewTitle } from '../../scripts/teacher/wordReviewClass'

export default {
  name: 'QuranAyahDisplay',
  mixins: [i18nMixin],
  props: {
    words: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    coloured: { type: Boolean, default: false },
    inline: { type: Boolean, default: false },
    emptyLabel: { type: String, default: '' },
    focusIndex: { type: Number, default: null },
  },
  computed: {
    groups() {
      const groups = []
      for (const word of this.words || []) {
        if (!word?.madaniGlyph || !word.fontFamily || !word.text) continue
        const ayah = Number(word.ayah) || 0
        const last = groups[groups.length - 1]
        if (!last || last.ayah !== ayah) groups.push({ ayah, words: [word] })
        else last.words.push(word)
      }
      return groups
    },
  },
  methods: {
    showMarker(group) {
      // The verified Madani page words already include the verse-end glyph.
      return false
    },
    wordClass(word) {
      return wordReviewClass(word, 'teacher-quran-ayah__word--status')
    },
    wordTitle(word) {
      return wordReviewTitle(word, this.t)
    },
    isFocus(word) {
      if (this.focusIndex === null || this.focusIndex === undefined || this.focusIndex === '') return false
      const focus = Number(this.focusIndex)
      return Number.isInteger(focus) && focus >= 0 && Number(word?.word_index) === focus
    },
    wordStyle(word) {
      return {
        fontFamily: `"${String(word.fontFamily).replace(/"/g, '')}"`,
        fontWeight: 400,
      }
    },
  },
}
</script>

<style>
.teacher-quran-ayah.teacher-quran-ayah {
  display: grid;
  gap: 0.45rem;
  margin: 0;
  font-family: inherit;
  font-weight: 400;
  font-synthesis: none;
  line-height: 2.15;
  letter-spacing: 0;
  text-align: start;
}

.teacher-quran-ayah--inline {
  display: block;
}

.teacher-quran-ayah__line {
  display: block;
  margin: 0;
  font-weight: 400;
  line-height: 2.2;
  text-align: start;
}

.teacher-quran-ayah__marker {
  display: inline-grid;
  min-width: 1.45rem;
  min-height: 1.45rem;
  margin-inline-end: 0.4rem;
  padding: 0 0.3rem;
  place-items: center;
  color: var(--teacher-accent-ink, inherit);
  border: 1px solid var(--teacher-line, currentColor);
  border-radius: 999px;
  font-family: var(--dash-font, inherit);
  font-size: 0.62rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  vertical-align: middle;
}

.teacher-quran-ayah__word {
  display: inline-block;
  margin: 0;
  padding: 0.02em 0.01em 0.04em;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: 0;
  white-space: nowrap;
  vertical-align: baseline;
}
</style>
