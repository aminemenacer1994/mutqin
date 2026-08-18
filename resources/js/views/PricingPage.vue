<template>
  <div class="pricing-page">
    <div class="pricing-shell">
      <header class="pricing-hero">
        <h1>{{ t('pricingPage.title') }}</h1>
        <p>{{ t('pricingPage.subtitle') }}</p>
        <p v-if="!isAuthenticated" class="pricing-checkout-note">{{ t('pricingPage.checkoutNote') }}</p>
      </header>

      <div class="pricing-billing">
        <div
          class="pricing-billing-toggle"
          role="group"
          :aria-label="t('pricingPage.billingToggleLabel')"
          :data-cycle="billingCycle"
        >
          <span class="pricing-billing-thumb" aria-hidden="true"></span>
          <button
            type="button"
            :class="{ 'is-active': billingCycle === 'monthly' }"
            @click="billingCycle = 'monthly'"
          >
            {{ t('homepage.pricing.monthly') }}
          </button>
          <button
            type="button"
            :class="{ 'is-active': billingCycle === 'annual' }"
            @click="billingCycle = 'annual'"
          >
            {{ t('homepage.pricing.yearly') }}
            <span class="pricing-billing-save">{{ t('pricingPage.annualSavings') }}</span>
          </button>
        </div>
      </div>

      <div class="pricing-grid">
        <article
          v-for="plan in plans"
          :key="plan.id"
          class="pricing-card"
          :class="{ 'pricing-card--featured': plan.featured }"
        >
          <div class="pricing-card-head">
            <div class="pricing-card-title">
              <h2>{{ plan.name }}</h2>
              <span v-if="plan.badge" class="pricing-badge" :class="plan.badgeClass">
                {{ plan.badge }}
              </span>
            </div>
            <div class="pricing-price">
              <span class="pricing-price-currency">£</span>
              <span class="pricing-price-amount">{{ plan.amount }}</span>
              <span v-if="plan.period" class="pricing-price-period">{{ plan.period }}</span>
            </div>
            <p v-if="plan.note" class="pricing-price-note">{{ plan.note }}</p>
          </div>

          <ul class="pricing-features">
            <li v-for="(feature, idx) in plan.features" :key="`${plan.id}-${idx}`">
              <i class="bi bi-check-lg" aria-hidden="true"></i>
              <span>{{ feature }}</span>
            </li>
          </ul>

          <div class="pricing-card-action">
            <a
              v-if="plan.ctaType === 'link'"
              :href="plan.ctaHref"
              class="pricing-btn"
              :class="plan.ctaClass"
            >
              {{ plan.ctaLabel }}
            </a>
            <form v-else method="POST" action="/checkout">
              <input type="hidden" name="_token" :value="csrfToken">
              <input type="hidden" name="plan" :value="plan.checkoutPlan">
              <button type="submit" class="pricing-btn" :class="plan.ctaClass">
                {{ plan.ctaLabel }}
              </button>
            </form>
          </div>
        </article>
      </div>

      <section class="pricing-compare" aria-labelledby="pricing-compare-heading">
        <h2 id="pricing-compare-heading">{{ t('homepage.feature_comparison') }}</h2>

        <div class="pricing-table-wrap">
          <table class="pricing-table">
            <thead>
              <tr>
                <th>{{ t('homepage.pricing.featureColumn') }}</th>
                <th>{{ t('homepage.free') }}</th>
                <th class="col-premium">{{ t('homepage.pricing.premium') }}</th>
                <th>{{ t('homepage.pro') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comparisonRows" :key="row.id">
                <th scope="row">{{ row.feature }}</th>
                <td>
                  <span :class="valClass(row.free)">
                    <i v-if="valCell(row.free).icon" class="bi" :class="valCell(row.free).icon" aria-hidden="true"></i>
                    <span v-if="valCell(row.free).label">{{ valCell(row.free).label }}</span>
                  </span>
                </td>
                <td class="col-premium">
                  <span :class="valClass(row.premium)">
                    <i v-if="valCell(row.premium).icon" class="bi" :class="valCell(row.premium).icon" aria-hidden="true"></i>
                    <span v-if="valCell(row.premium).label">{{ valCell(row.premium).label }}</span>
                  </span>
                </td>
                <td>
                  <span :class="valClass(row.pro)">
                    <i v-if="valCell(row.pro).icon" class="bi" :class="valCell(row.pro).icon" aria-hidden="true"></i>
                    <span v-if="valCell(row.pro).label">{{ valCell(row.pro).label }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pricing-compare-mobile">
          <div class="pricing-compare-mobile-head" aria-hidden="true">
            <span>{{ t('homepage.free') }}</span>
            <span class="is-premium">{{ t('homepage.pricing.premium') }}</span>
            <span>{{ t('homepage.pro') }}</span>
          </div>
          <div v-for="row in comparisonRows" :key="`m-${row.id}`" class="pricing-compare-row">
            <h3>{{ row.feature }}</h3>
            <div class="pricing-compare-cells">
              <div class="pricing-compare-cell">
                <span :class="valClass(row.free)">
                  <i v-if="valCell(row.free).icon" class="bi" :class="valCell(row.free).icon" aria-hidden="true"></i>
                  <span v-if="valCell(row.free).label">{{ valCell(row.free).label }}</span>
                </span>
              </div>
              <div class="pricing-compare-cell is-premium">
                <span :class="valClass(row.premium)">
                  <i v-if="valCell(row.premium).icon" class="bi" :class="valCell(row.premium).icon" aria-hidden="true"></i>
                  <span v-if="valCell(row.premium).label">{{ valCell(row.premium).label }}</span>
                </span>
              </div>
              <div class="pricing-compare-cell">
                <span :class="valClass(row.pro)">
                  <i v-if="valCell(row.pro).icon" class="bi" :class="valCell(row.pro).icon" aria-hidden="true"></i>
                  <span v-if="valCell(row.pro).label">{{ valCell(row.pro).label }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';

export default {
  name: 'PricingPage',
  setup() {
    const { t } = useI18n();
    const billingCycle = ref('annual');
    const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
    const isAuthenticated = ref(!!window.mutqinAuthCheck);

    const startFreeHref = computed(() => (window.mutqinAuthCheck ? '/memorisation' : '/register'));

    onMounted(() => {
      setGlobalTheme(getSavedTheme(), { dispatchEvent: false });
      window.addEventListener('mutqin:theme-change', handleThemeChange);
    });

    onUnmounted(() => {
      window.removeEventListener('mutqin:theme-change', handleThemeChange);
    });

    function handleThemeChange() {
      setGlobalTheme(getSavedTheme(), { dispatchEvent: false });
    }

    const valClass = (value) => {
      if (value === true) return 'pricing-val pricing-val--yes pricing-val--icon';
      if (value === false) return 'pricing-val pricing-val--no pricing-val--icon';
      return 'pricing-val pricing-val--text';
    };

    const valCell = (value) => {
      if (value === true) return { icon: 'bi-check-lg', label: '' };
      if (value === false) return { icon: 'bi-x-lg', label: '' };
      return { icon: '', label: String(value ?? '') };
    };

    const comparisonRows = computed(() => [
      { id: 'savedSessions', feature: t('homepage.comparison.savedSessions'), free: '3', premium: '5', pro: t('homepage.comparison.unlimited') },
      { id: 'focusMode', feature: t('homepage.comparison.focusMode'), free: true, premium: true, pro: true },
      { id: 'blurMethod', feature: t('homepage.comparison.blurMethod'), free: false, premium: true, pro: true },
      { id: 'chainingPractice', feature: t('homepage.comparison.chainingPractice'), free: false, premium: true, pro: true },
      { id: 'aiRecitationReview', feature: t('homepage.comparison.aiRecitationReview'), free: false, premium: false, pro: true },
      { id: 'offlineDownloads', feature: t('homepage.comparison.offlineDownloads'), free: false, premium: false, pro: true }
    ]);

    const premiumPrice = computed(() => (billingCycle.value === 'annual' ? '1.50' : '2.99'));
    const proPrice = computed(() => (billingCycle.value === 'annual' ? '4.17' : '5.99'));

    const plans = computed(() => {
      const annual = billingCycle.value === 'annual';

      return [
        {
          id: 'free',
          name: t('homepage.free'),
          amount: '0',
          period: '',
          note: t('pricingPage.freeForever'),
          badge: '',
          badgeClass: '',
          features: [
            t('homepage.planFeatures.savedSessions3'),
            t('homepage.planFeatures.basicAnalytics'),
            t('homepage.planFeatures.focusMode')
          ],
          featured: false,
          ctaType: 'link',
          ctaHref: startFreeHref.value,
          ctaLabel: t('homepage.start_free'),
          ctaClass: 'pricing-btn--secondary'
        },
        {
          id: 'premium',
          name: t('homepage.pricing.premium'),
          amount: premiumPrice.value,
          period: t('homepage.pricing.perMonth'),
          note: annual ? t('pricingPage.billedAnnually', { amount: '17.99' }) : t('pricingPage.billedMonthly'),
          badge: annual ? t('pricingPage.premiumDiscount') : t('homepage.most_useful'),
          badgeClass: 'pricing-badge--accent',
          features: [
            t('homepage.planFeatures.savedSessions5'),
            t('homepage.planFeatures.blurringMethod'),
            t('homepage.planFeatures.chainingMethod'),
            t('homepage.planFeatures.manualSelfAssessment')
          ],
          featured: true,
          ctaType: 'form',
          checkoutPlan: annual ? 'premium_yearly' : 'premium_monthly',
          ctaLabel: t('pricingPage.buyPremium'),
          ctaClass: 'pricing-btn--primary'
        },
        {
          id: 'pro',
          name: t('homepage.pro'),
          amount: proPrice.value,
          period: t('homepage.pricing.perMonth'),
          note: annual ? t('pricingPage.billedAnnually', { amount: '49.99' }) : t('pricingPage.billedMonthly'),
          badge: annual ? t('pricingPage.proDiscount') : t('pricingPage.trialBadge'),
          badgeClass: annual ? 'pricing-badge--accent' : 'pricing-badge--soft',
          features: [
            t('homepage.planFeatures.savedSessionsUnlimited'),
            t('homepage.planFeatures.aiRecitation'),
            t('homepage.planFeatures.aiMemorisationChecker'),
            t('homepage.planFeatures.offlineDownloads')
          ],
          featured: false,
          ctaType: 'form',
          checkoutPlan: annual ? 'pro_yearly' : 'pro_monthly',
          ctaLabel: t('pricingPage.buyPro'),
          ctaClass: 'pricing-btn--primary'
        }
      ];
    });

    return {
      t,
      billingCycle,
      csrfToken,
      isAuthenticated,
      plans,
      comparisonRows,
      valClass,
      valCell
    };
  }
};
</script>
