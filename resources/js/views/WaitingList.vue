<template>
  <section class="waiting-list-page" aria-labelledby="waitingListTitle">
    <div class="waiting-list-atmosphere" aria-hidden="true">
      <span class="waiting-list-orb waiting-list-orb--a"></span>
      <span class="waiting-list-orb waiting-list-orb--b"></span>
      <span class="waiting-list-orb waiting-list-orb--c"></span>
      <svg class="waiting-list-mark" viewBox="0 0 240 240" fill="none">
        <circle cx="120" cy="120" r="78" stroke="currentColor" stroke-width="1.2" opacity="0.35" />
        <circle cx="120" cy="120" r="54" stroke="currentColor" stroke-width="1.2" opacity="0.22" />
        <path
          d="M148 72c-28 8-48 34-48 64s20 56 48 64c-38-8-66-36-66-64s28-56 66-64z"
          fill="currentColor"
          opacity="0.12"
        />
      </svg>
    </div>

    <div class="waiting-list-shell">
      <header class="waiting-list-hero waiting-list-reveal">
        <p class="waiting-list-kicker">
          <i class="bi bi-moon-stars-fill" aria-hidden="true"></i>
          {{ t('waitingList.kicker') }}
        </p>
        <h1 id="waitingListTitle">{{ t('waitingList.title') }}</h1>
        <p class="waiting-list-lead">{{ t('waitingList.subtitle') }}</p>

        <ul class="waiting-list-benefits">
          <li
            v-for="benefit in benefits"
            :key="benefit.id"
            class="waiting-list-benefit"
          >
            <span class="waiting-list-benefit-icon" aria-hidden="true">
              <i class="bi" :class="benefit.icon"></i>
            </span>
            <div>
              <strong>{{ t(`waitingList.benefits.${benefit.id}.title`) }}</strong>
              <p>{{ t(`waitingList.benefits.${benefit.id}.desc`) }}</p>
            </div>
          </li>
        </ul>

        <blockquote class="waiting-list-ayah">
          <p class="waiting-list-ayah-ar" lang="ar" dir="rtl">{{ t('waitingList.ayahArabic') }}</p>
          <p class="waiting-list-ayah-tr">{{ t('waitingList.ayah') }}</p>
          <cite>{{ t('waitingList.ayahRef') }}</cite>
        </blockquote>
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
          <div class="waiting-list-panel-head">
            <p class="waiting-list-panel-kicker">{{ t('waitingList.formKicker') }}</p>
            <h2>{{ t('waitingList.formTitle') }}</h2>
            <p>{{ t('waitingList.formLead') }}</p>
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
                class="waiting-list-input"
                autocomplete="name"
                enterkeyhint="next"
                :disabled="submitting"
                :aria-invalid="errors.name ? 'true' : 'false'"
                :aria-describedby="errors.name ? 'waitingListNameError' : undefined"
                :placeholder="t('waitingList.namePlaceholder')"
                @input="clearFieldError('name')"
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
                class="waiting-list-input"
                autocomplete="email"
                enterkeyhint="done"
                inputmode="email"
                :disabled="submitting"
                :aria-invalid="errors.email ? 'true' : 'false'"
                :aria-describedby="errors.email ? 'waitingListEmailError' : undefined"
                :placeholder="t('waitingList.emailPlaceholder')"
                @input="clearFieldError('email')"
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

          <button
            type="submit"
            class="waiting-list-submit"
            :disabled="submitting"
            :aria-busy="submitting ? 'true' : 'false'"
          >
            <span>{{ submitting ? t('waitingList.joining') : t('waitingList.join') }}</span>
            <i
              class="bi"
              :class="submitting ? 'bi-arrow-repeat spin-icon' : 'bi-arrow-right'"
              aria-hidden="true"
            ></i>
          </button>

          <p class="waiting-list-note">
            <i class="bi bi-shield-check" aria-hidden="true"></i>
            {{ t('waitingList.privacyNote') }}
          </p>
        </form>
      </div>
    </div>
  </section>
</template>

