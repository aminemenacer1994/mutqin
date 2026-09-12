<template>
  <div class="pricing-page" :data-theme="currentTheme">
    <section class="pricing-intro">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('homepage.pricing.kicker') }}</p>
          <h1 class="pricing-title">{{ t('pricingPage.title') }}</h1>
          <p class="section-sub">{{ t('pricingPage.subtitle') }}</p>
        </header>

        <ul class="pricing-highlights" data-reveal>
          <li v-for="item in highlights" :key="item.id">
            <span class="pricing-highlights-icon" aria-hidden="true">
              <i class="bi" :class="item.icon"></i>
            </span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </li>
        </ul>

        <div class="pricing-toolbar" data-reveal>
          <div
            class="pricing-switch"
            role="group"
            :aria-label="t('pricingPage.billingToggleLabel')"
          >
            <button
              type="button"
              :class="{ 'is-active': billingCycle === 'monthly' }"
              :aria-pressed="billingCycle === 'monthly' ? 'true' : 'false'"
              @click="billingCycle = 'monthly'"
            >
              {{ t('homepage.pricing.monthly') }}
            </button>
            <button
              type="button"
              :class="{ 'is-active': billingCycle === 'annual' }"
              :aria-pressed="billingCycle === 'annual' ? 'true' : 'false'"
              @click="billingCycle = 'annual'"
            >
              {{ t('homepage.pricing.yearly') }}
            </button>
          </div>
          <p class="pricing-assurance">{{ t('pricingPage.switchAssurance') }}</p>
        </div>

        <div class="pricing-grid">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="pricing-card"
            :class="{ 'pricing-card--featured': plan.featured }"
            data-reveal
          >
            <div class="pricing-card-top">
              <div class="pricing-card-meta">
                <span class="pricing-card-icon" aria-hidden="true">
                  <i class="bi" :class="plan.icon"></i>
                </span>
                <span class="pricing-card-kicker">{{ plan.kicker }}</span>
              </div>
              <span v-if="plan.badge" class="pricing-badge">{{ plan.badge }}</span>
            </div>

            <h2>{{ plan.name }}</h2>
            <p class="pricing-card-tagline">{{ plan.tagline }}</p>

            <div class="pricing-price-block">
              <div class="pricing-price">
                <span class="pricing-price-currency">{{ currencySymbol }}</span>
                <span class="pricing-price-amount">{{ plan.amount }}</span>
                <span v-if="plan.wasAmount" class="pricing-price-was">{{ currencySymbol }}{{ plan.wasAmount }}</span>
                <span v-if="plan.period" class="pricing-price-period">{{ plan.period }}</span>
              </div>
              <p v-if="plan.note" class="pricing-price-note">{{ plan.note }}</p>
            </div>

            <div class="pricing-card-action">
              <a
                v-if="plan.ctaType === 'link'"
                :href="plan.ctaHref"
                class="btn"
                :class="plan.ctaClass"
              >
                {{ plan.ctaLabel }}
              </a>
              <form
                v-else-if="plan.ctaType === 'portal'"
                method="POST"
                action="/billing/portal"
                @submit="onBillingSubmit"
              >
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
              <p v-if="plan.ctaNote" class="pricing-cta-note">{{ plan.ctaNote }}</p>
            </div>

            <div class="pricing-includes">
              <h3>{{ t('pricingPage.includes') }}</h3>
              <ul class="pricing-features">
                <li
                  v-for="(feature, idx) in plan.features"
                  :key="`${plan.id}-${idx}`"
                  :class="{ 'is-highlight': feature.highlight }"
                >
                  <i class="bi" :class="feature.highlight ? 'bi-stars' : 'bi-check-lg'" aria-hidden="true"></i>
                  <span>{{ feature.label }}</span>
                </li>
              </ul>
            </div>

            <p v-if="plan.guaranteeTitle" class="pricing-guarantee">
              <i class="bi bi-shield-check" aria-hidden="true"></i>
              <span>
                <strong>{{ plan.guaranteeTitle }}</strong>
                {{ plan.guaranteeNote }}
              </span>
            </p>
          </article>
        </div>

        <ul class="pricing-trust" :aria-label="t('pricingPage.trustAria')" data-reveal>
          <li>
            <i class="bi bi-clock" aria-hidden="true"></i>
            <span>{{ t('pricingPage.trustTrial') }}</span>
          </li>
          <li>
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
            <span>{{ t('pricingPage.trustCancel') }}</span>
          </li>
          <li>
            <i class="bi bi-lock" aria-hidden="true"></i>
            <span>{{ t('pricingPage.trustSecure') }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section id="faq" class="faq">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ t('pricingPage.faq.kicker') }}</p>
          <h2 class="section-title">{{ t('pricingPage.faq.title') }}</h2>
          <p class="section-sub">{{ t('pricingPage.faq.subtitle') }}</p>
        </header>
        <div class="faq__shell" data-reveal>
          <div class="accordion faq__accordion" id="pricingFaq">
            <div class="accordion-item" v-for="(item, idx) in faqItems" :key="item.id">
              <h3 class="accordion-header" :id="`pricing-faq-heading-${idx}`">
                <button
                  class="accordion-button"
                  :class="{ collapsed: idx !== 0 }"
                  type="button"
                  data-bs-toggle="collapse"
                  :data-bs-target="`#pricing-faq-panel-${idx}`"
                  :aria-expanded="idx === 0 ? 'true' : 'false'"
                  :aria-controls="`pricing-faq-panel-${idx}`"
                >
                  {{ item.question }}
                </button>
              </h3>
              <div
                :id="`pricing-faq-panel-${idx}`"
                class="accordion-collapse collapse"
                :class="{ show: idx === 0 }"
                :aria-labelledby="`pricing-faq-heading-${idx}`"
                data-bs-parent="#pricingFaq"
              >
                <div class="accordion-body">{{ item.answer }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';

function readBillingDisplay() {
  const billing = window.mutqinBilling || {};
  return {
    currencySymbol: billing.currencySymbol || '£',
    proMonthly: String(billing.proMonthly || '5.99'),
    proYearlyMonthly: String(billing.proYearlyMonthly || '4.49'),
    proYearlyTotal: String(billing.proYearlyTotal || '53.91'),
  };
}

export default {
  name: 'PricingPage',
  setup() {
    const { t, locale } = useI18n();
    const billingDisplay = readBillingDisplay();
    const currencySymbol = billingDisplay.currencySymbol;
    const billingCycle = ref(initialBillingCycle());
    const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
    const isAuthenticated = ref(!!window.mutqinAuthCheck);
    const currentTheme = ref(getSavedTheme());
    const billingBusy = ref(false);
    let revealObserver = null;
    const checkoutPlanKey = computed(() => (billingCycle.value === 'annual' ? 'pro_yearly' : 'pro_monthly'));
    const registerHref = computed(() => `/register?plan=${checkoutPlanKey.value}`);

    const startFreeHref = computed(() => (window.mutqinAuthCheck ? '/memorisation' : '/register'));
    const subscriptionTier = computed(() => String(window.mutqinSubscriptionTier || 'free').toLowerCase());
    const hasPaidAccess = computed(() => !!window.mutqinHasPaidAccess);
    const canManageBilling = computed(() => !!window.mutqinCanManageBilling);

    const highlights = computed(() => [
      {
        id: 'start',
        icon: 'bi-play-circle',
        title: t('pricingPage.highlights.startTitle'),
        desc: t('pricingPage.highlights.startDesc')
      },
      {
        id: 'upgrade',
        icon: 'bi-stars',
        title: t('pricingPage.highlights.upgradeTitle'),
        desc: t('pricingPage.highlights.upgradeDesc')
      },
      {
        id: 'leave',
        icon: 'bi-shield-check',
        title: t('pricingPage.highlights.leaveTitle'),
        desc: t('pricingPage.highlights.leaveDesc')
      }
    ]);

    const faqPriceParams = computed(() => ({
      symbol: currencySymbol,
      monthly: billingDisplay.proMonthly,
      yearlyMonthly: billingDisplay.proYearlyMonthly,
      yearlyTotal: billingDisplay.proYearlyTotal,
    }));

    const faqItems = computed(() => {
      void locale.value;
      const prices = faqPriceParams.value;
      return [
        { id: 'cost', question: t('pricingPage.faq.items.cost.question'), answer: t('pricingPage.faq.items.cost.answer', prices) },
        { id: 'difference', question: t('pricingPage.faq.items.difference.question'), answer: t('pricingPage.faq.items.difference.answer') },
        { id: 'freeTools', question: t('pricingPage.faq.items.freeTools.question'), answer: t('pricingPage.faq.items.freeTools.answer') },
        { id: 'yearly', question: t('pricingPage.faq.items.yearly.question'), answer: t('pricingPage.faq.items.yearly.answer', prices) },
        { id: 'trial', question: t('pricingPage.faq.items.trial.question'), answer: t('pricingPage.faq.items.trial.answer') },
        { id: 'cancel', question: t('pricingPage.faq.items.cancel.question'), answer: t('pricingPage.faq.items.cancel.answer') },
        { id: 'account', question: t('pricingPage.faq.items.account.question'), answer: t('pricingPage.faq.items.account.answer') }
      ];
    });

    onMounted(() => {
      setGlobalTheme(getSavedTheme(), { dispatchEvent: false, persist: false });
      currentTheme.value = getSavedTheme();
      window.addEventListener('mutqin:theme-change', handleThemeChange);
      observeReveals();
      startCheckoutIfRequested();
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

    function onBillingSubmit(event) {
      if (billingBusy.value) {
        event.preventDefault();
        return;
      }
      billingBusy.value = true;
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
      window.setTimeout(() => {
        nodes.forEach((el) => el.classList.add('is-in'));
      }, 900);
    }

    const feature = (key, highlight = false) => ({
      label: t(key),
      highlight
    });

    const plans = computed(() => {
      const annual = billingCycle.value === 'annual';
      const isProSubscriber = isAuthenticated.value && hasPaidAccess.value && subscriptionTier.value === 'pro';
      const isPremiumSubscriber = isAuthenticated.value && hasPaidAccess.value && subscriptionTier.value === 'premium';

      return [
        {
          id: 'free',
          kicker: t('pricingPage.freeKicker'),
          name: t('homepage.free'),
          icon: 'bi-journal-text',
          amount: '0',
          wasAmount: '',
          period: t('pricingPage.freeForever'),
          tagline: t('pricingPage.freeTagline'),
          note: '',
          badge: '',
          features: [
            feature('pricingPage.freeFeatures.sessionSetup'),
            feature('pricingPage.freeFeatures.quranicFonts'),
            feature('pricingPage.freeFeatures.recitationChecks'),
            feature('homepage.planFeatures.savedSessions3'),
            feature('homepage.planFeatures.basicAnalytics')
          ],
          featured: false,
          ctaType: 'link',
          ctaHref: startFreeHref.value,
          ctaLabel: isAuthenticated.value ? t('pricingPage.continueFree') : t('homepage.start_free'),
          ctaClass: 'btn--secondary'
        },
        {
          id: 'pro',
          kicker: t('pricingPage.proKicker'),
          name: t('homepage.pro'),
          icon: 'bi-stars',
          amount: annual ? billingDisplay.proYearlyMonthly : billingDisplay.proMonthly,
          wasAmount: annual ? billingDisplay.proMonthly : '',
          period: t('homepage.pricing.perMonth'),
          tagline: t('pricingPage.proTagline'),
          note: annual ? t('pricingPage.billedAnnually', { amount: billingDisplay.proYearlyTotal, symbol: currencySymbol }) : '',
          badge: t('pricingPage.popular'),
          features: [
            { label: t('pricingPage.proFeatures.everythingInFree'), highlight: true },
            feature('pricingPage.proFeatures.recitationChecks'),
            feature('pricingPage.proFeatures.selfAssessedAudio'),
            feature('pricingPage.proFeatures.offlineAudio'),
            feature('pricingPage.proFeatures.lessonPlans'),
            feature('pricingPage.proFeatures.instantFeedback'),
            feature('pricingPage.proFeatures.progressInsights'),
            feature('pricingPage.proFeatures.mistakesAndWeakAyahs'),
            feature('pricingPage.proFeatures.advancedTools'),
            feature('pricingPage.proFeatures.unlimitedSessions')
          ],
          featured: true,
          guaranteeTitle: t('pricingPage.trialBadge'),
          guaranteeNote: t('pricingPage.guaranteeNote'),
          ctaNote: isProSubscriber
            ? (canManageBilling.value ? '' : t('pricingPage.billingSyncNeeded'))
            : (isPremiumSubscriber ? t('pricingPage.currentPremium') : ''),
          ...proCta(annual, isProSubscriber, isPremiumSubscriber)
        }
      ];
    });

    function proCta(annual, isProSubscriber, isPremiumSubscriber) {
      if (isProSubscriber) {
        if (canManageBilling.value) {
          return {
            ctaType: 'portal',
            ctaLabel: t('pricingPage.manageBilling'),
            ctaClass: 'btn--primary'
          };
        }

        return {
          ctaType: 'link',
          ctaHref: '/#contact',
          ctaLabel: t('pricingPage.contactSupport'),
          ctaClass: 'btn--primary'
        };
      }

      if (!isAuthenticated.value) {
        return {
          ctaType: 'link',
          ctaHref: registerHref.value,
          ctaLabel: t('pricingPage.getPro'),
          ctaClass: 'btn--primary'
        };
      }

      return {
        ctaType: 'checkout',
        checkoutPlan: annual ? 'pro_yearly' : 'pro_monthly',
        ctaLabel: (hasPaidAccess.value || isPremiumSubscriber) ? t('pricingPage.upgradeToPro') : t('pricingPage.getPro'),
        ctaClass: 'btn--primary'
      };
    }

    return {
      t,
      billingCycle,
      csrfToken,
      isAuthenticated,
      billingBusy,
      currentTheme,
      currencySymbol,
      highlights,
      faqItems,
      plans,
      onBillingSubmit
    };
  }
};

function initialBillingCycle() {
  const params = new URLSearchParams(window.location.search);
  const plan = String(params.get('plan') || '').toLowerCase();

  if (plan.endsWith('_yearly') || plan === 'annual' || plan === 'yearly') {
    return 'annual';
  }

  return 'monthly';
}
</script>

<style src="./Homepage.css"></style>
