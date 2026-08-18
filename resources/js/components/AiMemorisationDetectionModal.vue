<template>
  <Teleport to="body">
    <div
      v-show="open"
      ref="overlay"
      class="modal-overlay mutqin-modal-overlay amd-overlay"
      :data-theme="themeAttr"
      @click.self="onCancel"
      @keydown="onOverlayKeydown"
    >
      <div
        ref="dialog"
        class="modal-dialog modal-dialog-centered mutqin-modal-dialog mutqin-modal-dialog--wide amd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="amdModalTitle"
      >
        <div class="modal-content mutqin-modal-surface amd-modal amd-modal--mushaf amd-modal--test amd-modal--premium">
          <header class="amd-header amd-header--premium amd-header--sticky">
            <div class="amd-header-copy">
              <div class="amd-title-row">
                <h2 id="amdModalTitle" class="amd-title amd-title--premium" tabindex="-1">{{ title }}</h2>
                <span
                  v-if="betaBadge"
                  class="amd-beta-badge"
                  :title="disclaimer || undefined"
                >{{ betaBadge }}</span>
              </div>
              <p v-if="rangeLabel" class="amd-range amd-range--premium">{{ rangeLabel }}</p>
              <p v-if="disclaimer" class="amd-disclaimer amd-disclaimer--row">{{ disclaimer }}</p>
            </div>
            <div class="amd-header-aside">
              <div
                class="amd-mic-status amd-mic-status--header"
                :class="{
                  'amd-mic-status--recording': isListening,
                  'amd-mic-status--starting': isStarting,
                }"
                :data-status="micStatusKey"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                :title="disclaimer || undefined"
              >
                <span class="amd-mic-dot" aria-hidden="true"></span>
                <span class="amd-mic-status__label">{{ displayMicStatusLabel }}</span>
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

          <div class="amd-body amd-body--premium amd-body--scroll">
            <div v-if="!isComplete" class="amd-tools-container">
              <div
                class="amd-toolbar amd-toolbar--icons amd-toolbar--tools amd-tools-bar"
                role="toolbar"
                :aria-label="toolsLabel"
              >
                <button
                  type="button"
                  class="amd-tools-bar__btn"
                  :class="{ 'is-active': peeking }"
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
                </button>

                <label class="amd-tools-bar__shown" :for="difficultyId" :title="wordsShownLabel">
                  <span class="visually-hidden">{{ wordsShownLabel }}</span>
                  <select
                    :id="difficultyId"
                    class="amd-tools-bar__select"
                    :value="selectedShownPercent"
                    :aria-label="wordsShownLabel"
                    @change="onDifficultyChange"
                  >
                    <option
                      v-for="shown in shownPercentOptions"
                      :key="`shown-${shown}`"
                      :value="shown"
                    >{{ shown }}%</option>
                  </select>
                </label>

                <div
                  class="amd-tools-bar__timer"
                  role="timer"
                  :aria-label="elapsedTimerLabel"
                  :title="elapsedTimerHint || elapsedTimerLabel"
                  :data-running="isListening ? 'true' : 'false'"
                >
                  <i class="bi bi-stopwatch" aria-hidden="true"></i>
                  <span class="amd-tools-bar__timer-value">{{ elapsedLabel }}</span>
                </div>
              </div>
            </div>

            <div
              ref="mushafShell"
              class="amd-mushaf-shell amd-mushaf-shell--premium amd-mushaf-shell--primary"
              :class="{
                'is-blur-active': blurActive && !peeking && keepVisibilityMask,
                'is-gap-mask': !blurActive && !peeking && keepVisibilityMask,
                'is-peeking': peeking && keepVisibilityMask,
                'is-listening': isListening,
                'is-ready': isReady,
                'is-complete': isComplete,
                'is-mistake-flash': mistakeVisualActive,
              }"
              dir="rtl"
              lang="ar"
              @scroll.passive="onMushafShellScroll"
            >
              <div
                v-if="mistakeVisualActive"
                class="amd-mistake-visual"
                role="status"
                aria-live="polite"
              >
                <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                <span class="amd-mistake-visual__label">{{ mistakeVisualLabel }}</span>
              </div>
              <div
                ref="mushafSurface"
                class="amd-mushaf-ayah amd-mushaf-ayah--premium"
                :style="{ '--amd-font-scale': fontScale }"
                @click="onMushafWordClick"
              ></div>
              <div
                v-if="showAyahEmptyState"
                class="amd-ayah-empty"
                role="status"
              >
                <strong>{{ emptyAyahTitle }}</strong>
                <p>{{ emptyAyahDesc }}</p>
              </div>
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
              class="amd-complete amd-complete--premium amd-complete--body"
              role="status"
              aria-live="assertive"
              aria-atomic="true"
            >
              <p class="amd-complete__title">{{ completeTitle }}</p>
              <p class="amd-complete__body">{{ completeBody }}</p>
            </section>

            <section
              v-else-if="isError || showInlineError"
              class="amd-inline-error amd-inline-error--body"
              role="alert"
            >
              <p>{{ displayErrorMessage }}</p>
            </section>
          </div>

          <footer class="amd-footer amd-footer--sticky" data-amd-footer>
            <div class="amd-footer__inner">
              <div
                v-if="isReady && !isComplete && !isError && !showInlineError"
                class="amd-start-wrap amd-start-wrap--inline amd-start-wrap--footer"
              >
                <button
                  type="button"
                  class="amd-record-btn amd-record-btn--inline"
                  :class="{ 'is-busy': busy }"
                  :aria-label="startLabel"
                  :title="startHint || startLabel"
                  :disabled="busy"
                  :aria-busy="busy ? 'true' : 'false'"
                  @click.stop="onStart"
                >
                  <span class="amd-record-btn__core" aria-hidden="true">
                    <i class="bi bi-mic-fill"></i>
                  </span>
                  <strong class="amd-record-btn__label">{{ startLabel }}</strong>
                </button>
              </div>

              <div v-else-if="canStop" class="amd-footer__stop">
                <button
                  type="button"
                  class="amd-record-btn amd-record-btn--inline amd-record-btn--stop"
                  :class="{
                    active: isListening,
                    'is-busy': endingSoon || isProcessing,
                  }"
                  :aria-label="stopActionLabel"
                  :title="stopActionLabel"
                  :disabled="endingSoon || isProcessing"
                  :aria-busy="endingSoon || isProcessing ? 'true' : 'false'"
                  @click.stop="onStop"
                >
                  <span class="amd-record-btn__core" aria-hidden="true">
                    <i class="bi bi-stop-fill"></i>
                  </span>
                  <strong class="amd-record-btn__label">{{ stopActionLabel }}</strong>
                </button>
              </div>

              <div v-else-if="isComplete" class="amd-complete__actions amd-complete__actions--footer">
                <button type="button" class="btn-secondary" @click.stop="$emit('test-again')">
                  {{ testAgainLabel }}
                </button>
                <button type="button" class="btn-primary" @click.stop="$emit('done')">
                  {{ doneLabel }}
                </button>
              </div>

              <div v-else-if="isError || showInlineError" class="amd-footer__error-actions">
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
              </div>

              <div v-else class="amd-footer__spacer" aria-hidden="true"></div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  createLiveAutoFollowController,
  prefersReducedMotion,
  readStoredAutoFollowEnabled,
} from '../scripts/memorisationDetection/liveAutoFollow'

