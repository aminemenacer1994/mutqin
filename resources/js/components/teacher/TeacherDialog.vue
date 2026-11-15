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
        @mousedown.self="onBackdrop"
        @input="onDraftInput"
        @change="onDraftInput"
        @focusin="captureInput"
      >
        <div class="modal-dialog modal-dialog-centered" :class="dialogClass">
          <div class="modal-content">
            <div v-if="compact" class="modal-header teacher-dialog__header is-inline">
              <h2 :id="titleId" class="modal-title h6 mb-0">{{ title }}</h2>
              <div v-if="hasPills" class="teacher-dialog__pills">
                <slot name="pills" />
              </div>
              <button type="button" class="btn-close" :aria-label="closeLabel" :disabled="busy" @click="requestClose"></button>
            </div>
            <div v-else class="modal-header align-items-start">
              <div class="min-w-0">
                <p v-if="eyebrow" class="text-body-secondary small text-uppercase mb-1">{{ eyebrow }}</p>
                <h2 :id="titleId" class="modal-title h5 mb-0">{{ title }}</h2>
                <div v-if="hasPills" class="d-flex flex-wrap gap-1 mt-2">
                  <slot name="pills" />
                </div>
              </div>
              <button type="button" class="btn-close" :aria-label="closeLabel" :disabled="busy" @click="requestClose"></button>
            </div>
            <div v-if="confirmDiscard" class="teacher-dialog__discard" role="alert">
              <p>{{ t('teacher.unsaved_changes') }}</p>
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="keepEditing">{{ t('teacher.keep_editing') }}</button>
              <button type="button" class="btn btn-danger btn-sm" @click="$emit('close')">{{ t('teacher.discard_changes') }}</button>
            </div>
            <div class="modal-body" :aria-busy="busy ? 'true' : undefined">
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
import { i18nMixin } from '../../mixins/i18nMixin'

let dialogUid = 0
const openDialogs = new Set()

export default {
  name: 'TeacherDialog',
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    eyebrow: { type: String, default: '' },
    size: { type: String, default: 'lg' },
    closeLabel: { type: String, default: 'Close' },
    closeOnBackdrop: { type: Boolean, default: true },
    compact: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    dirty: { type: Boolean, default: null },
  },
  emits: ['close'],
  data() {
    dialogUid += 1
    return {
      titleId: `teacher-dialog-title-${dialogUid}`,
      returnFocusEl: null,
      confirmDiscard: false,
      inputSnapshot: new Map(),
      draftChanged: false,
      discardReturnFocus: null,
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
        if (value) {
          openDialogs.add(this.titleId)
          this.confirmDiscard = false
          this.draftChanged = false
          this.inputSnapshot.clear()
          this.returnFocusEl = captureReturnFocus()
          this.$nextTick(() => {
            const root = this.$refs.root
            if (root && !root.contains(document.activeElement)) root.focus({ preventScroll: true })
          })
        } else {
          openDialogs.delete(this.titleId)
        }
        document.body.classList.toggle('modal-open', openDialogs.size > 0)
        if (!value && this.returnFocusEl) {
          const target = this.returnFocusEl
          this.returnFocusEl = null
          this.$nextTick(() => restoreReturnFocus(target))
        }
      },
    },
  },
  beforeUnmount() {
    openDialogs.delete(this.titleId)
    if (typeof document !== 'undefined') document.body.classList.toggle('modal-open', openDialogs.size > 0)
    restoreReturnFocus(this.returnFocusEl)
  },
  methods: {
    onDraftInput(event) {
      const input = event.target
      if (!input?.matches?.('textarea, input:not([type="range"]), select') || input.closest('[data-dialog-transient]')) return
      if (!this.inputSnapshot.has(input)) this.inputSnapshot.set(input, input.defaultValue || '')
      this.draftChanged = true
    },
    captureInput(event) {
      const input = event.target
      if (input?.matches?.('textarea, input:not([type="range"]), select') && !this.inputSnapshot.has(input)) this.inputSnapshot.set(input, input.value)
    },
    requestClose() {
      if (this.busy) return
      const changed = this.draftChanged && [...this.inputSnapshot].some(([input, value]) => input.isConnected && input.value !== value)
      const recording = this.$refs.root?.querySelector('.teacher-voice-note.is-recorded, .teacher-voice-note__status, .teacher-task-conversation__recording')
      if (this.dirty ?? (changed || Boolean(recording))) {
        this.discardReturnFocus = document.activeElement
        this.confirmDiscard = true
        this.$nextTick(() => this.$refs.root?.querySelector('.teacher-dialog__discard button')?.focus())
        return
      }
      this.$emit('close')
    },
    keepEditing() {
      this.confirmDiscard = false
      this.$nextTick(() => {
        const target = this.discardReturnFocus
        if (target?.isConnected && this.$refs.root?.contains(target)) target.focus({ preventScroll: true })
        else this.$refs.root?.focus({ preventScroll: true })
      })
    },
    onBackdrop() {
      if (this.closeOnBackdrop) this.requestClose()
    },
    onKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.root,
        open: this.open,
        onEscape: () => { if (this.confirmDiscard) this.keepEditing(); else this.requestClose() },
      })
    },
  },
}
</script>
