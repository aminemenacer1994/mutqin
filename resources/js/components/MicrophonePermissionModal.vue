<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="mic-permission-overlay"
      :data-theme="theme || undefined"
      role="dialog"
      aria-modal="true"
      aria-labelledby="micPermissionTitle"
      :aria-describedby="describedBy"
      @keydown="onOverlayKeydown"
    >
      <div ref="dialog" class="mic-permission-card" @click.stop>
        <div class="mic-permission-heading">
          <span class="mic-permission-icon" aria-hidden="true">
            <i class="bi bi-mic-mute-fill"></i>
          </span>
          <h2 id="micPermissionTitle" class="mic-permission-title">{{ heading }}</h2>
        </div>
        <p
          v-if="explanation"
          id="micPermissionLead"
          class="mic-permission-lead"
        >{{ explanation }}</p>
        <ol
          v-if="steps.length"
          id="micPermissionSteps"
          class="mic-permission-steps"
        >
          <li v-for="(step, index) in steps" :key="`${index}-${step}`">{{ step }}</li>
        </ol>
        <div class="mic-permission-actions">
          <button
            type="button"
            class="mic-permission-btn mic-permission-btn--ghost"
            @click.stop="onCancel"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="mic-permission-btn mic-permission-btn--primary"
            @click.stop="onTryAgain"
          >
            {{ tryAgainLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  captureReturnFocus,
  focusInitialElement,
  handleModalKeydown,
  restoreReturnFocus,
} from '../utils/modalFocus'

export default {
  name: 'MicrophonePermissionModal',
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: '' },
    heading: { type: String, default: '' },
    explanation: { type: String, default: '' },
    steps: { type: Array, default: () => [] },
    tryAgainLabel: { type: String, default: '' },
    cancelLabel: { type: String, default: '' },
  },
  emits: ['try-again', 'cancel'],
  data() {
    return {
      _returnFocusEl: null,
    }
  },
  computed: {
    describedBy() {
      if (this.steps.length) return 'micPermissionLead micPermissionSteps'
      if (this.explanation) return 'micPermissionLead'
      return undefined
    },
  },
  watch: {
    open(next) {
      if (next) {
        this._returnFocusEl = captureReturnFocus(this.$refs.overlay)
        this.$nextTick(() => focusInitialElement(this.$refs.dialog, '.mic-permission-btn--primary'))
      } else {
        restoreReturnFocus(this._returnFocusEl)
        this._returnFocusEl = null
      }
    },
  },
  beforeUnmount() {
    restoreReturnFocus(this._returnFocusEl)
    this._returnFocusEl = null
  },
  methods: {
    onOverlayKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialog,
        open: this.open,
        onEscape: () => this.onCancel(),
      })
    },
    onTryAgain() {
      this.$emit('try-again')
    },
    onCancel() {
      this.$emit('cancel')
    },
  },
}
</script>

<style scoped>
.mic-permission-overlay {
  position: fixed;
  inset: 0;
  z-index: 35000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding:
    max(1rem, env(safe-area-inset-top, 0px))
    max(1rem, env(safe-area-inset-right, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px))
    max(1rem, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, #0a100d 64%, transparent);
  backdrop-filter: blur(9px) saturate(0.82);
  -webkit-backdrop-filter: blur(9px) saturate(0.82);
  pointer-events: auto;
}

.mic-permission-card {
  width: min(100%, 28rem);
  max-width: 100%;
  max-height: min(36rem, calc(100dvh - 2rem));
  overflow: auto;
  box-sizing: border-box;
  margin: 0;
  padding: clamp(1.2rem, 3vw, 1.7rem);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 1.35rem;
  background: var(--surface, #f6f1ea);
  color: var(--text-primary, #2c2118);
  font-family: "Avenir Next", "Nunito", system-ui, sans-serif !important;
  box-shadow: 0 24px 70px color-mix(in srgb, #1a1410 34%, transparent), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.mic-permission-card h2,
.mic-permission-card p,
.mic-permission-card li,
.mic-permission-card button {
  font-family: "Avenir Next", "Nunito", system-ui, sans-serif !important;
}

.mic-permission-heading {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.mic-permission-icon {
  display: inline-grid;
  place-items: center;
  flex: 0 0 2.75rem;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid color-mix(in srgb, #8b5e3c 28%, transparent);
  border-radius: 0.9rem;
  background: color-mix(in srgb, #b77a45 14%, transparent);
  color: #8b5e3c;
  font-size: 1.1rem;
}

.mic-permission-title {
  margin: 0;
  font-size: clamp(1.15rem, 3vw, 1.4rem);
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.mic-permission-lead {
  margin: 1rem 0 0;
  font-size: 0.98rem;
  line-height: 1.55;
  opacity: 0.92;
}

.mic-permission-steps {
  margin: 0.85rem 0 0;
  padding-inline-start: 1.2rem;
  padding-inline-end: 0;
  font-size: 0.94rem;
  line-height: 1.5;
}

.mic-permission-steps li + li {
  margin-top: 0.35rem;
}

.mic-permission-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
  margin-top: 1.3rem;
}

.mic-permission-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 0.85rem;
  border: 1px solid transparent;
  font: inherit;
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.2;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
}

.mic-permission-btn:focus-visible {
  outline: 3px solid var(--focus-ring-color, #8b5e3c);
  outline-offset: 3px;
}

.mic-permission-btn--ghost {
  background: transparent;
  border-color: color-mix(in srgb, currentColor 22%, transparent);
  color: inherit;
}

.mic-permission-btn--primary {
  background: #5c4030;
  border-color: #5c4030;
  color: #fff;
}

[data-theme="dark"] .mic-permission-card,
.mic-permission-overlay[data-theme="dark"] .mic-permission-card {
  border-color: rgba(255, 236, 216, 0.14);
  background: linear-gradient(160deg, #27211c, #1b1714);
  color: #f3ebe2;
  box-shadow: 0 26px 72px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}

[data-theme="dark"] .mic-permission-icon,
.mic-permission-overlay[data-theme="dark"] .mic-permission-icon {
  border-color: rgba(196, 164, 132, 0.35);
  background: rgba(196, 164, 132, 0.14);
  color: #e3bd91;
}

[data-theme="dark"] .mic-permission-btn--primary,
.mic-permission-overlay[data-theme="dark"] .mic-permission-btn--primary {
  background: #c4a484;
  border-color: #c4a484;
  color: #1c1814;
}

[data-theme="sepia"] .mic-permission-card,
.mic-permission-overlay[data-theme="sepia"] .mic-permission-card {
  border-color: rgba(118, 88, 54, 0.22);
  background: linear-gradient(160deg, #fffaf1, #f2e6d2);
}

@media (max-width: 520px) {
  .mic-permission-overlay {
    align-items: flex-end;
    padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  }

  .mic-permission-card {
    width: 100%;
    border-radius: 1.25rem 1.25rem 0.4rem 0.4rem;
    padding: 1.25rem;
  }
}

@media (max-width: 420px) {
  .mic-permission-actions {
    grid-template-columns: 1fr;
  }

  .mic-permission-btn--primary {
    order: -1;
  }
}
</style>