const AMD_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

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
    liveHint: { type: String, default: '' },
    recordingActiveLabel: { type: String, default: 'Recording' },
    ayahHtml: { type: String, default: '' },
    blurActive: { type: Boolean, default: true },
    peeking: { type: Boolean, default: false },
    difficulty: { type: Number, default: 100 },
    difficultyOptions: {
      type: Array,
      default: () => [10, 25, 50, 75, 100],
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
    elapsedLabel: { type: String, default: '00:00' },
    elapsedTimerLabel: { type: String, default: 'Recitation time' },
    elapsedTimerHint: { type: String, default: 'How long this recitation has taken' },
    theme: { type: String, default: '' },
    mistakeVisualActive: { type: Boolean, default: false },
    mistakeVisualLabel: { type: String, default: 'Mistake confirmed' },
    autoFollowLabel: { type: String, default: 'Auto-follow' },
    autoFollowOnLabel: { type: String, default: 'Auto-follow on' },
    autoFollowOffLabel: { type: String, default: 'Auto-follow off' },
    autoFollowPausedLabel: { type: String, default: 'Auto-follow paused' },
    autoFollowResumeLabel: { type: String, default: 'Resume auto-follow' },
    autoFollowHint: { type: String, default: 'Keep the active word near eye level' },
    completeTitle: { type: String, default: 'Mā shā’ Allāh — check complete' },
    completeBody: { type: String, default: 'You recalled this range successfully.' },
    sessionEndedLabel: { type: String, default: 'Session complete' },
    sessionEndedBody: { type: String, default: 'Returning to your next-step plan…' },
    testAgainLabel: { type: String, default: 'Check again' },
    doneLabel: { type: String, default: 'Done' },
    enableMicLabel: { type: String, default: 'Enable microphone' },
    tryAgainLabel: { type: String, default: 'Try again' },
    genericError: { type: String, default: 'Something went wrong. Please try again.' },
    emptyAyahTitle: { type: String, default: 'Ayah text not ready' },
    emptyAyahDesc: { type: String, default: 'We could not show the ayah for this check. Close and try again.' },
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
      _lastMushafHtml: '',
      _peekKeyHeld: false,
      fontScale: 1.12,
      minFontScale: 0.9,
      maxFontScale: 1.45,
      themeAttr: 'light',
      _themeObserver: null,
      _returnFocusEl: null,
      autoFollowEnabled: true,
      autoFollowPaused: false,
      _autoFollow: null,
      _activeWordIndex: null,
      _shellResizeObserver: null,
      _orientationHandler: null,
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
    isStarting() {
      return this.stage === 'starting'
    },
    isProcessing() {
      const stage = String(this.stage || '')
      return stage === 'processing' || stage === 'analysing'
    },
    // Keep gap/blur mask chrome through idle → record → stop → processing.
    // Never drop presentation classes on stage changes (that flashes full text).
    keepVisibilityMask() {
      if (this.endingSoon || this.isProcessing) return true
      return !this.isComplete
    },
    isReady() {
      if (this.endingSoon || this.isComplete || this.isListening) return false
      if (this.isProcessing) return false
      return ['ready', 'idle', 'paused', 'error'].includes(String(this.stage || 'ready'))
    },
    showAyahEmptyState() {
      if (this.endingSoon || this.isComplete) return false
      if (this.isListening || this.isStarting) return false
      const html = String(this.ayahHtml || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim()
      return !html
    },
    displayErrorMessage() {
      const text = String(this.error || '').trim()
      if (!text) return this.genericError
      if (
        text.length > 180
        || /stack|exception|traceback|sqlstate|http\/|status code|econn|enotfound|undefined is not|cannot read/i.test(text)
        || /[{}\[\]]/.test(text)
      ) {
        return this.genericError
      }
      return text
    },
    canStop() {
      if (this.endingSoon || this.isComplete) return false
      // Keep Stop visible while listening/starting; Processing uses the handoff spinner.
      return this.isListening
    },
    displayMicStatusLabel() {
      if (this.isProcessing || this.endingSoon) {
        return this.liveHint || 'Processing…'
      }
      // Record → Recording immediately (starting + listening). Keep one status pill only.
      if (this.stage === 'listening' || this.isStarting) {
        return this.recordingActiveLabel || this.micStatusLabel || 'Recording'
      }
      return this.micStatusLabel || 'Ready'
    },
    stopActionLabel() {
      if (this.isProcessing || this.endingSoon) {
        return this.liveHint || 'Processing…'
      }
      if (this.stage === 'listening') {
        return this.stopLabel || 'Stop recording'
      }
      return this.stopLabel || 'Stop'
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
    /** Hide% from parent → words-shown% for the select (0 / 25 / 50 / 75 / 90). */
    selectedShownPercent() {
      return this.hidePercentToShown(this.difficulty)
    },
    shownPercentOptions() {
      const hides = Array.isArray(this.difficultyOptions) && this.difficultyOptions.length
        ? this.difficultyOptions
        : [10, 25, 50, 75, 100]
      const shown = hides.map((hide) => this.hidePercentToShown(hide))
      return [...new Set(shown)].sort((a, b) => a - b)
    },
    autoFollowStatusLabel() {
      if (!this.autoFollowEnabled) return this.autoFollowOffLabel || 'Auto-follow off'
      if (this.autoFollowPaused) return this.autoFollowPausedLabel || 'Auto-follow paused'
      return this.autoFollowOnLabel || 'Auto-follow on'
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
        this.captureReturnFocus()
        this.syncThemeAttr()
        this.ensureAutoFollowController()
        this.$nextTick(() => {
          this.bindAutoFollowShell()
          this.scheduleMushafHtml(this.ayahHtml, true)
          this.focusInitialElement()
        })
      } else {
        this.onPeekEnd()
        this.unbindAutoFollowShell()
        this.restoreReturnFocus()
      }
    },
    theme() {
      this.syncThemeAttr()
    },
    ayahHtml(html) {
      // Apply immediately so masked HTML is in the DOM before the next paint.
      // Delayed/stage-driven replaces caused a full-text flash on record start/stop.
      if (this.open) this.scheduleMushafHtml(html, true)
    },
    fontScale() {
      if (this.open) this.scheduleAutoFollow()
    },
  },
  mounted() {
    this.syncThemeAttr()
    this.ensureAutoFollowController()
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this._themeObserver = new MutationObserver(() => this.syncThemeAttr())
      this._themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })
    }
    if (this.open) {
      this.captureReturnFocus()
      this.$nextTick(() => {
        this.bindAutoFollowShell()
        // v-if mount with :open="true" does not fire the open watcher — seed HTML here.
        this.scheduleMushafHtml(this.ayahHtml, true)
        this.focusInitialElement()
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
    this.unbindAutoFollowShell()
    this._autoFollow?.dispose?.()
    this._autoFollow = null
    this.onPeekEnd()
    if (this.open) this.restoreReturnFocus()
  },
  methods: {
    onStart() {
      if (this.busy || this.endingSoon || this.isProcessing || this.isListening) return
      this.$emit('start')
    },
    onStop() {
      if (this.endingSoon || this.isProcessing || this.isComplete) return
      if (!this.isListening) return
      this.$emit('stop')
    },
    syncThemeAttr() {
      if (typeof document === 'undefined') {
        this.themeAttr = 'light'
        return
      }
      const fromProp = String(this.theme || '').trim()
      if (fromProp) {
        this.themeAttr = fromProp
        return
      }
      const fromApp = document.querySelector?.('.app')?.getAttribute?.('data-theme')
      this.themeAttr = fromApp
        || document.documentElement.getAttribute('data-theme')
        || 'light'
    },
    hidePercentToShown(hidePercent) {
      const hide = Number(hidePercent)
      if (!Number.isFinite(hide)) return 0
      return hide >= 100 ? 0 : Math.max(0, Math.min(100, 100 - hide))
    },
    shownPercentToHide(shownPercent) {
      const shown = Number(shownPercent)
      if (!Number.isFinite(shown) || shown <= 0) return 100
      return Math.max(0, Math.min(100, 100 - shown))
    },
    formatShownPercent(hidePercent) {
      return `${this.hidePercentToShown(hidePercent)}%`
    },
    increaseFontScale() {
      this.fontScale = Math.min(this.maxFontScale, Math.round((this.fontScale + 0.08) * 100) / 100)
    },
    decreaseFontScale() {
      this.fontScale = Math.max(this.minFontScale, Math.round((this.fontScale - 0.08) * 100) / 100)
    },
    setMushafHtml(html = '') {
      // Explicit surface syncs (seed, tajweed toggle, complete) must replace DOM.
      this.scheduleMushafHtml(html, true)
    },
    ensureAutoFollowController() {
      if (this._autoFollow) return this._autoFollow
      this._autoFollow = createLiveAutoFollowController({
        enabled: true,
        onPauseChange: ({ paused }) => {
          this.autoFollowEnabled = true
          this.autoFollowPaused = !!paused
        },
        followNow: () => this.scrollActiveIntoView(this.$refs.mushafSurface, { force: true }),
      })
      return this._autoFollow
    },
    bindAutoFollowShell() {
      const shell = this.$refs.mushafShell
      if (!shell) return
      if (typeof ResizeObserver !== 'undefined') {
        this._shellResizeObserver?.disconnect?.()
        this._shellResizeObserver = new ResizeObserver(() => this.scheduleAutoFollow())
        this._shellResizeObserver.observe(shell)
      }
      if (typeof window !== 'undefined') {
        this._orientationHandler = () => this.scheduleAutoFollow()
        window.addEventListener('orientationchange', this._orientationHandler)
        window.addEventListener('resize', this._orientationHandler)
      }
    },
    unbindAutoFollowShell() {
      this._shellResizeObserver?.disconnect?.()
      this._shellResizeObserver = null
      if (typeof window !== 'undefined' && this._orientationHandler) {
        window.removeEventListener('orientationchange', this._orientationHandler)
        window.removeEventListener('resize', this._orientationHandler)
      }
      this._orientationHandler = null
    },
    onMushafShellScroll() {
      const controller = this.ensureAutoFollowController()
      if (controller.isProgrammaticScroll) return
      controller.onContainerScroll()
    },
    onToggleAutoFollow() {
      // Auto-follow is always on; resume if paused by a manual scroll.
      const controller = this.ensureAutoFollowController()
      if (this.autoFollowPaused) {
        controller.resume({ followNow: true })
      }
      controller.setEnabled(true, { persist: true })
      this.autoFollowEnabled = true
      if (!this.autoFollowPaused) this.scheduleAutoFollow({ force: true })
    },
    onResumeAutoFollow() {
      this.ensureAutoFollowController().resume({ followNow: true })
      this.autoFollowEnabled = true
    },
    scheduleAutoFollow(options = {}) {
      const controller = this.ensureAutoFollowController()
      controller.scheduleFollow({
        container: this.$refs.mushafShell,
        root: this.$refs.mushafSurface,
        activeIndex: this._activeWordIndex,
        force: !!options.force,
        reducedMotion: prefersReducedMotion(),
      })
    },
    patchWordStatuses(patches = []) {
      const el = this.$refs.mushafSurface
      if (!el || !Array.isArray(patches) || !patches.length) return false
      const controller = this.ensureAutoFollowController()
      let changed = false
      let currentIndex = null
      const prevActive = this._activeWordIndex
      for (const patch of patches) {
        const index = Number(patch?.index)
        if (!Number.isFinite(index)) continue
        let node = controller.wordCache.get(index)
        if (!node?.isConnected) {
          node = el.querySelector(`[data-recitation-word-index="${index}"]`)
          if (node) controller.wordCache.set(index, node)
        }
        if (!node?.classList) continue
        const status = String(patch.status || 'notAttempted')
        const statusClass = `recitation-word-${status}`
        if (!node.classList.contains(statusClass)) {
          ;['correct', 'partial', 'incorrect', 'omitted', 'notAttempted', 'pending'].forEach((name) => {
            node.classList.remove(`recitation-word-${name}`)
          })
          node.classList.add(statusClass)
        }
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
        node.classList.toggle('tajweed-needs-review', status === 'incorrect' || status === 'partial')
        const tajweedActive = patch.tajweedActive != null ? !!patch.tajweedActive : !!patch.current
        // Skip child-mark scans when the word has no tajweed markup.
        if (node.classList.contains('tajweed-segment-host') || node.querySelector?.('.tajweed-mark, .tajweed-segment')) {
          this.syncTajweedSegmentState(node, {
            active: tajweedActive,
            completed: status === 'correct',
            needsReview: status === 'incorrect' || status === 'partial',
          })
        } else {
          node.classList.toggle('is-tajweed-active', !!tajweedActive)
        }
        if (patch.current || tajweedActive) currentIndex = index
        changed = true
      }
      if (currentIndex != null) {
        this._activeWordIndex = currentIndex
        this.clearOtherActiveTajweedSegments(el, currentIndex)
      }
      // Follow only when the confirmed cursor moves — not on every status paint.
      if (changed && currentIndex != null && currentIndex !== prevActive) {
        this.scrollActiveIntoView(el)
      }
      return changed
    },
    syncTajweedSegmentState(node, { active = false, completed = false, needsReview = false } = {}) {
      if (!node?.querySelectorAll) return
      node.querySelectorAll('.tajweed-mark, .tajweed-segment').forEach((mark) => {
        mark.classList.toggle('is-active', !!active)
        mark.classList.toggle('is-confirmed-active', !!active)
        mark.classList.toggle('is-completed', !!completed)
        mark.classList.toggle('needs-review', !!needsReview)
      })
      node.classList.toggle('tajweed-segment-host', node.querySelector('.tajweed-mark, .tajweed-segment') != null)
      node.classList.toggle('is-tajweed-active', !!active)
    },
    clearOtherActiveTajweedSegments(root, activeIndex) {
      const prev = this._lastActiveTajweedIndex
      this._lastActiveTajweedIndex = activeIndex
      if (!Number.isFinite(prev) || prev === activeIndex) return
      const controller = this.ensureAutoFollowController()
      let node = controller.wordCache.get(prev)
      if (!node?.isConnected && root?.querySelector) {
        node = root.querySelector(`[data-recitation-word-index="${prev}"]`)
        if (node) controller.wordCache.set(prev, node)
      }
      if (!node?.classList) {
        // Fallback only when cache misses — avoid full-tree scans on every tick.
        if (!root?.querySelectorAll) return
        root.querySelectorAll('.amd-word-current, .is-tajweed-active').forEach((el) => {
          const idx = Number(el.getAttribute('data-recitation-word-index'))
          if (idx === activeIndex) return
          el.classList.remove('amd-word-current', 'is-tajweed-active')
          el.querySelectorAll(
            '.tajweed-mark.is-active, .tajweed-mark.is-confirmed-active, .tajweed-segment.is-active, .tajweed-segment.is-confirmed-active',
          ).forEach((mark) => {
            mark.classList.remove('is-active', 'is-confirmed-active')
          })
        })
        return
      }
      node.classList.remove('amd-word-current', 'is-tajweed-active')
      node.querySelectorAll?.(
        '.tajweed-mark.is-active, .tajweed-mark.is-confirmed-active, .tajweed-segment.is-active, .tajweed-segment.is-confirmed-active',
      ).forEach((mark) => {
        mark.classList.remove('is-active', 'is-confirmed-active')
      })
    },
    scheduleMushafHtml(html = '', immediate = false) {
      if (this._htmlSyncTimer) clearTimeout(this._htmlSyncTimer)
      // Never rebuild the mushaf DOM mid-listening unless forced — patches handle status.
      const listening = this.stage === 'listening' || this.stage === 'starting'
      if (listening && !immediate && this.$refs.mushafSurface?.childNodes?.length) {
        this._htmlSyncTimer = null
        return
      }
      const apply = () => {
        this._htmlSyncTimer = null
        const el = this.$refs.mushafSurface
        if (!el) return
        const next = html || ''
        // Compare against the last pushed string — never read el.innerHTML (serialises the
        // whole mushaf and freezes longer ranges on every recognition tick).
        if (this._lastMushafHtml === next && el.childNodes?.length) return
        el.innerHTML = next
        this._lastMushafHtml = next
        const controller = this.ensureAutoFollowController()
        controller.rebuildWordCache(el)
        this.decorateTajweedSegments(el)
        const current = el.querySelector('.amd-word-current')
        if (current) {
          const idx = Number(current.getAttribute('data-recitation-word-index'))
          if (Number.isFinite(idx)) this._activeWordIndex = idx
          this.syncTajweedSegmentState(current, { active: true })
        }
        this.scrollActiveIntoView(el)
      }
      // Forced updates must paint in this tick — setTimeout(0) left a frame of
      // unmasked/stale mushaf during recording-state transitions.
      if (immediate) {
        apply()
        return
      }
      this._htmlSyncTimer = setTimeout(apply, 0)
    },
    decorateTajweedSegments(root) {
      if (!root?.querySelectorAll) return
      const colourByClass = {
        ham_wasl: '#7e8a97',
        slnt: '#7e8a97',
        ghn: '#2e9d62',
        idgh_ghn: '#2e9d62',
        iqlb: '#2e9d62',
        idgh_w_ghn: '#9b59b6',
        ikhf: '#9b59b6',
        ikhf_shfw: '#9b59b6',
        qlq: '#d98824',
        lqlq: '#d98824',
        madda_normal: '#d55245',
        madda_permissible: '#d55245',
        madda_necessary: '#d55245',
        madda_obligatory: '#d55245',
        madda_pbligatory: '#d55245',
        idghm_shfw: '#2b7bbb',
        idgh_shfw: '#2b7bbb',
        idgh_mus: '#2b7bbb',
      }
      root.querySelectorAll('.tajweed-mark, [class*="tajweed-"]').forEach((mark) => {
        if (!mark?.classList) return
        mark.classList.add('tajweed-segment')
        let hex = ''
        mark.classList.forEach((cls) => {
          const key = String(cls).replace(/^tajweed-/, '')
          if (colourByClass[key]) hex = colourByClass[key]
        })
        if (hex) mark.style.setProperty('--tajweed-colour', hex)
      })
    },
    scrollActiveIntoView(root, options = {}) {
      if (typeof window === 'undefined') return
      const surface = root || this.$refs.mushafSurface
      const shell = this.$refs.mushafShell || surface?.closest?.('.amd-mushaf-shell')
      if (!surface || !shell) return
      // Never use Element.scrollIntoView — it can scroll the underlying page.
      const controller = this.ensureAutoFollowController()
      controller.followActive({
        container: shell,
        root: surface,
        activeIndex: this._activeWordIndex,
        force: !!options.force,
        reducedMotion: prefersReducedMotion(),
      })
    },
    captureReturnFocus() {
      if (typeof document === 'undefined') return
      const active = document.activeElement
      if (active instanceof HTMLElement && !this.$refs.overlay?.contains(active)) {
        this._returnFocusEl = active
      }
    },
    restoreReturnFocus() {
      const target = this._returnFocusEl
      this._returnFocusEl = null
      if (!target || typeof target.focus !== 'function') return
      if (typeof document !== 'undefined' && !document.contains(target)) return
      try {
        target.focus({ preventScroll: true })
      } catch (_) {
        try { target.focus() } catch (__) { /* ignore */ }
      }
    },
    getFocusableElements() {
      const root = this.$refs.dialog
      if (!root || typeof root.querySelectorAll !== 'function') return []
      return Array.from(root.querySelectorAll(AMD_FOCUSABLE_SELECTOR)).filter((el) => {
        if (!(el instanceof HTMLElement)) return false
        if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false
        if (el.tabIndex < 0) return false
        const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null
        if (style && (style.visibility === 'hidden' || style.display === 'none')) return false
        return true
      })
    },
    focusInitialElement() {
      const title = this.$refs.dialog?.querySelector?.('#amdModalTitle')
      if (title && typeof title.focus === 'function') {
        title.focus({ preventScroll: true })
        return
      }
      const first = this.getFocusableElements()[0]
      if (first && typeof first.focus === 'function') first.focus({ preventScroll: true })
    },
    trapFocus(event) {
      if (!this.open || event.key !== 'Tab') return
      const focusable = this.getFocusableElements()
      if (!focusable.length) {
        event.preventDefault()
        this.focusInitialElement()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = typeof document !== 'undefined' ? document.activeElement : null
      if (event.shiftKey) {
        if (active === first || !this.$refs.dialog?.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    onOverlayKeydown(event) {
      if (!this.open) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        event.preventDefault()
        this.onCancel()
        return
      }
      this.trapFocus(event)
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
      // Select options are words-shown%; parent/API still use hide%.
      const shown = Number(event?.target?.value)
      this.$emit('set-difficulty', this.shownPercentToHide(shown))
    },
    onMushafWordClick(event) {
      const target = event?.target?.closest?.('[data-recitation-word-index]')
      if (!target?.classList?.contains('can-correct-ai')) return
      const index = Number(target.dataset.recitationWordIndex)
      if (!Number.isFinite(index)) return
      this.$emit('word-click', { index })
    },
  },
}
</script>
