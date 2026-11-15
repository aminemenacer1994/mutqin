<template>
  <Teleport to="body">
    <template v-if="open">
      <div class="modal-backdrop fade show teacher-dialog-backdrop" @click="onBackdrop"></div>
      <div
        ref="root"
        class="modal fade show d-block teacher-dialog"
        :class="{ 'is-compact': compact }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div class="modal-dialog modal-dialog-centered" :class="dialogClass">
          <div class="modal-content">
            <div v-if="compact" class="modal-header teacher-dialog__header is-inline">
              <h2 :id="titleId" class="modal-title h6 mb-0">{{ title }}</h2>
              <div v-if="hasPills" class="teacher-dialog__pills">
                <slot name="pills" />
              </div>
              <button type="button" class="btn-close" :aria-label="closeLabel" @click="$emit('close')"></button>
            </div>
            <div v-else class="modal-header align-items-start">
              <div class="min-w-0">
                <p v-if="eyebrow" class="text-body-secondary small text-uppercase mb-1">{{ eyebrow }}</p>
                <h2 :id="titleId" class="modal-title h5 mb-0">{{ title }}</h2>
                <div v-if="hasPills" class="d-flex flex-wrap gap-1 mt-2">
                  <slot name="pills" />
                </div>
              </div>
              <button type="button" class="btn-close" :aria-label="closeLabel" @click="$emit('close')"></button>
            </div>
            <div class="modal-body">
              <slot />
            </div>
            <div v-if="hasFooter" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </Teleport>
</template>

<script>
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'

let dialogUid = 0

export default {
  name: 'TeacherDialog',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    eyebrow: { type: String, default: '' },
    size: { type: String, default: 'lg' },
    closeLabel: { type: String, default: 'Close' },
    closeOnBackdrop: { type: Boolean, default: true },
    compact: { type: Boolean, default: false },
  },
  emits: ['close'],
  data() {
    dialogUid += 1
    return {
      titleId: `teacher-dialog-title-${dialogUid}`,
      returnFocusEl: null,
    }
  },
  computed: {
    dialogClass() {
      if (this.size === 'sm') return 'modal-sm'
      if (this.size === 'xl') return 'modal-xl'
      if (this.size === 'md') return ''
      return 'modal-lg'
    },
    hasPills() {
      return Boolean(this.$slots.pills)
    },
    hasFooter() {
      return Boolean(this.$slots.footer)
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (typeof document === 'undefined') return
        document.body.classList.toggle('modal-open', value)
        if (value) {
          this.returnFocusEl = captureReturnFocus()
          this.$nextTick(() => this.$refs.root?.focus({ preventScroll: true }))
        } else if (this.returnFocusEl) {
          const target = this.returnFocusEl
          this.returnFocusEl = null
          this.$nextTick(() => restoreReturnFocus(target))
        }
      },
    },
  },
  beforeUnmount() {
    if (typeof document !== 'undefined') document.body.classList.remove('modal-open')
    restoreReturnFocus(this.returnFocusEl)
  },
  methods: {
    onBackdrop() {
      if (this.closeOnBackdrop) this.$emit('close')
    },
    onKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.root,
        open: this.open,
        onEscape: () => this.$emit('close'),
      })
    },
  },
}
</script>
