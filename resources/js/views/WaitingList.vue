<template>
  <section class="waiting-list-page" aria-labelledby="waitingListTitle">
    <div class="waiting-list-atmosphere" aria-hidden="true"></div>

    <div class="waiting-list-shell">
      <header class="waiting-list-hero waiting-list-reveal">
        <p class="waiting-list-brand">
          <i class="bi bi-moon-stars-fill" aria-hidden="true"></i>
          {{ t('waitingList.brand') }}
        </p>
        <h1 id="waitingListTitle">{{ t('waitingList.title') }}</h1>
        <p class="waiting-list-lead">{{ t('waitingList.subtitle') }}</p>
      </header>

      <div
        class="waiting-list-panel waiting-list-reveal"
        style="--d: 90ms"
        :class="{ 'is-joined': joined }"
      >
        <div
          v-if="joined"
          class="waiting-list-success"
          role="status"
          aria-live="polite"
        >
          <div class="waiting-list-success-icon" aria-hidden="true">
            <i class="bi bi-check-lg"></i>
          </div>
          <h2>{{ status.message }}</h2>
          <p>{{ t('waitingList.successHint') }}</p>
          <button
            type="button"
            class="waiting-list-ghost-btn"
            @click="resetToForm"
          >
            {{ t('waitingList.joinAnother') }}
          </button>
        </div>

        <form
          v-else
          class="waiting-list-form"
          @submit.prevent="submit"
          novalidate
        >
          <div
            v-if="status.type === 'error' && status.message"
            class="waiting-list-alert waiting-list-alert--error"
            role="alert"
            aria-live="assertive"
          >
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
            <span>{{ status.message }}</span>
          </div>

          <div class="waiting-list-field">
            <label class="waiting-list-label" for="waitingListName">
              {{ t('waitingList.name') }}
            </label>
            <input
              id="waitingListName"
              ref="nameInput"
              v-model.trim="form.name"
              type="text"
              class="waiting-list-input"
              :class="{ 'is-invalid': errors.name }"
              autocomplete="name"
              enterkeyhint="next"
              :disabled="submitting"
              :aria-invalid="errors.name ? 'true' : 'false'"
              :aria-describedby="errors.name ? 'waitingListNameError' : undefined"
              :placeholder="t('waitingList.namePlaceholder')"
              @input="clearFieldError('name')"
            >
            <p
              v-if="errors.name"
              id="waitingListNameError"
              class="waiting-list-field-error"
            >
              {{ errors.name }}
            </p>
          </div>

          <div class="waiting-list-field">
            <label class="waiting-list-label" for="waitingListEmail">
              {{ t('waitingList.email') }}
            </label>
            <input
              id="waitingListEmail"
              ref="emailInput"
              v-model.trim="form.email"
              type="email"
              class="waiting-list-input"
              :class="{ 'is-invalid': errors.email }"
              autocomplete="email"
              enterkeyhint="done"
              inputmode="email"
              :disabled="submitting"
              :aria-invalid="errors.email ? 'true' : 'false'"
              :aria-describedby="errors.email ? 'waitingListEmailError' : undefined"
              :placeholder="t('waitingList.emailPlaceholder')"
              @input="clearFieldError('email')"
            >
            <p
              v-if="errors.email"
              id="waitingListEmailError"
              class="waiting-list-field-error"
            >
              {{ errors.email }}
            </p>
          </div>

          <button
            type="submit"
            class="waiting-list-submit"
            :disabled="submitting"
            :aria-busy="submitting ? 'true' : 'false'"
          >
            <i
              class="bi"
              :class="submitting ? 'bi-arrow-repeat spin-icon' : 'bi-arrow-right'"
              aria-hidden="true"
            ></i>
            <span>{{ submitting ? t('waitingList.joining') : t('waitingList.join') }}</span>
          </button>

          <p class="waiting-list-note">{{ t('waitingList.privacyNote') }}</p>
        </form>
      </div>
    </div>
  </section>
</template>

