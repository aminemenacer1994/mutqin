<template>
  <Teleport to="body">
    <transition name="feedback-modal-fade">
      <div
        v-if="visible"
        class="feedback-modal-overlay"
        @click.self="onBackdropClick"
      >
        <div
          class="feedback-modal-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedbackModalTitle"
          @keydown.esc.prevent="close"
        >
          <div v-if="success" class="feedback-modal__success" role="status">
            <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
            <p>{{ t('feedback.success') }}</p>
          </div>

          <template v-else>
            <header class="feedback-modal__header">
              <div class="feedback-modal__header-copy">
                <h2 id="feedbackModalTitle">{{ t('feedback.title') }}</h2>
                <p class="feedback-modal__lead">{{ t('feedback.lead') }}</p>
              </div>
              <button
                type="button"
                class="feedback-modal__close"
                :aria-label="t('common.close')"
                :disabled="submitting"
                @click="close"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </header>

            <form class="feedback-modal__form" @submit.prevent="submit">
              <div class="feedback-modal__body">
                <label class="feedback-modal__field">
                  <span class="feedback-modal__label">{{ t('feedback.typeLabel') }}</span>
                  <select
                    v-model="form.type"
                    class="feedback-modal__select"
                    :disabled="submitting || presetLocked.type"
                    required
                  >
                    <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                      {{ t(option.labelKey) }}
                    </option>
                  </select>
                </label>

                <fieldset
                  v-if="form.type === 'ai_recitation'"
                  class="feedback-modal__reasons"
                >
                  <legend class="feedback-modal__label">{{ t('feedback.aiReasonLabel') }}</legend>
                  <div class="feedback-modal__reason-list">
                    <label
                      v-for="reason in aiReasonOptions"
                      :key="reason.value"
                      class="feedback-modal__reason"
                      :class="{ 'is-selected': form.aiReason === reason.value }"
                    >
                      <input
                        v-model="form.aiReason"
                        type="radio"
                        name="feedback-ai-reason"
                        :value="reason.value"
                        :disabled="submitting"
                      />
                      <span>{{ t(reason.labelKey) }}</span>
                    </label>
                  </div>
                </fieldset>

                <label class="feedback-modal__field">
                  <span class="feedback-modal__label">{{ t('feedback.messageLabel') }}</span>
                  <textarea
                    ref="messageInput"
                    v-model="form.message"
                    class="feedback-modal__textarea"
                    rows="5"
                    maxlength="5000"
                    required
                    :disabled="submitting"
                    :placeholder="t('feedback.messagePlaceholder')"
                    :aria-invalid="Boolean(fieldErrors.message) ? 'true' : 'false'"
                  ></textarea>
                </label>

                <div v-if="formError" class="feedback-modal__alert" role="alert">
                  {{ formError }}
                </div>
                <ul v-if="fieldErrorList.length" class="feedback-modal__field-errors" role="alert">
                  <li v-for="(item, index) in fieldErrorList" :key="`${item}-${index}`">{{ item }}</li>
                </ul>
              </div>

              <footer class="feedback-modal__actions">
                <button
                  type="button"
                  class="feedback-modal__btn feedback-modal__btn--ghost"
                  :disabled="submitting"
                  @click="close"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  type="submit"
                  class="feedback-modal__btn feedback-modal__btn--primary"
                  :disabled="submitting || !canSubmit"
                  :aria-busy="submitting ? 'true' : 'false'"
                >
                  <span v-if="submitting">{{ t('feedback.submitting') }}</span>
                  <span v-else>{{ t('feedback.submit') }}</span>
                </button>
              </footer>
            </form>
          </template>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import {
  AI_FEEDBACK_REASONS,
  collectFeedbackContext,
  FEEDBACK_TYPES,
} from '../scripts/feedback/collectContext';
import {
  registerFeedbackModalHandler,
  unregisterFeedbackModalHandler,
} from '../scripts/feedback/feedbackLauncher';

