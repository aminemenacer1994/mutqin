<template>
  <span
    class="qpc-madani-word"
    :data-location="word.location"
    :data-surah="word.surah"
    :data-ayah="word.ayah"
    :data-word="word.word"
    :data-page="word.page"
    :data-line="word.line"
    :data-word-id="word.id"
    :data-ayah-key="ayahKey || null"
    :data-ayah-state="ayahStateAttr"
    :class="wordClass"
    :style="{ fontFamily: `'${fontFamily}'` }"
    tabindex="0"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
  >{{ word.text }}</span>
</template>

<script>
import { ayahKeyFromWord, madaniWordVisualClass, resolveMadaniAyahVisualState } from '../../scripts/mushaf/qpcMadaniSelection'

export default {
  name: 'MadaniWord',
  emits: ['select'],
  props: {
    word: {
      type: Object,
      required: true,
    },
    fontFamily: {
      type: String,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    selection: {
      type: Object,
      default: null,
    },
  },
  computed: {
    ayahKey() {
      return ayahKeyFromWord(this.word)
    },
    visualState() {
      return resolveMadaniAyahVisualState(this.ayahKey, this.selection || {})
    },
    ayahStateAttr() {
      if (this.visualState.active) return 'active'
      return this.visualState.rangeRole || null
    },
    wordClass() {
      return {
        'is-selected': this.selected,
        ...madaniWordVisualClass(this.visualState),
      }
    },
  },
  methods: {
    onSelect() {
      this.$emit('select', this.word.location)
    },
  },
}
</script>

<style scoped>
.qpc-madani-word {
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  width: auto;
  height: auto;
  padding: 0.02em 0.01em;
  cursor: pointer;
  font-size: var(--qpc-word-size, 22px);
  font-weight: 400;
  line-height: 1.35;
  overflow: visible;
  white-space: nowrap;
  border-radius: 0.12em;
  touch-action: manipulation;
}

.qpc-madani-word:hover,
.qpc-madani-word:focus-visible {
  background: color-mix(in srgb, #c4a35a 16%, transparent);
  outline: none;
}

.qpc-madani-word.is-range-ayah {
  background: color-mix(in srgb, #c4a35a 9%, transparent);
}

.qpc-madani-word.is-range-start {
  box-shadow: inset -0.07em 0 0 color-mix(in srgb, #8d6a35 28%, transparent);
}

.qpc-madani-word.is-range-end {
  box-shadow: inset 0.07em 0 0 color-mix(in srgb, #8d6a35 28%, transparent);
}

.qpc-madani-word.is-ayah-active {
  background: color-mix(in srgb, #c4a35a 22%, transparent);
  box-shadow: inset 0 -0.08em 0 color-mix(in srgb, #8d6a35 38%, transparent);
}

.qpc-madani-word.is-playing-ayah {
  background: color-mix(in srgb, #4a90a4 11%, transparent);
}

.qpc-madani-word.is-playing-ayah.is-ayah-active {
  background: color-mix(in srgb, #4a90a4 16%, color-mix(in srgb, #c4a35a 14%, transparent));
}

.qpc-madani-word.highlighted,
.qpc-madani-word.phrase-highlighted {
  background: color-mix(in srgb, #4a90a4 26%, transparent);
  box-shadow: inset 0 -0.1em 0 color-mix(in srgb, #2d6a7a 42%, transparent);
}

.qpc-madani-word.is-selected:not(.is-ayah-active) {
  background: color-mix(in srgb, #c4a35a 18%, transparent);
}
</style>
