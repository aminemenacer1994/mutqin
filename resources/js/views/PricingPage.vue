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
            :class="plan.cardClass"
            data-reveal
          >
            <div class="pricing-card-top">
              <h2 class="pricing-plan-name">{{ plan.name }}</h2>
              <span
                v-if="plan.badge"
                class="pricing-badge"
                :class="plan.badgeClass"
              >{{ plan.badge }}</span>
            </div>
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
                :id="plan.checkoutFormId || undefined"
                method="POST"
                :action="checkoutFormAction"
                @submit="onBillingSubmit"
              >
                <input type="hidden" name="_token" :value="csrfToken">
                <input type="hidden" name="plan" :value="plan.checkoutPlan">
                <button type="submit" class="btn" :class="plan.ctaClass" :disabled="billingBusy">
                  {{ billingBusy ? t('pricingPage.submitting') : plan.ctaLabel }}
                </button>
              </form>
            </div>
            <ul class="pricing-features" :aria-label="plan.name">
              <li
                v-for="(feature, idx) in plan.features"
                :key="`${plan.id}-${idx}`"
                :class="feature.included ? 'is-included' : 'is-excluded'"
              >
                <span class="pricing-feature-main">
                  <i
                    class="bi"
                    :class="feature.included ? 'bi-check-circle-fill' : 'bi-x-circle-fill'"
                    aria-hidden="true"
                  ></i>
                  <span class="pricing-feature-name">{{ feature.name }}</span>
                </span>
                <span v-if="feature.value" class="pricing-feature-value" :class="{ 'is-highlight': feature.highlight }">{{ feature.value }}</span>
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
    premiumMonthly: String(billing.premiumMonthly || billing.proMonthly || '2.99'),
    premiumYearlyTotal: String(billing.premiumYearlyTotal || billing.proYearlyTotal || '26.91'),
    premiumYearlyMonthly: String(billing.premiumYearlyMonthly || billing.proYearlyMonthly || '2.24'),
    premiumLifetime: String(billing.premiumLifetime || billing.proLifetime || '53.82'),
    premiumPlusMonthly: String(billing.premiumPlusMonthly || '4.99'),
    premiumPlusYearlyTotal: String(billing.premiumPlusYearlyTotal || '44.91'),
    premiumPlusYearlyMonthly: String(billing.premiumPlusYearlyMonthly || '3.74'),
    premiumPlusLifetime: String(billing.premiumPlusLifetime || '89.82'),
    annualEnabled: billing.annualEnabled !== false,
    lifetimeEnabled: billing.lifetimeEnabled !== false,
    freeChecks: Number(billing.freeAiAssessmentsPerDay || 5),
    premiumChecks: Number(billing.premiumAiAssessmentsPerDay || 20),
    freeSaved: Number(billing.freeSavedSessions || 5),
    premiumSaved: Number(billing.premiumSavedSessions || 10),
    premiumFindAyah: Number(billing.premiumFindAyahPerDay || 10),
  };
}

