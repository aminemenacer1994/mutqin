<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="modal-overlay mutqin-modal-overlay ai-audio-consent-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aiAudioConsentTitle"
      aria-describedby="aiAudioConsentBody"
      @keydown="onOverlayKeydown"
      @click.self.prevent
    >
      <div ref="dialog" class="ai-audio-consent-card" @click.stop>
        <div class="ai-audio-consent-heading">
          <span class="ai-audio-consent-icon" aria-hidden="true">
            <i class="bi bi-mic-fill"></i>
          </span>
          <div>
            <span class="ai-audio-consent-eyebrow">{{ $t('memorisation.aiCheck.aiRecitation') }}</span>
            <h2 id="aiAudioConsentTitle" class="ai-audio-consent-title" tabindex="-1">{{ title }}</h2>
          </div>
        </div>
        <p id="aiAudioConsentBody" class="ai-audio-consent-lead">{{ lead }}</p>
        <p v-if="browserPrompt" class="ai-audio-consent-next-step">
          <i class="bi bi-arrow-right-circle" aria-hidden="true"></i>
          <span>{{ browserPrompt }}</span>
        </p>
        <p v-if="privacyNote" class="ai-audio-consent-note">{{ privacyNote }}</p>
        <div class="ai-audio-consent-privacy">
          <i class="bi bi-shield-check" aria-hidden="true"></i>
          <a
            :href="privacyPolicyUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >{{ privacyPolicyLabel }}</a>
        </div>
        <div class="ai-audio-consent-actions">
          <button
            type="button"
            class="mutqin-modal-btn mutqin-modal-btn--ghost ai-audio-consent-btn"
            @click.stop="onDecline"
          >
            {{ declineLabel }}
          </button>
          <button
            type="button"
            class="mutqin-modal-btn mutqin-modal-btn--primary ai-audio-consent-btn"
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
    browserPrompt: { type: String, default: '' },
    privacyItems: { type: Array, default: () => [] },
    privacyPolicyLabel: { type: String, default: '' },
    privacyPolicyUrl: { type: String, default: '/privacy' },
    acceptLabel: { type: String, default: '' },
    declineLabel: { type: String, default: '' },
  },
  emits: ['accept', 'decline'],
  computed: {
    privacyNote() {
      const items = Array.isArray(this.privacyItems) ? this.privacyItems : []
      return items.filter(Boolean).join(' ')
    },
  },
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
  display: grid;
  place-items: center;
  align-content: center;
  box-sizing: border-box;
  padding:
    max(1rem, env(safe-area-inset-top, 0px))
    max(1rem, env(safe-area-inset-right, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px))
    max(1rem, env(safe-area-inset-left, 0px));
  background: var(--mutqin-modal-backdrop, color-mix(in srgb, #0a100d 64%, transparent));
  backdrop-filter: blur(var(--mutqin-modal-backdrop-blur, 9px)) saturate(0.82);
  -webkit-backdrop-filter: blur(var(--mutqin-modal-backdrop-blur, 9px)) saturate(0.82);
  pointer-events: auto;
}

.ai-audio-consent-card {
  width: min(100%, 30rem);
  max-width: 100%;
  max-height: min(42rem, calc(100dvh - 2rem));
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  margin: 0;
  padding: clamp(1.05rem, 2.6vw, 1.55rem);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 1.35rem;
  background: var(--surface, #f6f1ea);
  color: var(--text-primary, #2c2118);
  /* Keep this modal typographically distinct from the old browser/system face. */
  font-family: "Avenir Next", "Nunito", system-ui, sans-serif !important;
  box-shadow: 0 24px 70px color-mix(in srgb, #1a1410 34%, transparent), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  pointer-events: auto;
}

.ai-audio-consent-card h2,
.ai-audio-consent-card p,
.ai-audio-consent-card span,
.ai-audio-consent-card a,
.ai-audio-consent-card button {
  font-family: "Avenir Next", "Nunito", system-ui, sans-serif !important;
}

.ai-audio-consent-heading {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.ai-audio-consent-icon {
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

.ai-audio-consent-eyebrow {
  display: block;
  margin-bottom: 0.2rem;
  color: #8b5e3c;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ai-audio-consent-title {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.55rem);
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.ai-audio-consent-lead {
  margin: 0.85rem 0 0;
  font-size: 0.95rem;
  line-height: 1.55;
  opacity: 0.92;
}

.ai-audio-consent-next-step {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin: 0.95rem 0 0;
  padding: 0.75rem 0.85rem;
  border: 1px solid color-mix(in srgb, #8b5e3c 24%, transparent);
  border-radius: 0.85rem;
  background: color-mix(in srgb, #b77a45 9%, transparent);
  color: #5c4030;
  font-size: 0.91rem;
  font-weight: 650;
  line-height: 1.45;
}

.ai-audio-consent-next-step i {
  flex: 0 0 auto;
  margin-top: 0.1rem;
  color: #8b5e3c;
}

.ai-audio-consent-note {
  margin: 0.85rem 0 0;
  font-size: 0.86rem;
  line-height: 1.45;
  opacity: 0.82;
}

.ai-audio-consent-privacy {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  margin: 1rem 0 0;
  color: #8b5e3c;
  font-size: 0.9rem;
  font-weight: 650;
}

.ai-audio-consent-privacy i {
  font-size: 0.95rem;
}

.ai-audio-consent-privacy a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.ai-audio-consent-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
  margin-top: 1.45rem;
}

.ai-audio-consent-btn {
  width: 100%;
  min-height: 3rem;
  font-size: 0.98rem;
  font-weight: 650;
  touch-action: manipulation;
}

[data-theme="dark"] .ai-audio-consent-card {
  border-color: rgba(255, 236, 216, 0.14);
  background: linear-gradient(160deg, #27211c, #1b1714);
  color: #f3ebe2;
  box-shadow: 0 26px 72px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}

[data-theme="dark"] .ai-audio-consent-icon {
  border-color: rgba(196, 164, 132, 0.35);
  background: rgba(196, 164, 132, 0.14);
  color: #e3bd91;
}

[data-theme="dark"] .ai-audio-consent-eyebrow,
[data-theme="dark"] .ai-audio-consent-privacy {
  color: #e3bd91;
}

[data-theme="dark"] .ai-audio-consent-next-step {
  border-color: rgba(227, 189, 145, 0.28);
  background: rgba(196, 164, 132, 0.14);
  color: #f0dfcb;
}

[data-theme="dark"] .ai-audio-consent-next-step i {
  color: #e3bd91;
}

[data-theme="sepia"] .ai-audio-consent-card {
  border-color: rgba(118, 88, 54, 0.22);
  background: linear-gradient(160deg, #fffaf1, #f2e6d2);
}

@media (max-width: 520px) {
  .ai-audio-consent-overlay {
    align-items: flex-end;
    padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  }

  .ai-audio-consent-card {
    width: 100%;
    border-radius: 1.25rem;
    padding: 1.35rem;
  }
}

@media (max-width: 420px) {
  .ai-audio-consent-actions {
    grid-template-columns: 1fr;
  }

  .ai-audio-consent-actions .mutqin-modal-btn--primary {
    order: -1;
  }
}
</style>