export default {
  name: 'FeedbackModal',
  data() {
    return {
      visible: false,
      submitting: false,
      success: false,
      formError: '',
      fieldErrors: {},
      presetLocked: { type: false },
      form: {
        type: 'suggestion',
        message: '',
        aiReason: '',
        aiCheckId: null,
        aiCheckSource: '',
        mushafLayout: '',
        extraContext: {},
      },
    };
  },
  computed: {
    typeOptions() {
      return FEEDBACK_TYPES;
    },
    aiReasonOptions() {
      return AI_FEEDBACK_REASONS;
    },
    canSubmit() {
      const message = String(this.form.message || '').trim();
      if (message.length < 3) return false;
      if (this.form.type === 'ai_recitation') {
        return Boolean(this.form.aiCheckId || this.form.extraContext?.recommendation_id);
      }
      return true;
    },
    fieldErrorList() {
      const errors = this.fieldErrors || {};
      return Object.values(errors).flat().filter(Boolean);
    },
  },
  mounted() {
    this.openHandler = (options) => this.openFromEvent(options || {});
    registerFeedbackModalHandler(this.openHandler);
  },
  beforeUnmount() {
    unregisterFeedbackModalHandler();
  },
  methods: {
    openFromEvent(options = {}) {
      this.reset(false);
      if (options.type) {
        this.form.type = options.type;
        this.presetLocked.type = options.type === 'ai_recitation';
      }
      if (options.message) this.form.message = options.message;
      if (options.aiReason) this.form.aiReason = options.aiReason;
      if (options.aiCheckId) this.form.aiCheckId = Number(options.aiCheckId) || null;
      if (options.aiCheckSource) this.form.aiCheckSource = options.aiCheckSource;
      if (options.mushafLayout) this.form.mushafLayout = options.mushafLayout;
      if (options.context && typeof options.context === 'object') {
        this.form.extraContext = { ...options.context };
      }
      this.visible = true;
      this.$nextTick(() => {
        this.$refs.messageInput?.focus?.();
      });
    },
    close() {
      if (this.submitting) return;
      this.visible = false;
      if (this.success) {
        this.reset(true);
      }
    },
    onBackdropClick() {
      this.close();
    },
    reset(full = true) {
      this.success = false;
      this.formError = '';
      this.fieldErrors = {};
      this.presetLocked = { type: false };
      if (full) {
        this.form = {
          type: 'suggestion',
          message: '',
          aiReason: '',
          aiCheckId: null,
          aiCheckSource: '',
          mushafLayout: '',
          extraContext: {},
        };
      }
    },
    async submit() {
      if (!this.canSubmit || this.submitting) return;
      this.submitting = true;
      this.formError = '';
      this.fieldErrors = {};

      const payload = {
        type: this.form.type,
        message: String(this.form.message || '').trim(),
        context: collectFeedbackContext({
          mushaf_layout: this.form.mushafLayout || undefined,
          ...this.form.extraContext,
        }),
      };

      if (this.form.type === 'ai_recitation') {
        if (this.form.aiCheckId) payload.ai_check_id = this.form.aiCheckId;
        payload.ai_check_source = this.form.aiCheckSource || 'ai_recite_attempt';
        if (this.form.aiReason) payload.ai_reason = this.form.aiReason;
      }

      try {
        const response = await window.axios.post('/api/feedback', payload);
        if (response?.data?.message) {
          this.success = true;
          window.setTimeout(() => {
            this.visible = false;
            this.reset(true);
          }, 1600);
        }
      } catch (error) {
        const data = error?.response?.data;
        this.formError = this.localizeFeedbackMessage(data?.message) || this.t('feedback.submitError');
        this.fieldErrors = this.localizeFeedbackFieldErrors(data?.errors);
      } finally {
        this.submitting = false;
      }
    },
    localizeFeedbackMessage(message) {
      const text = String(message || '').trim();
      if (!text) return '';
      const map = {
        'Please enter your feedback.': 'feedback.messageRequired',
        'Please enter at least a few characters.': 'feedback.messageMin',
        'Please choose a feedback type.': 'feedback.typeRequired',
        'That feedback type is not supported.': 'feedback.typeInvalid',
        'Thanks, your feedback has been sent.': 'feedback.success',
        'We could not send your feedback. Please try again.': 'feedback.submitError',
      };
      const key = map[text];
      return key ? this.t(key) : text;
    },
    localizeFeedbackFieldErrors(errors) {
      const source = errors && typeof errors === 'object' ? errors : {};
      const out = {};
      Object.entries(source).forEach(([field, messages]) => {
        const list = Array.isArray(messages) ? messages : [messages];
        out[field] = list.map((item) => this.localizeFeedbackMessage(item));
      });
      return out;
    },
  },
};
</script>

