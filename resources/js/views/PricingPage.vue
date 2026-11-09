<template>
  <div class="pricing-page" :data-theme="currentTheme">
    <section class="pricing-intro">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.pricing.kicker') }}</p>
          <h1 class="pricing-title">{{ t('pricingPage.title') }}</h1>
          <p class="section-sub">{{ t('pricingPage.subtitle') }}</p>
        </header>

        <div v-if="showBillingSwitch" class="pricing-toolbar" data-reveal>
          <div class="pricing-switch" :class="{ 'pricing-switch--three': lifetimeEnabled && annualEnabled }" role="group" :aria-label="t('pricingPage.billingToggleLabel')">
            <button
              type="button"
              :class="{ 'is-active': billingCycle === 'monthly' }"
              :aria-pressed="billingCycle === 'monthly' ? 'true' : 'false'"
              @click="billingCycle = 'monthly'"
            >
              {{ t('homepage.pricing.monthly') }}
            </button>
            <button
              v-if="annualEnabled"
              type="button"
              :class="{ 'is-active': billingCycle === 'annual' }"
              :aria-pressed="billingCycle === 'annual' ? 'true' : 'false'"
              @click="billingCycle = 'annual'"
            >
              <span>{{ t('homepage.pricing.yearly') }}</span>
              <span class="pricing-switch-save">{{ t('pricingPage.annualSavings') }}</span>
            </button>
            <button
              v-if="lifetimeEnabled"
              type="button"
              :class="{ 'is-active': billingCycle === 'lifetime' }"
              :aria-pressed="billingCycle === 'lifetime' ? 'true' : 'false'"
              @click="billingCycle = 'lifetime'"
            >
              <span>{{ t('homepage.pricing.lifetime') }}</span>
              <span class="pricing-switch-save">{{ t('pricingPage.lifetimeSavings') }}</span>
            </button>
          </div>
        </div>

        <div class="pricing-grid">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="pricing-card"
            :class="{ 'pricing-card--featured': plan.featured }"
            data-reveal
          >
            <h2>{{ plan.name }}</h2>
            <p class="pricing-card-tagline">{{ plan.tagline }}</p>
            <div class="pricing-price">
              <span class="pricing-price-currency">{{ currencySymbol }}</span>
              <span class="pricing-price-amount">{{ plan.amount }}</span>
              <span v-if="plan.period" class="pricing-price-period">{{ plan.period }}</span>
            </div>
            <p v-if="plan.priceHint" class="pricing-price-hint">{{ plan.priceHint }}</p>
            <div class="pricing-card-action">
              <span v-if="plan.ctaType === 'current'" class="btn btn--secondary" aria-current="true">
                {{ plan.ctaLabel }}
              </span>
              <a
                v-else-if="plan.ctaType === 'link'"
                :href="plan.ctaHref"
                class="btn"
                :class="plan.ctaClass"
                @click="onUpgradeClick"
              >
                {{ plan.ctaLabel }}
              </a>
              <form v-else-if="plan.ctaType === 'portal'" method="POST" action="/billing/portal" @submit="onBillingSubmit">
                <input type="hidden" name="_token" :value="csrfToken">
                <button type="submit" class="btn" :class="plan.ctaClass" :disabled="billingBusy">
                  {{ billingBusy ? t('pricingPage.submitting') : plan.ctaLabel }}
                </button>
              </form>
              <form
                v-else
                id="pricing-checkout-form"
                method="POST"
                action="/checkout"
                @submit="onBillingSubmit"
              >
                <input type="hidden" name="_token" :value="csrfToken">
                <input type="hidden" name="plan" :value="plan.checkoutPlan">
                <button type="submit" class="btn" :class="plan.ctaClass" :disabled="billingBusy">
                  {{ billingBusy ? t('pricingPage.submitting') : plan.ctaLabel }}
                </button>
              </form>
            </div>
            <ul class="pricing-features">
              <li v-for="(feature, idx) in plan.features" :key="`${plan.id}-${idx}`">
                <span>{{ feature }}</span>
              </li>
            </ul>
          </article>
        </div>

        <p class="pricing-assurance" data-reveal>{{ t('pricingPage.trustCancel') }} · {{ t('pricingPage.trustSecure') }}</p>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';