<script>
import { nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const BENEFITS = [
  { id: 'access', icon: 'bi-bell' },
  { id: 'place', icon: 'bi-bookmark-heart' },
  { id: 'note', icon: 'bi-envelope-open' },
];

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
      if (window.matchMedia('(min-width: 900px)').matches) {
        nameInput.value?.focus();
      }
    });

    return {
      t,
      benefits: BENEFITS,
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
@import url('https://fonts.bunny.net/css?family=source-serif-4:400,500,600,700');

.waiting-list-page {
  --wl-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --wl-display: "Source Serif 4", "Iowan Old Style", Palatino, "Amiri", "Noto Naskh Arabic", Georgia, serif;
  position: relative;
  isolation: isolate;
  min-height: calc(100dvh - var(--nav-h, 64px) - 2rem);
  display: grid;
  align-content: center;
  padding: clamp(1.5rem, 4vw, 3rem) 0 clamp(2.75rem, 7vw, 4.5rem);
  overflow-x: hidden;
  overflow: hidden;
  overflow: clip;
}

.waiting-list-atmosphere {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  background:
    radial-gradient(ellipse 58% 48% at 12% -8%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 68%),
    radial-gradient(ellipse 42% 38% at 96% 8%, color-mix(in srgb, var(--accent-light) 55%, transparent), transparent 58%),
    radial-gradient(ellipse 36% 32% at 78% 96%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 62%);
}

.waiting-list-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(8px);
}

.waiting-list-orb--a {
  width: min(28rem, 70vw);
  height: min(28rem, 70vw);
  top: -12%;
  left: -8%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 68%);
}

.waiting-list-orb--b {
  width: min(22rem, 55vw);
  height: min(22rem, 55vw);
  right: -6%;
  top: 18%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent-light) 70%, transparent), transparent 70%);
}

.waiting-list-orb--c {
  width: 16rem;
  height: 16rem;
  left: 38%;
  bottom: -8%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%);
}

.waiting-list-mark {
  position: absolute;
  width: min(22rem, 58vw);
  right: -4%;
  bottom: -6%;
  color: var(--accent);
  opacity: 0.55;
}

.waiting-list-shell {
  width: min(68rem, calc(100% - clamp(1.35rem, 5vw, 3.25rem)));
  margin: 0 auto;
  display: grid;
  gap: clamp(1.75rem, 4vw, 3.25rem);
  align-items: center;
}

.waiting-list-hero {
  display: grid;
  gap: 0.85rem;
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
  max-width: 42ch;
  color: var(--text-muted);
  font-size: 1.02rem;
  line-height: 1.65;
  font-weight: 450;
}

.waiting-list-benefits {
  list-style: none;
  margin: 0.55rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
  width: min(34rem, 100%);
  text-align: start;
}

.waiting-list-benefit {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: start;
}

.waiting-list-benefit-icon {
  width: 2.35rem;
  height: 2.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 16%, var(--surface-strong));
  color: var(--accent-strong);
  font-size: 1.05rem;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
}

.waiting-list-benefit strong {
  display: block;
  margin: 0 0 0.15rem;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.waiting-list-benefit p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.waiting-list-ayah {
  margin: 0.55rem 0 0;
  padding: 0.95rem 0 0;
  max-width: 38ch;
  width: 100%;
  border-top: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
}

.waiting-list-ayah-ar {
  display: inline-block;
  margin: 0;
  color: var(--text);
  font-family: var(--font-ar, "Amiri Quran", "Amiri", "Noto Naskh Arabic", serif);
  font-size: clamp(1.45rem, 3.2vw, 1.75rem);
  font-style: normal;
  font-weight: 400;
  line-height: 1.85;
  unicode-bidi: isolate;
}

.waiting-list-ayah-tr {
  margin: 0.35rem 0 0;
  color: var(--text-muted);
  font-family: var(--wl-display);
  font-size: 0.95rem;
  font-style: italic;
  line-height: 1.5;
}

.waiting-list-ayah cite {
  display: block;
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-style: normal;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.waiting-list-panel {
  position: relative;
  display: grid;
  gap: 1rem;
  padding: clamp(1.25rem, 3.2vw, 1.7rem);
  border-radius: 26px;
  border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--border));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent-light) 28%, transparent), transparent 38%),
    color-mix(in srgb, var(--surface-strong) 96%, transparent);
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 42%, transparent) inset,
    0 22px 48px -24px color-mix(in srgb, var(--text) 28%, transparent),
    0 36px 64px -36px color-mix(in srgb, var(--accent) 22%, transparent);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.waiting-list-panel::before {
  content: "";
  position: absolute;
  inset-inline: 1.4rem;
  top: 0;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: linear-gradient(90deg, transparent, var(--accent), var(--accent-strong), transparent);
}