<style scoped>
.feedback-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 250000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  background: rgba(12, 10, 8, 0.64);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.feedback-modal-shell {
  width: min(100%, 32rem);
  max-height: min(88dvh, 42rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px;
  background: var(--feedback-bg);
  color: var(--feedback-text);
  border: 1px solid var(--feedback-border);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.45) inset,
    0 24px 56px rgba(0, 0, 0, 0.22);
}

.feedback-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.35rem 1.5rem 1.15rem;
  border-bottom: 1px solid var(--feedback-divider);
  background: var(--feedback-header-bg);
}

.feedback-modal__header-copy {
  min-width: 0;
}

.feedback-modal__header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--feedback-text);
}

.feedback-modal__lead {
  margin: 0.45rem 0 0;
  color: var(--feedback-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.feedback-modal__close {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 999px;
  background: var(--feedback-control-bg);
  color: var(--feedback-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.feedback-modal__close:hover,
.feedback-modal__close:focus-visible {
  background: var(--feedback-control-hover);
  color: var(--feedback-text);
  outline: none;
}

.feedback-modal__form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
}

.feedback-modal__body {
  display: grid;
  gap: 1.15rem;
  padding: 1.35rem 1.5rem;
  overflow: auto;
}

.feedback-modal__field {
  display: grid;
  gap: 0.5rem;
}

.feedback-modal__label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--feedback-text);
}

.feedback-modal__select,
.feedback-modal__textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--feedback-input-border);
  background: var(--feedback-input-bg);
  color: var(--feedback-text);
  font-size: 0.9375rem;
  line-height: 1.45;
  padding: 0.72rem 0.85rem;
  box-shadow: none;
}

.feedback-modal__select:focus,
.feedback-modal__textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--feedback-accent) 35%, transparent);
  outline-offset: 1px;
  border-color: var(--feedback-accent);
}

.feedback-modal__textarea {
  min-height: 7.5rem;
  resize: vertical;
}

.feedback-modal__reasons {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.feedback-modal__reasons legend {
  padding: 0;
  margin: 0;
}

.feedback-modal__reason-list {
  display: grid;
  gap: 0.5rem;
}

.feedback-modal__reason {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  font-size: 0.875rem;
  line-height: 1.45;
  padding: 0.72rem 0.85rem;
  border-radius: 12px;
  border: 1px solid var(--feedback-input-border);
  background: var(--feedback-input-bg);
  cursor: pointer;
}

.feedback-modal__reason.is-selected {
  border-color: color-mix(in srgb, var(--feedback-accent) 55%, var(--feedback-input-border));
  background: var(--feedback-accent-soft);
}

.feedback-modal__reason input {
  margin-top: 0.2rem;
  accent-color: var(--feedback-accent);
}

.feedback-modal__alert {
  margin: 0;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: var(--feedback-error-bg);
  color: var(--feedback-error-text);
  font-size: 0.875rem;
  line-height: 1.45;
}

.feedback-modal__field-errors {
  margin: 0;
  padding-left: 1.15rem;
  color: var(--feedback-error-text);
  font-size: 0.875rem;
}

.feedback-modal__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 1rem 1.5rem 1.35rem;
  border-top: 1px solid var(--feedback-divider);
  background: var(--feedback-footer-bg);
}

.feedback-modal__btn {
  min-height: 2.75rem;
  min-width: 6.75rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.65rem 1.15rem;
  cursor: pointer;
}

.feedback-modal__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.feedback-modal__btn--ghost {
  background: var(--feedback-control-bg);
  border: 1px solid var(--feedback-input-border);
  color: var(--feedback-text);
}