import { trackEvent as trackAckeeEvent, ACKEE_EVENTS } from '../scripts/analytics/ackee.js';
import { publicRegisterHref } from '../scripts/analytics/registerLinks.js';

function readBillingDisplay() {
  const billing = window.mutqinBilling || {};
  return {
    currencySymbol: billing.currencySymbol || '£',
    proMonthly: String(billing.proMonthly || '2.99'),
    proYearlyTotal: String(billing.proYearlyTotal || '26.91'),
    proYearlyMonthly: String(billing.proYearlyMonthly || '2.24'),
    proLifetime: String(billing.proLifetime || '53.82'),
    annualEnabled: billing.annualEnabled !== false,
    lifetimeEnabled: billing.lifetimeEnabled !== false,
    freeChecks: Number(billing.freeAiAssessmentsPerDay || 5),
  };
}

export default {
  name: 'PricingPage',
  setup() {
    const { t } = useI18n();
    const billingDisplay = readBillingDisplay();
    const currencySymbol = billingDisplay.currencySymbol;
    const annualEnabled = billingDisplay.annualEnabled;
    const lifetimeEnabled = billingDisplay.lifetimeEnabled;
    const showBillingSwitch = annualEnabled || lifetimeEnabled;
    const billingCycle = ref(initialBillingCycle());
    const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
    const isAuthenticated = ref(!!window.mutqinAuthCheck);
    const currentTheme = ref(getSavedTheme());
    const billingBusy = ref(false);
    let revealObserver = null;
    const subscriptionTier = computed(() => String(window.mutqinSubscriptionTier || 'free').toLowerCase());
    const hasPaidAccess = computed(() => !!window.mutqinHasPaidAccess);
    const canManageBilling = computed(() => !!window.mutqinCanManageBilling);
    const isCurrentPro = computed(() => isAuthenticated.value && hasPaidAccess.value && subscriptionTier.value === 'pro');
    const isCurrentFree = computed(() => isAuthenticated.value && !hasPaidAccess.value);

    onMounted(() => {
      setGlobalTheme(getSavedTheme(), { dispatchEvent: false, persist: false });
      currentTheme.value = getSavedTheme();
      window.addEventListener('mutqin:theme-change', handleThemeChange);
      observeReveals();
      startCheckoutIfRequested();
      trackAckeeEvent(ACKEE_EVENTS.PRICING_VIEWED);
    });

    onUnmounted(() => {
      window.removeEventListener('mutqin:theme-change', handleThemeChange);
      if (revealObserver) {
        revealObserver.disconnect();
        revealObserver = null;
      }
    });

    function handleThemeChange() {
      currentTheme.value = getSavedTheme();
      setGlobalTheme(currentTheme.value, { dispatchEvent: false, persist: false });
    }

    function onUpgradeClick() {
      trackAckeeEvent(ACKEE_EVENTS.UPGRADE_CLICKED);
    }

    function onBillingSubmit(event) {
      if (event?.target?.getAttribute('action') === '/checkout') {
        trackAckeeEvent(ACKEE_EVENTS.UPGRADE_CLICKED);
      }
      if (billingBusy.value) {
        event.preventDefault();
        return;
      }
      billingBusy.value = true;
    }

    function initialBillingCycle() {
      const plan = new URLSearchParams(window.location.search).get('plan');
      if (plan === 'pro_yearly' && billingDisplay.annualEnabled) return 'annual';
      if (plan === 'pro_lifetime' && billingDisplay.lifetimeEnabled) return 'lifetime';
      return 'monthly';
    }

    function selectedCheckoutPlan() {
      if (billingCycle.value === 'annual' && annualEnabled) return 'pro_yearly';
      if (billingCycle.value === 'lifetime' && lifetimeEnabled) return 'pro_lifetime';
      return 'pro_monthly';
    }

    function startCheckoutIfRequested() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') !== '1' || !isAuthenticated.value || hasPaidAccess.value) {
        return;
      }
      params.delete('checkout');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', next);
      window.setTimeout(() => {
        const form = document.getElementById('pricing-checkout-form');
        if (!form || billingBusy.value) return;
        billingBusy.value = true;
        trackAckeeEvent(ACKEE_EVENTS.UPGRADE_CLICKED);
        form.submit();
      }, 0);
    }

    function observeReveals() {
      const nodes = document.querySelectorAll('.pricing-page [data-reveal]');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        nodes.forEach((el) => el.classList.add('is-in'));
        return;
      }
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
      nodes.forEach((el) => revealObserver.observe(el));
    }

    const plans = computed(() => {
      const checks = billingDisplay.freeChecks;
      const freeFeatures = [
        t('pricingPage.simple.freeMemorise'),
        t('pricingPage.simple.freeMushaf'),
        t('pricingPage.simple.freeProgress'),
        t('pricingPage.simple.freeChecks', { count: checks }),
      ];
      const proFeatures = [
        t('pricingPage.simple.proAll'),
        t('pricingPage.simple.proChecks'),
        t('pricingPage.simple.proTools'),
      ];

      return [
        {
          id: 'free',
          name: t('homepage.free'),
          amount: '0',
          period: t('homepage.pricing.perMonth'),
          tagline: t('pricingPage.simple.freeDescription'),
          features: freeFeatures,
          featured: false,
          ...(isCurrentFree.value
            ? { ctaType: 'current', ctaLabel: t('pricingPage.currentPlan') }
            : {
              ctaType: 'link',
              ctaHref: isAuthenticated.value ? '/memorisation' : publicRegisterHref(),
              ctaLabel: t('pricingPage.simple.getStarted'),
              ctaClass: 'btn--secondary',
            }),
        },
        {
          id: 'pro',
          name: t('homepage.pro'),
          ...proPrice(),
          tagline: t('pricingPage.simple.proDescription'),
          features: proFeatures,
          featured: true,
          ...proCta(),
        },
      ];
    });

    function proPrice() {
      if (billingCycle.value === 'annual' && annualEnabled) {
        return {
          amount: billingDisplay.proYearlyTotal,
          period: t('homepage.pricing.perYear'),
          priceHint: t('pricingPage.yearlyEquivalent', {
            symbol: currencySymbol,
            amount: billingDisplay.proYearlyMonthly,
          }),
        };
      }
      if (billingCycle.value === 'lifetime' && lifetimeEnabled) {
        return {
          amount: billingDisplay.proLifetime,
          period: t('homepage.pricing.once'),
          priceHint: t('pricingPage.billedOnce'),
        };
      }
      return {
        amount: billingDisplay.proMonthly,
        period: t('homepage.pricing.perMonth'),
        priceHint: '',
      };
    }

    function proCta() {
      const checkoutPlan = selectedCheckoutPlan();
      if (isCurrentPro.value) {
        if (canManageBilling.value) {
          return { ctaType: 'portal', ctaLabel: t('pricingPage.currentPlan'), ctaClass: 'btn--primary' };
        }
        return { ctaType: 'current', ctaLabel: t('pricingPage.currentPlan') };
      }
      if (!isAuthenticated.value) {
        return {
          ctaType: 'link',
          ctaHref: `/register?plan=${checkoutPlan}`,
          ctaLabel: t('pricingPage.simple.upgrade'),
          ctaClass: 'btn--primary',
        };
      }
      return {
        ctaType: 'checkout',
        checkoutPlan,
        ctaLabel: t('pricingPage.simple.upgrade'),
        ctaClass: 'btn--primary',
      };
    }

    return {
      t,
      annualEnabled,
      lifetimeEnabled,
      showBillingSwitch,
      billingCycle,
      csrfToken,
      billingBusy,
      currentTheme,
      currencySymbol,
      plans,
      onBillingSubmit,
      onUpgradeClick,
    };
  },
};
</script>

<style src="../styles/pricing-page.css"></style>
<style src="./Homepage.css"></style>
