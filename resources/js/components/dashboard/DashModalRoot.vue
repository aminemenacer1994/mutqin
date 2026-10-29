<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="rootEl"
      class="dash-modal-root user-dashboard"
      :class="rootClass"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy || undefined"
      :aria-label="labelledBy ? undefined : ariaLabel"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div
        class="dash-modal__backdrop"
        aria-hidden="true"
        @click="onBackdropClick"
      ></div>
      <div ref="panelEl" class="dash-modal" :class="panelClass">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  captureReturnFocus,
  handleModalKeydown,
  restoreReturnFocus,
} from '../../utils/modalFocus.js'

export default {
  name: 'DashModalRoot',
  props: {
    open: { type: Boolean, default: false },
    labelledBy: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    rootClass: { type: [String, Object, Array], default: '' },
    panelClass: { type: [String, Object, Array], default: '' },
    closeOnBackdrop: { type: Boolean, default: true },
    closeOnEscape: { type: Boolean, default: true },
  },
  emits: ['close'],
  data() {
    return {
      returnFocusEl: null,
    }
  },
  watch: {
    open(value) {
      if (value) {
        this.returnFocusEl = captureReturnFocus(this.$refs.panelEl)
        this.lockScroll(true)
      } else {
        this.lockScroll(false)
        restoreReturnFocus(this.returnFocusEl)
        this.returnFocusEl = null
      }
    },
  },
  beforeUnmount() {
    this.lockScroll(false)
    restoreReturnFocus(this.returnFocusEl)
  },
  methods: {
    panel() {
      return this.$refs.panelEl
    },
    onBackdropClick() {
      if (this.closeOnBackdrop) this.$emit('close')
    },
    onKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.panelEl,
        open: this.open,
        onEscape: this.closeOnEscape ? () => this.$emit('close') : undefined,
      })
    },
    lockScroll(locked) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-drawer-open', locked)
      document.body.classList.toggle('dash-drawer-open', locked)
      document.body.classList.toggle('modal-open', locked)
    },
  },
}
</script>
