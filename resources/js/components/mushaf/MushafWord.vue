<template>
  <span
    class="madani-mushaf-word madani-word"
    :class="wordClasses"
    :data-verse-key="word.verseKey"
    :data-word-index="word.wordIndex != null ? word.wordIndex : null"
    :data-word-id="word.id"
    :data-practice-focus="word.isPracticeFocus ? 'true' : null"
    :title="word.meaningLabel || null"
    :style="wordStyle"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? (word.inSession === false ? -1 : 0) : undefined"
    :lang="'ar'"
    :dir="word.useGlyph ? 'ltr' : 'rtl'"
    @click.stop="onClick"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    @touchcancel.passive="$emit('touch-cancel')"
    @keydown.enter.prevent="onClick"
    @keydown.space.prevent="onClick"
    v-html="wordHtml"
  />
</template>

<script>
export default {
  name: 'MushafWord',
  props: {
    word: { type: Object, required: true },
    fontFamily: { type: String, default: '' },
    interactive: { type: Boolean, default: true },
  },
  emits: ['select', 'peek-enter', 'peek-leave', 'touch-start', 'touch-end', 'touch-cancel'],
  computed: {
    wordClasses() {
      const w = this.word || {}
      const status = w.recitationStatus ? `recitation-word-${w.recitationStatus}` : ''
      return {
        'madani-word--end': !!w.isEnd,
        'madani-word--glyph': !!w.useGlyph,
        'madani-word--fallback': !!w.isFallbackGlyph,
        'madani-word--unicode': !w.useGlyph && !w.isFallbackGlyph && !w.isEnd,
        'madani-word--hidden': !!w.isHidden,
        'madani-word--hidden-width': !!w.isHidden && !!w.preserveWidth,
        'madani-word--out': w.inSession === false,
        active: !!w.isActive,
        highlighted: !!w.isHighlighted,
        'is-playing': !!w.isPlayingAyah,
        'blur-upcoming': !!w.isBlurred,
        'peek-revealed': !!w.isPeekRevealed,
        'anchor-highlight': !!w.isAnchor,
        'is-focus-dim': !!w.isFocusDimmed,
        'practice-focus-word': !!w.isPracticeFocus,
        'ai-recitation-active': !!w.hasAiReview,
        [status]: !!status,
        ...(w.extraClasses || {}),
      }
    },
    wordHtml() {
      return this.word?.html || ''
    },
    wordStyle() {
      if (this.fontFamily && (this.word?.useGlyph || this.word?.isFallbackGlyph)) {
        return { fontFamily: `'${this.fontFamily}'` }
      }
      return null
    },
  },
  methods: {
    onClick() {
      if (!this.interactive || this.word?.inSession === false) return
      this.$emit('select', this.word)
    },
    onEnter() {
      if (!this.interactive || this.word?.inSession === false) return
      this.$emit('peek-enter', this.word)
    },
    onLeave() {
      this.$emit('peek-leave', this.word)
    },
    onTouchStart(event) {
      this.$emit('touch-start', event, this.word)
    },
    onTouchEnd(event) {
      this.$emit('touch-end', event, this.word)
    },
  },
}
</script>
