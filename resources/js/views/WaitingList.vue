<template>
  <section class="waiting-list-page" aria-labelledby="waitingListTitle">
    <div class="waiting-list-shell">
      <header class="waiting-list-hero">
        <p class="waiting-list-kicker">
          <i class="bi bi-moon-stars-fill" aria-hidden="true"></i>
          {{ t('waitingList.kicker') }}
        </p>
        <p class="waiting-list-promo">{{ t('waitingList.promoOffer') }}</p>
        <h1 id="waitingListTitle">{{ t('waitingList.title') }}</h1>
        <p class="waiting-list-lead">{{ t('waitingList.subtitle') }}</p>
      </header>

      <div
        ref="panelEl"
        class="waiting-list-panel"
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
          <h2>{{ alreadyJoined ? t('waitingList.alreadyJoined') : t('waitingList.success') }}</h2>
          <p>{{ t('waitingList.successHint') }}</p>
          <p v-if="submittedEmail" class="waiting-list-success-email">
            {{ submittedEmail }}
          </p>
        </div>

        <form
          v-else
          :key="formResetKey"
          class="waiting-list-form"
          @submit.prevent="submit"
          novalidate
        >
          <div class="waiting-list-form-head">
            <h2 class="waiting-list-panel-title">{{ t('waitingList.formTitle') }}</h2>
            <p class="waiting-list-form-lead">{{ t('waitingList.formLead') }}</p>
          </div>

          <div
            v-if="status.type === 'error' && status.message"
            class="waiting-list-alert waiting-list-alert--error"
            role="alert"
            aria-live="assertive"
          >
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
            <span>{{ status.message }}</span>
          </div>

          <div class="waiting-list-form-fields">
          <div class="waiting-list-field">
            <label class="waiting-list-label" for="waitingListName">
              {{ t('waitingList.name') }}
            </label>
            <div class="waiting-list-input-wrap" :class="{ 'is-invalid': errors.name }">
              <i class="bi bi-person" aria-hidden="true"></i>
              <input
                id="waitingListName"
                ref="nameInput"
                v-model.trim="form.name"
                type="text"
                name="name"
                class="waiting-list-input"
                autocomplete="name"
                enterkeyhint="next"
                :disabled="submitting"
                :aria-invalid="errors.name ? 'true' : 'false'"
                :aria-describedby="errors.name ? 'waitingListNameError' : undefined"
                :placeholder="t('waitingList.namePlaceholder')"
                @input="clearFieldError('name')"
                @keydown.enter.prevent="emailInput?.focus()"
              >
            </div>
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
            <div class="waiting-list-input-wrap" :class="{ 'is-invalid': errors.email }">
              <i class="bi bi-envelope" aria-hidden="true"></i>
              <input
                id="waitingListEmail"
                ref="emailInput"
                v-model.trim="form.email"
                type="email"
                name="email"
                class="waiting-list-input"
                autocomplete="email"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="done"
                inputmode="email"
                :disabled="submitting"
                :aria-invalid="errors.email ? 'true' : 'false'"
                :aria-describedby="emailDescribedBy"
                :placeholder="t('waitingList.emailPlaceholder')"
                @input="clearFieldError('email')"
                @blur="validateEmailField"
              >
            </div>
            <p
              v-if="errors.email"
              id="waitingListEmailError"
              class="waiting-list-field-error"
            >
              {{ errors.email }}
            </p>
          </div>
          </div>

          <div class="waiting-list-form-actions">
            <button
              type="submit"
              class="waiting-list-submit"
              :disabled="submitDisabled"
              :aria-busy="submitting ? 'true' : 'false'"
              :aria-disabled="submitDisabled ? 'true' : 'false'"
            >
              <span>{{ submitting ? t('waitingList.joining') : t('waitingList.join') }}</span>
              <i
                class="bi"
                :class="submitting ? 'bi-arrow-repeat spin-icon' : 'bi-arrow-right'"
                aria-hidden="true"
              ></i>
            </button>
            <p class="waiting-list-form-note">{{ t('waitingList.privacyNote') }}</p>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  name: 'WaitingListPage',
  props: {
    count: {
      type: [Number, String],
      default: 0,
    },
  },
  setup(props) {
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
    const alreadyJoined = ref(false);
    const submittedEmail = ref('');
    const nameInput = ref(null);
    const emailInput = ref(null);
    const panelEl = ref(null);
    const formResetKey = ref(0);

    let errorStatusTimer = null;
    let successRestoreTimer = null;
    let emailErrorTimer = null;

    const clearErrorStatusTimer = () => {
      if (errorStatusTimer !== null) {
        clearTimeout(errorStatusTimer);
        errorStatusTimer = null;
      }
    };

    const clearSuccessRestoreTimer = () => {
      if (successRestoreTimer !== null) {
        clearTimeout(successRestoreTimer);
        successRestoreTimer = null;
      }
    };

    const clearEmailErrorTimer = () => {
      if (emailErrorTimer !== null) {
        clearTimeout(emailErrorTimer);
        emailErrorTimer = null;
      }
    };

    const setEmailFieldError = (message) => {
      if (!message) {
        clearEmailErrorTimer();
        delete errors.email;

        return;
      }

      errors.email = message;
      clearEmailErrorTimer();
      emailErrorTimer = setTimeout(() => {
        delete errors.email;
        form.email = '';
        emailErrorTimer = null;
      }, 5000);
    };

    const resetFormFields = () => {
      form.name = '';
      form.email = '';
      if (errors.name) {
        delete errors.name;
      }
      setEmailFieldError('');
    };

    const clearFormInputs = () => {
      resetFormFields();
      formResetKey.value += 1;
    };

    const scheduleValidationBannerDismiss = () => {
      clearErrorStatusTimer();
      errorStatusTimer = setTimeout(() => {
        if (status.type === 'error' && status.message === t('waitingList.errorFields')) {
          status.type = '';
          status.message = '';
        }
        errorStatusTimer = null;
      }, 5000);
    };

    const scheduleSuccessFormRestore = () => {
      clearSuccessRestoreTimer();
      successRestoreTimer = setTimeout(() => {
        joined.value = false;
        alreadyJoined.value = false;
        submittedEmail.value = '';
        status.type = '';
        status.message = '';
        clearFormInputs();
        successRestoreTimer = null;
      }, 5000);
    };

    const submitDisabled = computed(() => (
      submitting.value
      || form.name.trim() === ''
      || form.email.trim() === ''
    ));

    const emailDescribedBy = computed(() => (
      errors.email ? 'waitingListEmailError' : undefined
    ));

    const clearFieldError = (field) => {
      if (field === 'email') {
        setEmailFieldError('');
      } else if (errors[field]) {
        delete errors[field];
      }
      if (status.type === 'error') {
        clearErrorStatusTimer();
        status.type = '';
        status.message = '';
      }
    };

    const resetFeedback = () => {
      clearErrorStatusTimer();
      clearSuccessRestoreTimer();
      clearEmailErrorTimer();
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

    const isEmailValid = (email) => {
      const value = email.trim();
      if (!value) {
        return false;
      }
      if (!EMAIL_PATTERN.test(value)) {
        return false;
      }
      if (emailInput.value && typeof emailInput.value.checkValidity === 'function') {
        return emailInput.value.checkValidity();
      }
      return true;
    };

    const validateEmailField = () => {
      const email = form.email.trim();
      if (!email) {
        setEmailFieldError('');

        return;
      }
      if (!isEmailValid(email)) {
        setEmailFieldError(t('waitingList.errors.emailInvalid'));
      } else {
        setEmailFieldError('');
      }
    };

    const validate = () => {
      resetFeedback();
      const name = form.name.trim();
      const email = form.email.trim();

      if (!name) {
        errors.name = t('waitingList.errors.name');
      }

      if (!email) {
        setEmailFieldError(t('waitingList.errors.email'));
      } else if (!isEmailValid(email)) {
        setEmailFieldError(t('waitingList.errors.emailInvalid'));
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
        const name = form.name.trim();
        const email = form.email.trim();

        const endpoint = (typeof window !== 'undefined' && window.mutqinWaitingListEndpoint)
          ? window.mutqinWaitingListEndpoint
          : '/api/waiting-list';
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const crossOrigin = /^https?:\/\//i.test(endpoint)
          && origin !== ''
          && !endpoint.startsWith(origin);

        const response = await window.axios.post(endpoint, {
          name,
          email,
        }, crossOrigin ? {
          withCredentials: false,
          headers: {
            'X-CSRF-TOKEN': '',
          },
        } : {});

        alreadyJoined.value = Boolean(response?.data?.already_joined);
        submittedEmail.value = email;
        status.type = 'success';
        status.message = '';
        joined.value = true;
        resetFormFields();
        await nextTick();
        const reduceMotion = typeof window !== 'undefined'
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        panelEl.value?.scrollIntoView({
          block: 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
        scheduleSuccessFormRestore();
      } catch (error) {
        const validationErrors = error?.response?.data?.errors || {};

        if (validationErrors.name) {
          errors.name = t('waitingList.errors.name');
        }
        if (validationErrors.email) {
          const serverEmailError = Array.isArray(validationErrors.email)
            ? validationErrors.email[0]
            : validationErrors.email;
          setEmailFieldError(form.email.trim()
            ? (serverEmailError || t('waitingList.errors.emailInvalid'))
            : t('waitingList.errors.email'));
        }

        status.type = 'error';
        const serverMessage = error?.response?.data?.message;
        if (Object.keys(validationErrors).length) {
          status.message = t('waitingList.errorFields');
          scheduleValidationBannerDismiss();
        } else {
          status.message = typeof serverMessage === 'string' && serverMessage.trim() !== ''
            ? serverMessage
            : t('waitingList.errorSend');
        }
        await focusFirstInvalid();
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      document.body.classList.add('mutqin-early-access-nav');
    });

    onUnmounted(() => {
      clearErrorStatusTimer();
      clearSuccessRestoreTimer();
      clearEmailErrorTimer();
      document.body.classList.remove('mutqin-early-access-nav');
    });

    return {
      t,
      form,
      errors,
      status,
      submitting,
      submitDisabled,
      joined,
      alreadyJoined,
      submittedEmail,
      formResetKey,
      nameInput,
      emailInput,
      panelEl,
      emailDescribedBy,
      clearFieldError,
      validateEmailField,
      submit,
    };
  },
};
</script>

<style scoped>
@import url('https://fonts.bunny.net/css?family=source-serif-4:400,500,600,700');

.waiting-list-page {
  --wl-display: "Source Serif 4", "Iowan Old Style", Palatino, "Amiri", "Noto Naskh Arabic", Georgia, serif;
  --wl-cta-fg: var(--text-on-accent, #fffaf5);
  position: relative;
  min-height: calc(100dvh - var(--nav-h, 64px) - 2rem);
  display: grid;
  align-content: start;
  padding: clamp(1.5rem, 4.5vw, 2.75rem) 0 clamp(2rem, 5vw, 3rem);
  overflow-x: clip;
  background:
    radial-gradient(ellipse 70% 45% at 50% -10%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 70%);
}

.waiting-list-shell {
  width: min(58rem, calc(100% - clamp(1.25rem, 5vw, 3rem)));
  margin: 0 auto;
  display: grid;
  gap: clamp(1rem, 3vw, 1.35rem);
  align-items: start;
  min-width: 0;
}

.waiting-list-shell > * {
  min-width: 0;
}

.waiting-list-hero {
  display: grid;
  gap: 0.8rem;
  text-align: center;
  justify-items: center;
}

.waiting-list-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  padding: 0.32rem 0.72rem 0.32rem 0.55rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
  background: color-mix(in srgb, var(--surface-strong) 78%, var(--accent-light));
  color: var(--accent-strong);
  font-size: 0.74rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
}

.waiting-list-kicker i {
  font-size: 0.85rem;
}

.waiting-list-promo {
  margin: 0;
  max-width: 32ch;
  color: color-mix(in srgb, var(--accent-strong) 88%, var(--text));
  font-size: clamp(0.92rem, 2.4vw, 1rem);
  font-weight: 650;
  line-height: 1.4;
  text-wrap: pretty;
}

.waiting-list-hero h1 {
  margin: 0;
  max-width: 18ch;
  color: var(--text);
  font-family: var(--wl-display);
  font-size: clamp(2rem, 5.4vw, 3.15rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.12;
}

.waiting-list-lead {
  margin: 0;
  max-width: 38ch;
  color: color-mix(in srgb, var(--text-muted) 86%, var(--text));
  font-size: clamp(1rem, 2.8vw, 1.06rem);
  line-height: 1.55;
  font-weight: 450;
  text-wrap: pretty;
}

.waiting-list-panel {
  position: relative;
  display: grid;
  gap: 1rem;
  padding: clamp(1.25rem, 3.2vw, 1.7rem);
  scroll-margin-top: calc(var(--nav-h, 64px) + 0.85rem);
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  background: color-mix(in srgb, var(--surface-strong) 92%, var(--bg));
  box-shadow: 0 10px 28px -24px color-mix(in srgb, var(--text) 22%, transparent);
}

.waiting-list-panel.is-joined {
  border-color: color-mix(in srgb, var(--success) 22%, var(--border));
  box-shadow: 0 10px 28px -24px color-mix(in srgb, var(--success) 12%, transparent);
}

.waiting-list-form-head {
  display: grid;
  gap: 0.35rem;
}

.waiting-list-panel-title {
  margin: 0;
  color: var(--text);
  font-family: var(--wl-display);
  font-size: clamp(1.25rem, 4vw, 1.45rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.waiting-list-form-lead {
  margin: 0;
  color: color-mix(in srgb, var(--text-muted) 78%, var(--text));
  font-size: 0.9rem;
  line-height: 1.45;
  text-wrap: pretty;
}

.waiting-list-form {
  display: grid;
  gap: 1.05rem;
}

.waiting-list-form-fields {
  display: grid;
  gap: 0.85rem;
}

.waiting-list-form-actions {
  display: grid;
  gap: 0.55rem;
}

.waiting-list-form-note {
  margin: 0;
  color: color-mix(in srgb, var(--text-muted) 88%, var(--text));
  font-size: 0.78rem;
  line-height: 1.4;
  text-align: center;
  text-wrap: pretty;
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

.waiting-list-input-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.55rem;
  min-height: 48px;
  padding: 0 0.85rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  background: color-mix(in srgb, var(--bg) 40%, var(--surface));
  transition: border-color 0.2s ease, background 0.2s ease;
}

.waiting-list-input-wrap i {
  color: color-mix(in srgb, var(--text-muted) 70%, var(--accent));
  font-size: 1.05rem;
  line-height: 1;
}

.waiting-list-input {
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 16px;
  line-height: 1.35;
}

.waiting-list-input::placeholder {
  color: color-mix(in srgb, var(--text-muted) 92%, var(--text));
  opacity: 1;
}

.waiting-list-input:focus {
  outline: none;
}

.waiting-list-input-wrap:hover:not(:focus-within):not(.is-invalid) {
  border-color: color-mix(in srgb, var(--border) 55%, var(--text-muted));
}

.waiting-list-input-wrap:focus-within {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
  background: color-mix(in srgb, var(--surface-strong) 88%, var(--bg));
}

.waiting-list-input-wrap.is-invalid {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
}

.waiting-list-input-wrap.is-invalid:focus-within {
  border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
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
  gap: 0.55rem;
  width: 100%;
  min-height: 48px;
  margin-top: 0;
  padding: 0.8rem 1.1rem;
  border: 0;
  border-radius: 12px;
  background: var(--accent);
  color: var(--wl-cta-fg);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: -0.015em;
  cursor: pointer;
  box-shadow: none;
  transition: filter 0.15s ease, opacity 0.15s ease;
}

.waiting-list-submit i {
  font-size: 1.05rem;
  line-height: 1;
}

.waiting-list-submit:hover:not(:disabled) {
  filter: brightness(1.04);
}

.waiting-list-submit:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 70%, var(--text));
  outline-offset: 2px;
}

.waiting-list-submit:disabled {
  opacity: 0.62;
  cursor: not-allowed;
  transform: none;
  filter: none;
  box-shadow: none;
}

.waiting-list-submit[aria-busy="true"] {
  cursor: wait;
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
  background: var(--danger-soft, color-mix(in srgb, var(--danger) 10%, transparent));
  color: var(--danger-strong, var(--danger));
  border: 1px solid color-mix(in srgb, var(--danger) 18%, transparent);
}

.waiting-list-success {
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  padding: 1.15rem 0.25rem 0.45rem;
  text-align: center;
}

.waiting-list-success-icon {
  width: 3.4rem;
  height: 3.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--success-soft, color-mix(in srgb, var(--success) 16%, transparent));
  color: var(--success-strong, var(--success));
  font-size: 1.55rem;
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--success) 7%, transparent);
}

