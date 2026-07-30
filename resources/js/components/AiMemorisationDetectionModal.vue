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
          <header class="amd-header amd-header--premium amd-header--compact">
            <div class="amd-header-copy">
              <div class="amd-title-row">
                <h2 id="amdModalTitle" class="amd-title amd-title--premium">{{ title }}</h2>
                <span
                  v-if="betaBadge"
                  class="amd-beta-badge"
                  :title="disclaimer || undefined"
                >{{ betaBadge }}</span>
              </div>
              <p v-if="rangeLabel" class="amd-range amd-range--premium">{{ rangeLabel }}</p>
              <p v-if="disclaimer" class="amd-disclaimer amd-disclaimer--compact">{{ disclaimer }}</p>
            </div>
            <div class="amd-header-aside">
              <div
                class="amd-mic-status amd-mic-status--header amd-mic-status--compact"
                :data-status="micStatusKey"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                :title="disclaimer || undefined"
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

          <div class="amd-body amd-body--premium amd-body--compact">
            <div
              v-if="!isComplete"
              class="amd-toolbar amd-toolbar--icons amd-toolbar--tools"
              role="toolbar"
              :aria-label="toolsLabel"
            >
              <div class="amd-tool-cell">
                <button
                  type="button"
                  class="amd-tool-btn"
                  :class="{ active: peeking }"
                  :disabled="isComplete"
                  :aria-pressed="peeking ? 'true' : 'false'"
                  :aria-label="peekLabel"
                  :title="peekHintLabel || peekLabel"
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
                  <span class="amd-tool-btn__name">{{ peekShortLabel }}</span>
                </button>
                <span class="amd-tool-cell__hint">{{ peekHintShortLabel }}</span>
              </div>

              <div class="amd-tool-cell">
                <label class="visually-hidden" :for="difficultyId">{{ wordsShownLabel }}</label>
                <div class="amd-tool-btn amd-tool-btn--select">
                  <select
                    :id="difficultyId"
                    class="amd-tool-select"
                    :value="difficulty"
                    :aria-label="wordsShownLabel"
                    :title="wordsShownLabel"
                    @change="onDifficultyChange"
                  >
                    <option
                      v-for="pct in difficultyOptions"
                      :key="pct"
                      :value="pct"
                    >{{ formatShownPercent(pct) }}</option>
                  </select>
                </div>
                <span class="amd-tool-cell__hint">{{ wordsShownShortLabel }}</span>
              </div>

              <div class="amd-tool-cell">
                <div class="amd-tool-btn amd-tool-btn--size" role="group" :aria-label="textSizeLabel">
                  <button
                    type="button"
                    class="amd-tool-seg"
                    :aria-label="textSizeDecreaseLabel"
                    :title="textSizeDecreaseLabel"
                    :disabled="fontScale <= minFontScale"
                    @click.stop="decreaseFontScale"
                  >
                    <span aria-hidden="true">A−</span>
                  </button>
                  <button
                    type="button"
                    class="amd-tool-seg"
                    :aria-label="textSizeIncreaseLabel"
                    :title="textSizeIncreaseLabel"
                    :disabled="fontScale >= maxFontScale"
                    @click.stop="increaseFontScale"
                  >
                    <span aria-hidden="true">A+</span>
                  </button>
                </div>
                <span class="amd-tool-cell__hint">{{ textSizeShortLabel }}</span>
              </div>

              <div v-if="canStop" class="amd-tool-cell amd-tool-cell--stop">
                <button
                  type="button"
                  class="amd-tool-btn amd-tool-btn--stop"
                  :class="{ active: isListening }"
                  :aria-label="stopLabel"
                  :title="stopLabel"
                  @click.stop="$emit('stop')"
                >
                  <i class="bi bi-stop-fill" aria-hidden="true"></i>
                  <span class="amd-tool-btn__name">{{ stopLabel }}</span>
                </button>
                <span class="amd-tool-cell__hint">{{ stopLabel }}</span>
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
                :style="{ '--amd-font-scale': fontScale }"
              ></div>
            </div>

            <div v-if="isReady && !isComplete && !isError" class="amd-start-wrap amd-start-wrap--inline">
              <button
                type="button"
                class="amd-record-btn amd-record-btn--inline"
                :class="{ 'is-busy': busy }"
                :aria-label="startLabel"
                :title="startHint || startLabel"
                :disabled="busy"
                @click.stop="$emit('start')"
              >
                <span class="amd-record-btn__core" aria-hidden="true">
                  <i class="bi bi-mic-fill"></i>
                </span>
                <strong class="amd-record-btn__label">{{ startLabel }}</strong>
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
    title: { type: String, default: 'Check your memorisation' },
    rangeLabel: { type: String, default: '' },
    betaBadge: { type: String, default: 'Beta' },
    disclaimer: { type: String, default: '' },
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
    toolsLabel: { type: String, default: 'Memorisation tools' },
    blurLabel: { type: String, default: 'Blur' },
    peekLabel: { type: String, default: 'Peek' },
    stopLabel: { type: String, default: 'Stop' },
    startLabel: { type: String, default: 'Start recording' },
    startHint: { type: String, default: 'Tap the red button, then recite from memory' },
    resetLabel: { type: String, default: 'Reset' },
    peekHintLabel: { type: String, default: 'Need a hint? Peek at the text' },
    difficultyLabel: { type: String, default: 'Difficulty' },
    wordsShownLabel: { type: String, default: 'Words shown' },
    textSizeLabel: { type: String, default: 'Text size' },
    textSizeIncreaseLabel: { type: String, default: 'Increase text size' },
    textSizeDecreaseLabel: { type: String, default: 'Decrease text size' },
    peekHintShort: { type: String, default: 'Hold to reveal' },
    wordsShownShort: { type: String, default: 'Words shown' },
    textSizeShort: { type: String, default: 'Text size' },
    completeTitle: { type: String, default: 'Mā shā’ Allāh — check complete' },
    completeBody: { type: String, default: 'You recalled this range successfully.' },
    sessionEndedLabel: { type: String, default: 'Session complete' },
    sessionEndedBody: { type: String, default: 'Returning to your next-step plan…' },
    testAgainLabel: { type: String, default: 'Check again' },
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
      fontScale: 1.12,
      minFontScale: 0.9,
      maxFontScale: 1.45,
      themeAttr: 'light',
      _themeObserver: null,
    }
  },
  computed: {
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
    peekShortLabel() {
      return this.peekLabel || 'Peek'
    },
    peekHintShortLabel() {
      return this.peekHintShort || 'Hold to reveal'
    },
    wordsShownShortLabel() {
      return this.wordsShownShort || 'Words shown'
    },
    textSizeShortLabel() {
      return this.textSizeShort || 'Text size'
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
        this.syncThemeAttr()
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
  mounted() {
    this.syncThemeAttr()
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this._themeObserver = new MutationObserver(() => this.syncThemeAttr())
      this._themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })
    }
  },
  beforeUnmount() {
    if (this._htmlSyncTimer) {
      clearTimeout(this._htmlSyncTimer)
      this._htmlSyncTimer = null
    }
    if (this._themeObserver) {
      this._themeObserver.disconnect()
      this._themeObserver = null
    }
    this.onPeekEnd()
  },
  methods: {
    syncThemeAttr() {
      if (typeof document === 'undefined') {
        this.themeAttr = 'light'
        return
      }
      this.themeAttr = document.documentElement.getAttribute('data-theme') || 'light'
    },
    formatShownPercent(hidePercent) {
      const hide = Number(hidePercent)
      const shown = hide === 100 ? 0 : Math.max(0, 100 - hide)
      return `${shown}%`
    },
    increaseFontScale() {
      this.fontScale = Math.min(this.maxFontScale, Math.round((this.fontScale + 0.08) * 100) / 100)
    },
    decreaseFontScale() {
      this.fontScale = Math.max(this.minFontScale, Math.round((this.fontScale - 0.08) * 100) / 100)
    },
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
