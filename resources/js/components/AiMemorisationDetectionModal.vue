<template>
  <Teleport to="body">
    <div
      v-show="open"
      class="modal-overlay mutqin-modal-overlay amd-overlay"
      :data-theme="themeAttr"
      @click.self="onCancel"
      @keydown.esc.stop.prevent="onCancel"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--full amd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="amdModalTitle"
      >
        <div class="modal-content mutqin-modal-surface amd-modal amd-modal--mushaf amd-modal--test amd-modal--premium">
          <header class="amd-header amd-header--premium">
            <div class="amd-header-copy">
              <p v-if="rangeLabel" class="amd-range amd-range--premium">{{ rangeLabel }}</p>
              <h2 id="amdModalTitle" class="amd-title amd-title--premium">{{ title }}</h2>
            </div>
            <div class="amd-header-aside">
              <div
                class="amd-mic-status amd-mic-status--header"
                :data-status="micStatusKey"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span class="amd-mic-dot" aria-hidden="true"></span>
                <span class="amd-mic-status__label">{{ micStatusLabel }}</span>
              </div>
              <button
                class="amd-icon-btn amd-icon-btn--close"
                type="button"
                :aria-label="closeLabel"
                @click.stop="onCancel"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          </header>

          <div class="amd-body amd-body--premium">
            <div class="amd-toolbar amd-toolbar--icons" role="toolbar" :aria-label="toolsLabel">
              <button
                type="button"
                class="amd-icon-btn"
                :class="{ active: blurActive }"
                :aria-pressed="blurActive ? 'true' : 'false'"
                :aria-label="blurLabel"
                :title="blurLabel"
                @click.stop="$emit('toggle-blur')"
              >
                <i class="bi" :class="blurActive ? 'bi-eye-slash' : 'bi-eye'" aria-hidden="true"></i>
              </button>

              <button
                type="button"
                class="amd-icon-btn amd-icon-btn--peek"
                :class="{ active: peeking }"
                :disabled="isComplete"
                :aria-pressed="peeking ? 'true' : 'false'"
                :aria-label="peekLabel"
                :title="peekLabel"
                @mousedown.prevent="onPeekStart"
                @mouseup.prevent="onPeekEnd"
                @mouseleave="onPeekEnd"
                @touchstart.prevent="onPeekStart"
                @touchend.prevent="onPeekEnd"
                @touchcancel="onPeekEnd"
                @keydown.space.prevent="onPeekStart"
                @keydown.enter.prevent="onPeekStart"
                @keyup.space.prevent="onPeekEnd"
                @keyup.enter.prevent="onPeekEnd"
                @blur="onPeekEnd"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>

              <button
                type="button"
                class="amd-icon-btn amd-icon-btn--stop"
                :class="{ active: isListening }"
                :disabled="!canStop"
                :aria-label="stopLabel"
                :title="stopLabel"
                @click.stop="$emit('stop')"
              >
                <i class="bi bi-stop-fill" aria-hidden="true"></i>
              </button>

              <button
                type="button"
                class="amd-icon-btn"
                :aria-label="resetLabel"
                :title="resetLabel"
                :disabled="busy && !isComplete && !isError"
                @click.stop="$emit('reset')"
              >
                <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
              </button>

              <div class="amd-difficulty amd-difficulty--icon">
                <label class="visually-hidden" :for="difficultyId">{{ difficultyLabel }}</label>
                <select
                  :id="difficultyId"
                  class="amd-difficulty__select amd-difficulty__select--compact"
                  :value="difficulty"
                  :aria-label="difficultyLabel"
                  :title="difficultyLabel"
                  @change="onDifficultyChange"
                >
                  <option
                    v-for="pct in difficultyOptions"
                    :key="pct"
                    :value="pct"
                  >{{ pct }}%</option>
                </select>
              </div>
            </div>

            <div
              class="amd-mushaf-shell amd-mushaf-shell--premium"
              :class="{
                'is-blur-active': blurActive && !peeking && !isComplete,
                'is-gap-mask': !blurActive && !peeking && !isComplete,
                'is-peeking': peeking && !isComplete,
                'is-listening': isListening,
                'is-ready': isReady,
                'is-complete': isComplete,
              }"
              dir="rtl"
              lang="ar"
            >
              <div
                ref="mushafSurface"
                class="amd-mushaf-ayah amd-mushaf-ayah--premium"
                :class="{ 'tajweed-enabled': tajweed }"
              ></div>
            </div>

            <div v-if="isReady && !isComplete && !isError" class="amd-start-wrap">
              <button
                type="button"
                class="amd-start-cta"
                :aria-label="startLabel"
                :title="startLabel"
                :disabled="busy"
                @click.stop="$emit('start')"
              >
                <span class="amd-start-cta__icon" aria-hidden="true">
                  <i class="bi bi-mic-fill"></i>
                </span>
                <span class="amd-start-cta__copy">
                  <strong class="amd-start-cta__title">{{ startLabel }}</strong>
                  <small v-if="startHint" class="amd-start-cta__hint">{{ startHint }}</small>
                </span>
              </button>
            </div>

            <section
              v-if="endingSoon"
              class="amd-complete amd-complete--handoff"
              aria-hidden="true"
            >
              <span class="amd-complete__spinner" aria-hidden="true"></span>
            </section>

            <section
              v-else-if="isComplete"
              class="amd-complete amd-complete--premium"
              role="status"
              aria-live="assertive"
              aria-atomic="true"
            >
              <p class="amd-complete__title">{{ completeTitle }}</p>
              <p class="amd-complete__body">{{ completeBody }}</p>
              <div class="amd-complete__actions">
                <button type="button" class="btn-secondary" @click.stop="$emit('test-again')">
                  {{ testAgainLabel }}
                </button>
                <button type="button" class="btn-primary" @click.stop="$emit('done')">
                  {{ doneLabel }}
                </button>
              </div>
            </section>

            <section v-else-if="isError || showInlineError" class="amd-inline-error" role="alert">
              <p>{{ error || genericError }}</p>
              <button
                v-if="errorAction === 'enable-mic'"
                type="button"
                class="btn-primary"
                @click.stop="$emit('enable-mic')"
              >{{ enableMicLabel }}</button>
              <button
                v-else
                type="button"
                class="btn-secondary"
                @click.stop="$emit('retry')"
              >{{ tryAgainLabel }}</button>
            </section>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'AiMemorisationDetectionModal',
  props: {
    open: { type: Boolean, default: false },
    stage: { type: String, default: 'ready' },
    title: { type: String, default: 'Test your memorisation' },
    rangeLabel: { type: String, default: '' },
    micStatus: { type: String, default: 'ready' },
    micStatusLabel: { type: String, default: 'Ready' },
    micGuidance: { type: String, default: '' },
    ayahHtml: { type: String, default: '' },
    blurActive: { type: Boolean, default: true },
    peeking: { type: Boolean, default: false },
    tajweed: { type: Boolean, default: false },
    difficulty: { type: Number, default: 100 },
    difficultyOptions: {
      type: Array,
      default: () => [25, 50, 75, 100],
    },
    error: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    endingSoon: { type: Boolean, default: false },
    errorAction: { type: String, default: 'retry' },
    closeLabel: { type: String, default: 'Close' },
    toolsLabel: { type: String, default: 'Test tools' },
    blurLabel: { type: String, default: 'Blur' },
    peekLabel: { type: String, default: 'Peek' },
    stopLabel: { type: String, default: 'Stop' },
    startLabel: { type: String, default: 'Start reciting' },
    startHint: { type: String, default: 'Tap once, then recite from memory' },
    resetLabel: { type: String, default: 'Reset' },
    difficultyLabel: { type: String, default: 'Difficulty' },
    completeTitle: { type: String, default: 'Mā shā’ Allāh — test complete' },
    completeBody: { type: String, default: 'You recalled this range successfully.' },
    sessionEndedLabel: { type: String, default: 'Session complete' },
    sessionEndedBody: { type: String, default: 'Returning to your next-step plan…' },
    testAgainLabel: { type: String, default: 'Test again' },
    doneLabel: { type: String, default: 'Done' },
    enableMicLabel: { type: String, default: 'Enable microphone' },
    tryAgainLabel: { type: String, default: 'Try again' },
    genericError: { type: String, default: 'Something went wrong. Please try again.' },
  },
  emits: [
    'cancel',
    'toggle-blur',
    'peek-start',
    'peek-end',
    'reset',
    'set-difficulty',
    'start',
    'stop',
    'test-again',
    'done',
    'retry',
    'enable-mic',
  ],
  data() {
    return {
      difficultyId: `amd-diff-${Math.random().toString(36).slice(2, 9)}`,
      _htmlSyncTimer: null,
      _peekKeyHeld: false,
    }
  },
  computed: {
    themeAttr() {
      if (typeof document === 'undefined') return 'light'
      return document.documentElement.getAttribute('data-theme') || 'light'
    },
    isComplete() {
      return this.stage === 'complete'
    },
    isError() {
      return this.stage === 'error'
    },
    isListening() {
      return this.stage === 'listening' || this.stage === 'starting'
    },
    isReady() {
      if (this.endingSoon || this.isComplete || this.isListening) return false
      if (this.stage === 'processing' || this.stage === 'analysing') return false
      return ['ready', 'idle', 'paused', 'error'].includes(String(this.stage || 'ready'))
    },
    canStop() {
      if (this.endingSoon || this.isComplete) return false
      return this.isListening || this.stage === 'processing' || this.stage === 'starting'
    },
    showInlineError() {
      return !!this.error && !this.isComplete
        && ['need_access', 'unsupported', 'unavailable', 'denied'].includes(this.micStatusKey)
    },
    micStatusKey() {
      const raw = String(this.micStatus || 'ready').toLowerCase()
      if (raw === 'granted' || raw === 'prompt' || raw === 'unknown') return 'ready'
      if (raw === 'denied') return 'need_access'
      if (raw === 'unsupported') return 'unavailable'
      return raw
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.$nextTick(() => this.scheduleMushafHtml(this.ayahHtml, true))
      } else {
        this.onPeekEnd()
      }
    },
    ayahHtml(html) {
      if (this.open) this.scheduleMushafHtml(html)
    },
    stage() {
      if (this.open) this.$nextTick(() => this.scheduleMushafHtml(this.ayahHtml, true))
    },
  },
  beforeUnmount() {
    if (this._htmlSyncTimer) {
      clearTimeout(this._htmlSyncTimer)
      this._htmlSyncTimer = null
    }
    this.onPeekEnd()
  },
  methods: {
    setMushafHtml(html = '') {
      this.scheduleMushafHtml(html)
    },
    patchWordStatuses(patches = []) {
      const el = this.$refs.mushafSurface
      if (!el || !Array.isArray(patches) || !patches.length) return false
      let changed = false
      for (const patch of patches) {
        const index = Number(patch?.index)
        if (!Number.isFinite(index)) continue
        const node = el.querySelector(`[data-recitation-word-index="${index}"]`)
        if (!node?.classList) continue
        const status = String(patch.status || 'notAttempted')
        ;['correct', 'partial', 'incorrect', 'omitted', 'notAttempted', 'pending'].forEach((name) => {
          node.classList.remove(`recitation-word-${name}`)
        })
        node.classList.add(`recitation-word-${status}`)
        // Prefer explicit mask flags — status may stay notAttempted (no colour paint).
        const shouldMask = patch.masked === true || patch.hidden === true
        if (shouldMask) {
          node.classList.add('amd-word-hidden')
          node.setAttribute('aria-hidden', 'true')
          node.setAttribute('data-masked', '1')
        } else {
          node.classList.remove('amd-word-hidden')
          node.removeAttribute('aria-hidden')
          node.removeAttribute('data-masked')
        }
        node.classList.toggle('amd-word-revealed', !!patch.revealed)
        node.classList.toggle('amd-word-current', !!patch.current)
        node.classList.toggle('amd-word-peeked', !!patch.peeked)
        changed = true
      }
      if (changed) this.scrollActiveIntoView(el)
      return changed
    },
    scheduleMushafHtml(html = '', immediate = false) {
      if (this._htmlSyncTimer) clearTimeout(this._htmlSyncTimer)
      // Keep live colouring snappy — only tiny coalesce while listening.
      const delay = immediate ? 0 : (this.stage === 'listening' ? 16 : 0)
      this._htmlSyncTimer = setTimeout(() => {
        this._htmlSyncTimer = null
        const el = this.$refs.mushafSurface
        if (!el) return
        const next = html || ''
        if (el.innerHTML === next) return
        el.innerHTML = next
        this.scrollActiveIntoView(el)
      }, delay)
    },
    scrollActiveIntoView(root) {
      if (typeof window === 'undefined') return
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      const active = root.querySelector('.amd-word-current, .amd-ayah-run.is-active, .amd-ayah-block.is-active')
      if (!active || typeof active.scrollIntoView !== 'function') return
      const shell = root.closest('.amd-mushaf-shell')
      if (!shell) return
      const shellRect = shell.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      const outside = activeRect.top < shellRect.top + 24 || activeRect.bottom > shellRect.bottom - 24
      if (!outside) return
      active.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'nearest',
      })
    },
    onCancel() {
      this.$emit('cancel')
    },
    onPeekStart() {
      if (this.isComplete) return
      this._peekKeyHeld = true
      this.$emit('peek-start')
    },
    onPeekEnd() {
      if (!this._peekKeyHeld && !this.peeking) return
      this._peekKeyHeld = false
      this.$emit('peek-end')
    },
    onDifficultyChange(event) {
      const value = Number(event?.target?.value)
      this.$emit('set-difficulty', value)
    },
  },
}
</script>
