<template>
  <section class="donation-page">
    <div class="donation-shell">
      <header class="donation-hero info-reveal">
        <div class="donation-copy">
          <span class="donation-kicker">
            <i class="bi bi-moon-stars" aria-hidden="true"></i>
            {{ t('donate.kicker') }}
          </span>
          <h1>{{ t('donate.title') }}</h1>
          <p class="donation-lead">{{ t('donate.lead') }}</p>
          <p class="donation-body">{{ t('donate.body') }}</p>
          <div class="donation-arabic-block">
            <p class="donation-arabic" dir="rtl" lang="ar">{{ t('donate.arabicLine') }}</p>
            <p class="donation-arabic-ref">{{ t('donate.arabicRef') }}</p>
          </div>
        </div>
      </header>

      <div class="donation-main">
      <section class="donation-grid donation-impact info-reveal" style="--d: 60ms" :aria-labelledby="impactHeadingId">
        <h2 :id="impactHeadingId" class="donation-section-title">{{ t('donate.impactTitle') }}</h2>
        <ul class="donation-uses">
          <li v-for="item in impactItems" :key="item.id" class="donation-impact-row">
            <span class="donation-impact-icon" aria-hidden="true">
              <i class="bi" :class="item.icon"></i>
            </span>
            <div class="donation-impact-copy">
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </li>
        </ul>
      </section>

      <div class="donation-focus info-reveal" style="--d: 100ms">
        <div class="donation-form-head">
          <h2 class="donation-section-title">{{ t('donate.formTitle') }}</h2>
          <p>{{ t('donate.formLead') }}</p>
        </div>

        <form
          class="donation-form"
          method="POST"
          novalidate
          @submit="onSubmit"
        >
          <input type="hidden" name="_token" :value="csrfToken">

          <fieldset class="donation-amounts">
            <legend>{{ t('donate.amountLabel') }}</legend>
            <div class="donation-amount-grid" role="group" :aria-label="t('donate.amountLabel')">
              <button
                v-for="preset in presets"
                :key="preset"
                type="button"
                class="donation-amount-btn"
                :class="{ 'is-active': selectedPreset === preset && !customActive }"
                :aria-pressed="selectedPreset === preset && !customActive ? 'true' : 'false'"
                @click="selectPreset(preset)"
              >
                {{ currencySymbol }}{{ preset }}
              </button>
            </div>
            <label class="donation-custom">
              <span>{{ t('donate.amountCustom') }}</span>
              <div class="donation-custom-input">
                <span aria-hidden="true">{{ currencySymbol }}</span>
                <input
                  v-model="customAmount"
                  name="amount"
                  type="number"
                  min="5"
                  max="10000"
                  step="0.01"
                  inputmode="decimal"
                  required
                  :aria-invalid="amountInvalid ? 'true' : 'false'"
                  @focus="customActive = true"
                  @input="onCustomInput"
                >
              </div>
            </label>
          </fieldset>

          <label v-if="!isAuthenticated" class="donation-field">
            <span>{{ t('donate.emailLabel') }}</span>
            <input
              v-model="donorEmail"
              name="email"
              type="email"
              autocomplete="email"
              maxlength="255"
              :placeholder="t('donate.emailPlaceholder')"
            >
          </label>

          <button type="submit" class="donation-submit" :disabled="checkoutBusy || amountInvalid">
            <i class="bi bi-shield-lock" aria-hidden="true"></i>
            {{ checkoutBusy ? t('donate.submitting') : t('donate.submit') }}
          </button>

          <p class="donation-trust">
            <i class="bi bi-patch-check" aria-hidden="true"></i>
            {{ t('donate.trustLine') }}
          </p>
        </form>
      </div>
      </div>

      <footer class="donation-cta info-reveal" style="--d: 160ms">
        <p class="donation-closing">{{ t('donate.closing') }}</p>
      </footer>
    </div>
  </section>
</template>

<script>
import { getSavedTheme, setGlobalTheme } from '../utils/theme';

const DEFAULT_AMOUNT = 10;
const PRESETS = [10, 25, 50, 100];

export default {
  name: 'DonationPage',
  data() {
    return {
      impactHeadingId: 'donation-impact-heading',
      csrfToken: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
      isAuthenticated: !!window.mutqinAuthCheck,
      checkoutBusy: false,
      selectedPreset: DEFAULT_AMOUNT,
      customAmount: String(DEFAULT_AMOUNT),
      customActive: false,
      donorEmail: '',
      currencySymbol: '£',
      presets: PRESETS,
    };
  },
  computed: {
    amountValue() {
      const parsed = Number.parseFloat(String(this.customAmount).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : NaN;
    },
    amountInvalid() {
      const value = this.amountValue;
      return !Number.isFinite(value) || value < 5 || value > 10000;
    },
    impactItems() {
      return [
        {
          id: 'hifz',
          icon: 'bi-journal-bookmark',
          title: this.t('donate.impact.hifz.title'),
          desc: this.t('donate.impact.hifz.desc'),
        },
        {
          id: 'students',
          icon: 'bi-people',
          title: this.t('donate.impact.students.title'),
          desc: this.t('donate.impact.students.desc'),
        },
        {
          id: 'trust',
          icon: 'bi-heart',
          title: this.t('donate.impact.trust.title'),
          desc: this.t('donate.impact.trust.desc'),
        },
      ];
    },
  },
  mounted() {
    setGlobalTheme(getSavedTheme(), { dispatchEvent: false, persist: false });
  },
  methods: {
    selectPreset(amount) {
      this.selectedPreset = amount;
      this.customActive = false;
      this.customAmount = String(amount);
    },
    onCustomInput() {
      this.customActive = true;
      if (PRESETS.includes(this.amountValue)) {
        this.selectedPreset = this.amountValue;
      }
    },
    async onSubmit(event) {
      event.preventDefault();
      if (this.checkoutBusy || this.amountInvalid) {
        return;
      }

      this.checkoutBusy = true;
      const checkoutUrl = new URL('/donate/checkout', window.location.href).href;

      try {
        const form = event.currentTarget;
        const response = await fetch(checkoutUrl, {
          method: 'POST',
          body: new FormData(form),
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload?.url) {
            window.location.assign(payload.url);
            return;
          }
        }

        if (response.status === 422) {
          window.location.assign('/donate');
          return;
        }

        window.location.assign('/donate?donation_error=1');
      } catch {
        window.location.assign('/donate?donation_error=1');
      } finally {
        this.checkoutBusy = false;
      }
    },
  },
};
</script>

<style src="../styles/donation-page.css"></style>
<style src="../styles/info-pages.css"></style>