function featureRow(name, value, included = true, highlight = false) {
  return { name, value, included: !!included, highlight: !!highlight };
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
    const checkoutFormAction = computed(() => {
      if (typeof window === 'undefined') {
        return '/checkout';
      }

      return new URL('/checkout', window.location.href).href;
    });
    let revealObserver = null;
    const subscriptionTier = computed(() => String(window.mutqinSubscriptionTier || 'free').toLowerCase());
    const hasPaidAccess = computed(() => !!window.mutqinHasPaidAccess);
    const canManageBilling = computed(() => !!window.mutqinCanManageBilling);
    const isCurrentPro = computed(() => isAuthenticated.value && hasPaidAccess.value && subscriptionTier.value === 'pro');
    const isCurrentPremium = computed(() => isAuthenticated.value && hasPaidAccess.value && subscriptionTier.value === 'premium');
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
      if (event?.target?.getAttribute('action')?.endsWith('/checkout')) {
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
      if (plan?.includes('yearly') && billingDisplay.annualEnabled) return 'annual';
      if (plan?.includes('lifetime') && billingDisplay.lifetimeEnabled) return 'lifetime';
      return 'monthly';
    }

    function checkoutPlan(prefix) {
      if (billingCycle.value === 'annual' && annualEnabled) return `${prefix}_yearly`;
      if (billingCycle.value === 'lifetime' && lifetimeEnabled) return `${prefix}_lifetime`;
      return `${prefix}_monthly`;
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
        const form = document.getElementById('pricing-checkout-form-premium');
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

    function tierPrice(prefix, amounts) {
      if (billingCycle.value === 'annual' && annualEnabled) {
        return {
          amount: amounts.yearlyTotal,
          period: t('homepage.pricing.perYear'),
          priceHint: t('pricingPage.yearlyEquivalent', {
            symbol: currencySymbol,
            amount: amounts.yearlyMonthly,
          }),
        };
      }
      if (billingCycle.value === 'lifetime' && lifetimeEnabled) {
        return {
          amount: amounts.lifetime,
          period: t('homepage.pricing.once'),
          priceHint: t('pricingPage.billedOnce'),
        };
      }
      return {
        amount: amounts.monthly,
        period: t('homepage.pricing.perMonth'),
        priceHint: '',
      };
    }

    function buildCta({ isCurrent, checkoutPlanKey, upgradeLabel, portalLabel, registerPlan, btnClass, checkoutFormId }) {
      if (isCurrent) {
        if (canManageBilling.value) {
          return { ctaType: 'portal', ctaLabel: portalLabel || t('pricingPage.currentPlan'), ctaClass: btnClass };
        }
        return { ctaType: 'current', ctaLabel: t('pricingPage.currentPlan') };
      }
      if (!isAuthenticated.value) {
        return {
          ctaType: 'link',
          ctaHref: `/register?plan=${registerPlan || checkoutPlanKey}`,
          ctaLabel: upgradeLabel,
          ctaClass: btnClass,
        };
      }
      if (hasPaidAccess.value) {
        if (canManageBilling.value) {
          return { ctaType: 'portal', ctaLabel: t('pricingPage.manageBilling'), ctaClass: btnClass };
        }
        return { ctaType: 'current', ctaLabel: t('pricingPage.currentPlan') };
      }
      return {
        ctaType: 'checkout',
        checkoutPlan: checkoutPlanKey,
        checkoutFormId,
        ctaLabel: upgradeLabel,
        ctaClass: btnClass,
      };
    }

    const plans = computed(() => {
      const included = t('pricingPage.comparisonValues.included');
      const unlimited = t('pricingPage.comparisonValues.unlimited');

      const freeFeatures = [
        featureRow(t('pricingPage.comparisonRows.aiChecks'), t('pricingPage.comparisonValues.perDay', { count: billingDisplay.freeChecks }), true),
        featureRow(t('pricingPage.comparisonRows.memorisationTools'), t('pricingPage.comparisonValues.essential'), true),
        featureRow(t('pricingPage.comparisonRows.savedSessions'), String(billingDisplay.freeSaved), true),
        featureRow(t('pricingPage.comparisonRows.translation'), included, true),
        featureRow(t('pricingPage.comparisonRows.transliteration'), included, true),
        featureRow(t('pricingPage.comparisonRows.analytics'), t('pricingPage.comparisonValues.basic'), true),
      ];

      const premiumFeatures = [
        featureRow(t('pricingPage.everythingInFree'), '', true),
        featureRow(t('pricingPage.comparisonRows.aiChecks'), t('pricingPage.comparisonValues.perDay', { count: billingDisplay.premiumChecks }), true),
        featureRow(t('pricingPage.comparisonRows.memorisationTools'), t('pricingPage.comparisonValues.advanced'), true),
        featureRow(t('pricingPage.comparisonRows.savedSessions'), String(billingDisplay.premiumSaved), true),
        featureRow(t('pricingPage.comparisonRows.findAyah'), t('pricingPage.comparisonValues.perDay', { count: billingDisplay.premiumFindAyah }), true),
        featureRow(t('pricingPage.comparisonRows.analytics'), t('pricingPage.comparisonValues.advanced'), true),
        featureRow(t('pricingPage.comparisonRows.wordByWord'), included, true),
      ];

      const plusFeatures = [
        featureRow(t('pricingPage.everythingInPremium'), '', true),
        featureRow(t('pricingPage.comparisonRows.aiChecks'), unlimited, true),
        featureRow(t('pricingPage.comparisonRows.savedSessions'), unlimited, true),
        featureRow(t('pricingPage.comparisonRows.findAyah'), unlimited, true),
        featureRow(t('pricingPage.comparisonRows.achievements'), t('pricingPage.comparisonValues.allLevels'), true),
        featureRow(t('pricingPage.comparisonRows.offlineAudio'), included, true),
      ];

      const premiumCheckout = checkoutPlan('premium');
      const plusCheckout = checkoutPlan('premium_plus');
      const plusTrialEligible = billingCycle.value !== 'lifetime';

      return [
        {
          id: 'free',
          name: t('homepage.free'),
          cardClass: 'pricing-card--neutral',
          amount: '0',
          period: t('pricingPage.freeForever'),
          features: freeFeatures,
          ...buildCta({
            isCurrent: isCurrentFree.value,
            checkoutPlanKey: 'premium_monthly',
            upgradeLabel: t('pricingPage.simple.getStartedFree'),
            btnClass: 'btn--secondary',
          }),
        },
        {
          id: 'premium',
          name: t('pricingPage.premium'),
          cardClass: 'pricing-card--featured',
          badge: t('pricingPage.recommended'),
          badgeClass: '',
          ...tierPrice('premium', {
            monthly: billingDisplay.premiumMonthly,
            yearlyTotal: billingDisplay.premiumYearlyTotal,
            yearlyMonthly: billingDisplay.premiumYearlyMonthly,
            lifetime: billingDisplay.premiumLifetime,
          }),
          features: premiumFeatures,
          ...buildCta({
            isCurrent: isCurrentPremium.value,
            checkoutPlanKey: premiumCheckout,
            upgradeLabel: t('pricingPage.simple.unlockPremium'),
            btnClass: 'btn--primary btn--premium',
            checkoutFormId: 'pricing-checkout-form-premium',
          }),
        },
        {
          id: 'premium_plus',
          name: t('pricingPage.premiumPlus'),
          cardClass: 'pricing-card--plus',
          badge: plusTrialEligible ? t('pricingPage.trialBadge') : null,
          badgeClass: 'pricing-badge--trial',
          ...tierPrice('premium_plus', {
            monthly: billingDisplay.premiumPlusMonthly,
            yearlyTotal: billingDisplay.premiumPlusYearlyTotal,
            yearlyMonthly: billingDisplay.premiumPlusYearlyMonthly,
            lifetime: billingDisplay.premiumPlusLifetime,
          }),
          features: plusFeatures,
          ...buildCta({
            isCurrent: isCurrentPro.value,
            checkoutPlanKey: plusCheckout,
            upgradeLabel: plusTrialEligible
              ? t('pricingPage.startFreeTrial')
              : t('pricingPage.simple.unlockPremiumPlus'),
            btnClass: 'btn--primary btn--plus',
          }),
        },
      ];
    });

    return {
      t,
      annualEnabled,
      lifetimeEnabled,
      showBillingSwitch,
      billingCycle,
      checkoutFormAction,
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