<script>
import { nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'WaitingListPage',
  setup() {
    const { t } = useI18n();

    const form = reactive({
      name: '',
      email: '',
    });
    const errors = reactive({});
    const status = reactive({
      type: '',
      message: '',
    });
    const submitting = ref(false);
    const joined = ref(false);
    const nameInput = ref(null);
    const emailInput = ref(null);

    const clearFieldError = (field) => {
      if (errors[field]) {
        delete errors[field];
      }
      if (status.type === 'error') {
        status.type = '';
        status.message = '';
      }
    };

    const resetFeedback = () => {
      Object.keys(errors).forEach((key) => delete errors[key]);
      status.type = '';
      status.message = '';
    };

    const focusFirstInvalid = async () => {
      await nextTick();
      if (errors.name) {
        nameInput.value?.focus();
        return;
      }
      if (errors.email) {
        emailInput.value?.focus();
      }
    };

    const validate = () => {
      resetFeedback();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!form.name) {
        errors.name = t('waitingList.errors.name');
      }

      if (!form.email) {
        errors.email = t('waitingList.errors.email');
      } else if (!emailPattern.test(form.email)) {
        errors.email = t('waitingList.errors.emailInvalid');
      }

      return Object.keys(errors).length === 0;
    };

    const submit = async () => {
      if (submitting.value) {
        return;
      }

      if (!validate()) {
        await focusFirstInvalid();
        return;
      }

      submitting.value = true;

      try {
        const response = await window.axios.post('/api/waiting-list', {
          name: form.name,
          email: form.email,
        });

        status.type = 'success';
        status.message = response?.data?.already_joined
          ? t('waitingList.alreadyJoined')
          : t('waitingList.success');
        joined.value = true;
        form.name = '';
        form.email = '';
      } catch (error) {
        const validationErrors = error?.response?.data?.errors || {};
        Object.entries(validationErrors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : messages;
        });

        status.type = 'error';
        status.message = Object.keys(validationErrors).length
          ? t('waitingList.errorFields')
          : t('waitingList.errorSend');
        await focusFirstInvalid();
      } finally {
        submitting.value = false;
      }
    };

    const resetToForm = async () => {
      joined.value = false;
      resetFeedback();
      await nextTick();
      nameInput.value?.focus();
    };

    onMounted(() => {
      nameInput.value?.focus();
    });

    return {
      t,
      form,
      errors,
      status,
      submitting,
      joined,
      nameInput,
      emailInput,
      clearFieldError,
      submit,
      resetToForm,
    };
  },
};
</script>

<style scoped>
.waiting-list-page {
  --wl-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  isolation: isolate;
  min-height: calc(100dvh - var(--nav-h, 64px) - 2rem);
  display: grid;
  align-content: center;
  padding: clamp(1.25rem, 4vw, 2.5rem) 0 clamp(2.5rem, 6vw, 4rem);
  overflow-x: hidden;
  overflow: hidden;
  overflow: clip;
}

.waiting-list-atmosphere {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 55% at 50% -10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%),
    radial-gradient(ellipse 45% 40% at 100% 80%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 65%),
    radial-gradient(ellipse 40% 35% at 0% 90%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%);
}

.waiting-list-shell {
  width: min(26.5rem, calc(100% - clamp(1.5rem, 6vw, 2.75rem)));
  margin: 0 auto;
  display: grid;
  gap: clamp(1.35rem, 3.5vw, 1.85rem);
}

.waiting-list-hero {
  display: grid;
  gap: 0.65rem;
  text-align: center;
  justify-items: center;
}

.waiting-list-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  color: var(--accent-strong);
  font-size: clamp(1.35rem, 3.2vw, 1.65rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.waiting-list-brand i {
  font-size: 0.92em;
  line-height: 1;
}

.waiting-list-hero h1 {
  margin: 0;
  max-width: 14ch;
  color: var(--text);
  font-size: clamp(1.7rem, 4.6vw, 2.2rem);
  font-weight: 650;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.waiting-list-lead {
  margin: 0;
  max-width: 34ch;
  color: var(--text-muted);
  font-size: 0.98rem;
  line-height: 1.6;
  font-weight: 450;
}

.waiting-list-panel {
  display: grid;
  gap: 1rem;
  padding: clamp(1.15rem, 3vw, 1.4rem);
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: color-mix(in srgb, var(--surface-strong) 94%, transparent);
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 35%, transparent) inset,
    0 18px 40px color-mix(in srgb, var(--text) 5%, transparent);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.waiting-list-panel.is-joined {
  border-color: color-mix(in srgb, var(--success) 28%, var(--border));
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 30%, transparent) inset,
    0 18px 40px color-mix(in srgb, var(--success) 8%, transparent);
}

.waiting-list-form {
  display: grid;
  gap: 0.95rem;
}

.waiting-list-field {
  display: grid;
  gap: 0.4rem;
}

.waiting-list-label {
  margin: 0;
  color: var(--text);
  font-size: 0.86rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.waiting-list-input {
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 0.95rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  background: color-mix(in srgb, var(--bg) 55%, var(--surface-strong));
  color: var(--text);
  font-size: 1rem;
  line-height: 1.35;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.waiting-list-input::placeholder {
  color: color-mix(in srgb, var(--text-muted) 78%, transparent);
}

.waiting-list-input:hover:not(:disabled):not(:focus) {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border));
}

.waiting-list-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 58%, var(--border));
  box-shadow: var(--ring, 0 0 0 3px color-mix(in srgb, var(--accent) 28%, transparent));
  background: var(--surface-strong);
}

