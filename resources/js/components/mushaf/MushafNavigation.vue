<template>
  <nav class="madani-mushaf-nav mushaf-navigation" :aria-label="ariaLabel">
    <button
      type="button"
      class="btn btn-outline-secondary madani-mushaf-nav__btn"
      :disabled="!canPrevious"
      :aria-label="previousLabel"
      @click="$emit('previous')"
    >
      <i class="bi" :class="isRtl ? 'bi-chevron-right' : 'bi-chevron-left'" aria-hidden="true" />
    </button>

    <div class="madani-mushaf-nav__center">
      <label class="visually-hidden" :for="inputId">{{ pageJumpLabel }}</label>
      <input
        :id="inputId"
        type="number"
        class="form-control form-control-sm madani-mushaf-nav__input"
        :min="1"
        :max="604"
        :value="pageNumber"
        @change="onJump"
        @keydown.enter.prevent="onJump"
      />
      <span class="madani-mushaf-nav__label" aria-live="polite">{{ paginationLabel }}</span>
    </div>

    <button
      type="button"
      class="btn btn-outline-secondary madani-mushaf-nav__btn"
      :disabled="!canNext"
      :aria-label="nextLabel"
      @click="$emit('next')"
    >
      <i class="bi" :class="isRtl ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true" />
    </button>
  </nav>
</template>

<script>
let navInputCounter = 0

export default {
  name: 'MushafNavigation',
  props: {
    pageNumber: { type: Number, default: 1 },
    paginationLabel: { type: String, default: '' },
    canPrevious: { type: Boolean, default: false },
    canNext: { type: Boolean, default: false },
    isRtl: { type: Boolean, default: true },
    ariaLabel: { type: String, default: 'Mushaf navigation' },
    previousLabel: { type: String, default: 'Previous page' },
    nextLabel: { type: String, default: 'Next page' },
    pageJumpLabel: { type: String, default: 'Jump to page' },
  },
  emits: ['previous', 'next', 'jump'],
  data() {
    navInputCounter += 1
    return { inputId: `madani-mushaf-page-jump-${navInputCounter}` }
  },
  methods: {
    onJump(event) {
      const value = Number(event.target?.value)
      if (!Number.isFinite(value)) return
      this.$emit('jump', Math.max(1, Math.min(604, Math.round(value))))
    },
  },
}
</script>
