<template>
  <Teleport to="body">
    <div
      v-if="open && workspace"
      class="modal-backdrop fade show teacher-dialog-backdrop"
      @click="onBackdropClick"
    ></div>
    <div
      v-if="open"
      ref="rootEl"
      class="dash-modal-root user-dashboard"
      :class="[rootClass, { 'modal fade show d-block teacher-dialog': workspace }]"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy || undefined"
      :aria-label="labelledBy ? undefined : ariaLabel"
      :data-testid="testId || undefined"
      tabindex="-1"
      @keydown="onKeydown"
      @mousedown.self="workspace && onBackdropClick()"
    >
      <div
        v-if="!workspace"
        class="dash-modal__backdrop"
        aria-hidden="true"
        @click="onBackdropClick"
      ></div>
      <div v-if="workspace" class="modal-dialog modal-dialog-centered modal-lg">
        <div ref="panelEl" class="dash-modal modal-content" :class="panelClass">
          <slot />
        </div>
      </div>
      <div v-else ref="panelEl" class="dash-modal" :class="panelClass">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  captureReturnFocus,
  handleModalKeydown,
  getFocusableElements,
  restoreReturnFocus,
} from '../../utils/modalFocus.js'
import { setModalScrollLock } from '../../utils/modalScrollLock.js'

export default {
  name: 'DashModalRoot',
  props: {
    open: { type: Boolean, default: false },
    workspace: { type: Boolean, default: false },
    labelledBy: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    rootClass: { type: [String, Object, Array], default: '' },
    panelClass: { type: [String, Object, Array], default: '' },
    testId: { type: String, default: '' },
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
    open: { immediate: true, handler(value) {
      if (value) {
        this.returnFocusEl = captureReturnFocus(this.$refs.panelEl)
        this.lockScroll(true)
        this.$nextTick(() => {
          const panel = this.$refs.panelEl
          if (!this.open || !panel || panel.contains(document.activeElement)) return
          const first = getFocusableElements(panel)[0] || this.$refs.rootEl
          first?.focus({ preventScroll: true })
        })
      } else {
        this.lockScroll(false)
        restoreReturnFocus(this.returnFocusEl)
        this.returnFocusEl = null
      }
    } },
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
      setModalScrollLock(this, locked, { dashboard: true })
    },
  },
}
</script>