.waiting-list-input.is-invalid {
  border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
}

.waiting-list-input.is-invalid:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 22%, transparent);
}

.waiting-list-input:disabled {
  opacity: 0.68;
  cursor: not-allowed;
}

.waiting-list-field-error {
  margin: 0;
  color: var(--danger-strong, var(--danger));
  font-size: 0.82rem;
  line-height: 1.35;
  font-weight: 550;
}

.waiting-list-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 50px;
  margin-top: 0.15rem;
  padding: 0.8rem 1.15rem;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: var(--text-on-accent, #fffaf5);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.015em;
  cursor: pointer;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--accent) 20%, transparent);
  transition: transform 0.22s var(--wl-ease), filter 0.2s ease, box-shadow 0.22s ease, opacity 0.2s ease;
}

.waiting-list-submit i {
  font-size: 1.05rem;
  line-height: 1;
  transition: transform 0.22s var(--wl-ease);
}

.waiting-list-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.waiting-list-submit:hover:not(:disabled) i:not(.spin-icon) {
  transform: translateX(2px);
}

.waiting-list-submit:active:not(:disabled) {
  transform: translateY(0);
}

.waiting-list-submit:disabled {
  opacity: 0.72;
  cursor: wait;
  transform: none;
  filter: none;
  box-shadow: none;
}

.waiting-list-note {
  margin: 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.waiting-list-alert {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  align-items: start;
  padding: 0.8rem 0.9rem;
  border-radius: 13px;
  font-size: 0.9rem;
  line-height: 1.45;
  font-weight: 500;
}

.waiting-list-alert i {
  margin-top: 0.1rem;
  line-height: 1;
}

.waiting-list-alert--error {
  background: var(--danger-soft, color-mix(in srgb, var(--danger) 12%, transparent));
  color: var(--danger-strong, var(--danger));
  border: 1px solid color-mix(in srgb, var(--danger) 26%, transparent);
}

.waiting-list-success {
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.25rem 0.2rem;
  text-align: center;
  animation: waitingListSuccessIn 0.55s var(--wl-ease) both;
}

.waiting-list-success-icon {
  width: 3rem;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--success-soft, color-mix(in srgb, var(--success) 16%, transparent));
  color: var(--success-strong, var(--success));
  font-size: 1.45rem;
}

.waiting-list-success h2 {
  margin: 0;
  max-width: 22ch;
  color: var(--text);
  font-size: 1.2rem;
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.25;
}

.waiting-list-success p {
  margin: 0;
  max-width: 32ch;
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}

.waiting-list-ghost-btn {
  margin-top: 0.35rem;
  padding: 0.55rem 0.9rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--accent-strong);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.waiting-list-ghost-btn:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.waiting-list-reveal {
  animation: waitingListIn 0.65s var(--wl-ease) both;
  animation-delay: var(--d, 0ms);
}

.spin-icon {
  animation: waitingListSpin 0.85s linear infinite;
}

@keyframes waitingListIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes waitingListSuccessIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes waitingListSpin {
  to {
    transform: rotate(360deg);
  }
}

html[dir="rtl"] .waiting-list-submit:hover:not(:disabled) i:not(.spin-icon) {
  transform: translateX(-2px);
}

@media (min-width: 768px) {
  .waiting-list-page {
    min-height: calc(100dvh - var(--nav-h, 64px) - 3rem);
  }

  .waiting-list-shell {
    width: min(28rem, calc(100% - 4rem));
  }
}

@media (prefers-reduced-motion: reduce) {
  .waiting-list-reveal,
  .waiting-list-success,
  .spin-icon {
    animation: none;
  }

  .waiting-list-submit:hover:not(:disabled),
  .waiting-list-submit:hover:not(:disabled) i {
    transform: none;
  }
}
</style>