.waiting-list-success h2 {
  margin: 0;
  max-width: 22ch;
  color: var(--text);
  font-family: var(--wl-display);
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.waiting-list-success p {
  margin: 0;
  max-width: 32ch;
  color: color-mix(in srgb, var(--text-muted) 86%, var(--text));
  font-size: 0.95rem;
  line-height: 1.55;
}

.waiting-list-success-email {
  margin-top: 0.15rem !important;
  max-width: 100% !important;
  color: color-mix(in srgb, var(--text-muted) 82%, var(--text)) !important;
  font-size: 0.86rem !important;
  line-height: 1.4 !important;
  word-break: break-word;
}

.spin-icon {
  animation: waitingListSpin 0.85s linear infinite;
}

@keyframes waitingListSpin {
  to {
    transform: rotate(360deg);
  }
}

:global(html[data-theme="dark"]) .waiting-list-page {
  --wl-cta-fg: #1c140e;
}

@media (min-width: 900px) {
  .waiting-list-page {
    min-height: calc(100dvh - var(--nav-h, 64px) - 2rem);
    align-content: center;
    padding-top: clamp(1.75rem, 4vw, 3rem);
  }

  .waiting-list-shell {
    grid-template-columns: minmax(0, 1fr) minmax(20.5rem, 23.5rem);
    grid-template-areas:
      "intro panel";
    column-gap: clamp(1.35rem, 3vw, 2rem);
    row-gap: 1.1rem;
    align-items: center;
  }

  .waiting-list-hero {
    grid-area: intro;
    text-align: start;
    justify-items: start;
  }

  .waiting-list-panel {
    grid-area: panel;
    align-self: center;
  }

  .waiting-list-hero h1 {
    max-width: 14ch;
  }

  .waiting-list-lead {
    max-width: 36ch;
  }
}

@media (max-width: 899px) {
  .waiting-list-hero {
    width: 100%;
  }
}

@media (max-width: 419px) {
  .waiting-list-page {
    padding-bottom: clamp(1.75rem, 5vw, 2.5rem);
  }

  .waiting-list-shell {
    gap: 0.95rem;
  }

  .waiting-list-panel {
    padding: 1.1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin-icon {
    animation: none;
  }
}
</style>