.waiting-list-panel.is-joined {
  border-color: color-mix(in srgb, var(--success) 28%, var(--border));
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 30%, transparent) inset,
    0 18px 40px color-mix(in srgb, var(--success) 8%, transparent);
}

.waiting-list-panel-head {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.15rem;
}

.waiting-list-panel-kicker {
  margin: 0;
  color: var(--accent-strong);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.waiting-list-panel-head h2 {
  margin: 0;
  color: var(--text);
  font-family: var(--wl-display);
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.waiting-list-panel-head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
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

.waiting-list-input-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.55rem;
  min-height: 50px;
  padding: 0 0.95rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  background: color-mix(in srgb, var(--bg) 58%, var(--surface-strong));
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.waiting-list-input-wrap i {
  color: color-mix(in srgb, var(--text-muted) 82%, var(--accent));
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
  font-size: 1rem;
  line-height: 1.35;
}

.waiting-list-input::placeholder {
  color: color-mix(in srgb, var(--text-muted) 78%, transparent);
}

.waiting-list-input:focus {
  outline: none;
}

.waiting-list-input-wrap:hover:not(:focus-within):not(.is-invalid) {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border));
}

.waiting-list-input-wrap:focus-within {
  border-color: color-mix(in srgb, var(--accent) 58%, var(--border));
  box-shadow: var(--ring, 0 0 0 3px color-mix(in srgb, var(--accent) 28%, transparent));
  background: var(--surface-strong);
}

.waiting-list-input-wrap.is-invalid {
  border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
}

.waiting-list-input-wrap.is-invalid:focus-within {
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
  gap: 0.55rem;
  width: 100%;
  min-height: 52px;
  margin-top: 0.15rem;
  padding: 0.85rem 1.15rem;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: var(--text-on-accent, #fffaf5);
  font-size: 1.02rem;
  font-weight: 680;
  letter-spacing: -0.015em;
  cursor: pointer;
  box-shadow: 0 12px 26px color-mix(in srgb, var(--accent) 24%, transparent);
  transition: transform 0.22s var(--wl-ease), filter 0.2s ease, box-shadow 0.22s ease, opacity 0.2s ease;
}

.waiting-list-submit i {
  font-size: 1.05rem;
  line-height: 1;
  transition: transform 0.22s var(--wl-ease);
}

.waiting-list-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 16px 30px color-mix(in srgb, var(--accent) 28%, transparent);
}

.waiting-list-submit:hover:not(:disabled) i:not(.spin-icon) {
  transform: translateX(3px);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.waiting-list-note i {
  color: var(--accent-strong);
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
  padding: 1.15rem 0.25rem 0.45rem;
  text-align: center;
  animation: waitingListSuccessIn 0.55s var(--wl-ease) both;
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
  color: var(--text-muted);
  font-size: 0.95rem;
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
  animation: waitingListIn 0.75s var(--wl-ease) both;
  animation-delay: var(--d, 0ms);
}

.spin-icon {
  animation: waitingListSpin 0.85s linear infinite;
}

@keyframes waitingListIn {
  from {
    opacity: 0;
    transform: translateY(18px);
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
  transform: translateX(-3px);
}

html[dir="rtl"] .waiting-list-mark {
  right: auto;
  left: -4%;
  transform: scaleX(-1);
}

@media (min-width: 900px) {
  .waiting-list-page {
    min-height: calc(100dvh - var(--nav-h, 64px) - 3rem);
  }

  .waiting-list-shell {
    grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 25.5rem);
    gap: clamp(2.5rem, 5vw, 4.25rem);
  }

  .waiting-list-hero {
    text-align: start;
    justify-items: start;
  }

  .waiting-list-hero h1 {
    max-width: 18ch;
  }

  .waiting-list-lead,
  .waiting-list-ayah {
    max-width: 38ch;
  }

  .waiting-list-mark {
    width: min(26rem, 38vw);
    right: 4%;
    bottom: 8%;
    opacity: 0.42;
  }
}

@media (max-width: 419px) {
  .waiting-list-ayah-tr {
    display: none;
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
