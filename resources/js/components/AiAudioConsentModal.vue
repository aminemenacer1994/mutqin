<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="ai-audio-consent-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aiAudioConsentTitle"
      aria-describedby="aiAudioConsentBody"
      @keydown="onOverlayKeydown"
    >
      <div ref="dialog" class="ai-audio-consent-card" @click.stop>
        <h2 id="aiAudioConsentTitle" class="ai-audio-consent-title">{{ title }}</h2>
        <p id="aiAudioConsentBody" class="ai-audio-consent-lead">{{ lead }}</p>
        <p class="ai-audio-consent-privacy">
          <a
            :href="privacyPolicyUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >{{ privacyPolicyLabel }}</a>
        </p>
        <div class="ai-audio-consent-actions">
          <button
            type="button"
            class="ai-audio-consent-btn ai-audio-consent-btn--ghost"
            @click.stop="onDecline"
          >
            {{ declineLabel }}
          </button>
          <button
            type="button"
            class="ai-audio-consent-btn ai-audio-consent-btn--primary"
            @click.stop="onAccept"
          >
            {{ acceptLabel }}
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
  name: 'AiAudioConsentModal',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    lead: { type: String, default: '' },
    privacyPolicyLabel: { type: String, default: '' },
    privacyPolicyUrl: { type: String, default: '/privacy' },
    acceptLabel: { type: String, default: '' },
    declineLabel: { type: String, default: '' },
  },
  emits: ['accept', 'decline'],
  data() {
    return {
      _returnFocusEl: null,
    }
  },
  watch: {
    open(next) {
      if (next) {
        this._returnFocusEl = captureReturnFocus(this.$refs.overlay)
        this.$nextTick(() => focusInitialElement(this.$refs.dialog, '#aiAudioConsentTitle'))
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
        onEscape: () => this.onDecline(),
      })
    },
    onAccept() {
      this.$emit('accept')
    },
    onDecline() {
      this.$emit('decline')
    },
  },
}
</script>

<style scoped>
.ai-audio-consent-overlay {
  position: fixed;
  inset: 0;
  z-index: 34000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding:
    max(1rem, env(safe-area-inset-top, 0px))
    max(1rem, env(safe-area-inset-right, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px))
    max(1rem, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, #0a100d 58%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: auto;
}

.ai-audio-consent-card {
  width: min(100%, 22rem);
  max-width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 1.25rem 1.2rem 1.1rem;
  border-radius: 1rem;
  background: var(--surface, #f6f1ea);
  color: var(--text-primary, #2c2118);
  box-shadow: 0 18px 48px color-mix(in srgb, #1a1410 28%, transparent);
  pointer-events: auto;
}

.ai-audio-consent-title {
  margin: 0;
  font-size: clamp(1.05rem, 2.8vw, 1.2rem);
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.ai-audio-consent-lead {
  margin: 0.7rem 0 0;
  font-size: 0.94rem;
  line-height: 1.5;
  opacity: 0.92;
}

.ai-audio-consent-privacy {
  margin: 0.75rem 0 0;
  font-size: 0.88rem;
}

.ai-audio-consent-privacy a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.ai-audio-consent-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-top: 1.15rem;
}

.ai-audio-consent-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.65rem;
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 0.7rem;
  border: 1px solid transparent;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
}

.ai-audio-consent-btn:focus-visible {
  outline: 3px solid var(--focus-ring-color, #8b5e3c);
  outline-offset: 3px;
}

.ai-audio-consent-btn--ghost {
  background: transparent;
  border-color: color-mix(in srgb, currentColor 22%, transparent);
  color: inherit;
}

.ai-audio-consent-btn--primary {
  background: #5c4030;
  border-color: #5c4030;
  color: #fff;
}

[data-theme="dark"] .ai-audio-consent-card {
  background: #1c1814;
  color: #f3ebe2;
}

[data-theme="dark"] .ai-audio-consent-btn--primary {
  background: #c4a484;
  border-color: #c4a484;
  color: #1c1814;
}

@media (max-width: 420px) {
  .ai-audio-consent-actions {
    grid-template-columns: 1fr;
  }

  .ai-audio-consent-btn--primary {
    order: -1;
  }
}
</style>