.feedback-modal__btn--ghost:hover:not(:disabled) {
  background: var(--feedback-control-hover);
}

.feedback-modal__btn--primary {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, var(--feedback-accent), var(--feedback-accent-strong));
}

.feedback-modal__success {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  text-align: center;
  padding: 2.5rem 1.5rem;
}

.feedback-modal__success i {
  color: var(--feedback-success);
  font-size: 1.75rem;
}

.feedback-modal__success p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--feedback-text);
}

.feedback-modal-fade-enter-active,
.feedback-modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.feedback-modal-fade-enter-from,
.feedback-modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .feedback-modal-shell {
    width: 100%;
    max-height: calc(100dvh - 1.5rem);
    border-radius: 16px;
  }

  .feedback-modal__header,
  .feedback-modal__body,
  .feedback-modal__actions {
    padding-left: 1.15rem;
    padding-right: 1.15rem;
  }

  .feedback-modal__actions {
    flex-direction: column-reverse;
  }

  .feedback-modal__btn {
    width: 100%;
    min-width: 0;
  }
}
</style>

<style>
/* Opaque theme tokens — global so html[data-theme] applies to teleported modal */
.feedback-modal-shell {
  --feedback-accent: #8b5e3c;
  --feedback-accent-strong: #6f4a2f;
  --feedback-accent-soft: #f3e8dc;
  --feedback-success: #15803d;
  --feedback-bg: #fffaf4;
  --feedback-header-bg: #fffaf4;
  --feedback-footer-bg: #fff6ec;
  --feedback-text: #2c241c;
  --feedback-muted: #6f5f4f;
  --feedback-border: #e3d5c4;
  --feedback-divider: #eadfce;
  --feedback-input-bg: #ffffff;
  --feedback-input-border: #dccdb8;
  --feedback-control-bg: #fff3e4;
  --feedback-control-hover: #f7e8d4;
  --feedback-error-bg: #fdecec;
  --feedback-error-text: #991b1b;
}

html[data-theme="light"] .feedback-modal-shell {
  --feedback-bg: #ffffff;
  --feedback-header-bg: #ffffff;
  --feedback-footer-bg: #f8fafc;
  --feedback-text: #1f2937;
  --feedback-muted: #64748b;
  --feedback-border: #e2e8f0;
  --feedback-divider: #e2e8f0;
  --feedback-input-bg: #ffffff;
  --feedback-input-border: #cbd5e1;
  --feedback-control-bg: #f1f5f9;
  --feedback-control-hover: #e2e8f0;
  --feedback-accent-soft: #f5ebe3;
}

html[data-theme="sepia"] .feedback-modal-shell {
  --feedback-bg: #f1e7d8;
  --feedback-header-bg: #f1e7d8;
  --feedback-footer-bg: #ebdecb;
  --feedback-text: #2c241c;
  --feedback-muted: #6f5f4f;
  --feedback-border: #dccdb8;
  --feedback-divider: #dccdb8;
  --feedback-input-bg: #fff8ed;
  --feedback-input-border: #d4c4ae;
  --feedback-control-bg: #fff3e4;
  --feedback-control-hover: #f7e8d4;
  --feedback-accent-soft: #f3e8dc;
}

html[data-theme="dark"] .feedback-modal-shell {
  --feedback-bg: #221d19;
  --feedback-header-bg: #221d19;
  --feedback-footer-bg: #1c1714;
  --feedback-text: #f4ede4;
  --feedback-muted: #b8a99a;
  --feedback-border: rgba(255, 255, 255, 0.12);
  --feedback-divider: rgba(255, 255, 255, 0.1);
  --feedback-input-bg: #2a2420;
  --feedback-input-border: rgba(255, 255, 255, 0.14);
  --feedback-control-bg: #2f2823;
  --feedback-control-hover: #3a322c;
  --feedback-accent-soft: rgba(139, 94, 60, 0.22);
  --feedback-error-bg: rgba(127, 29, 29, 0.35);
  --feedback-error-text: #fecaca;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 24px 56px rgba(0, 0, 0, 0.48);
}
</style>
