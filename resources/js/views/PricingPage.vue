<template>
  <div class="pricing-page" :data-theme="currentTheme">
    <div class="pricing-bg" aria-hidden="true">
      <span class="pricing-bg-orb pricing-bg-orb--one"></span>
    </div>

    <div class="pricing-shell">
      <header class="pricing-hero">
        <h1>{{ t('pricingPage.title') }}</h1>
        <p class="pricing-hero-subtitle">{{ t('pricingPage.subtitle') }}</p>
      </header>

      <section class="pricing-plans" aria-label="Plans">
        <div class="pricing-billing-wrap">
          <div
            class="pricing-billing-toggle"
            role="group"
            :aria-label="t('pricingPage.billingToggleLabel')"
            :data-cycle="billingCycle"
          >
            <span class="pricing-billing-thumb" aria-hidden="true"></span>
            <button
              type="button"
              class="pricing-billing-option"
              :class="{ 'is-active': billingCycle === 'monthly' }"
              @click="billingCycle = 'monthly'"
            >
              {{ t('homepage.pricing.monthly') }}
            </button>
            <button
              type="button"
              class="pricing-billing-option"
              :class="{ 'is-active': billingCycle === 'annual' }"
              @click="billingCycle = 'annual'"
            >
              {{ t('homepage.pricing.yearly') }}
              <span class="pricing-billing-save">{{ t('pricingPage.annualSavings') }}</span>
            </button>
          </div>
        </div>

        <div class="pricing-cards">
          <article
            v-for="plan in planCards"
            :key="plan.id"
            class="pricing-plan-card"
            :class="{
              'pricing-plan-card--featured': plan.featured,
              [`pricing-plan-card--${plan.id}`]: true
            }"
          >
            <div v-if="plan.badge" class="pricing-plan-badge" :class="plan.badgeClass">
              {{ plan.badge }}
            </div>

            <div class="pricing-plan-head">
              <h2>{{ plan.name }}</h2>
              <div class="pricing-plan-price">
                <span class="pricing-plan-currency">£</span>
                <span class="pricing-plan-amount">{{ plan.amount }}</span>
                <span v-if="plan.priceSuffix" class="pricing-plan-period">{{ plan.priceSuffix }}</span>
              </div>
              <p v-if="plan.billingNote" class="pricing-plan-billing-note">{{ plan.billingNote }}</p>
            </div>

            <ul class="pricing-plan-features">
              <li v-for="(feature, idx) in plan.features" :key="`${plan.id}-${idx}`">
                <i class="bi bi-check-lg" aria-hidden="true"></i>
                <span>{{ feature }}</span>
              </li>
            </ul>

            <div class="pricing-plan-footer">
              <a
                v-if="plan.ctaType === 'link'"
                :href="plan.ctaHref"
                class="pricing-plan-cta"
                :class="plan.ctaClass"
              >
                {{ plan.ctaLabel }}
              </a>
              <form v-else method="POST" action="/checkout">
                <input type="hidden" name="_token" :value="csrfToken">
                <input type="hidden" name="plan" :value="plan.checkoutPlan">
                <button type="submit" class="pricing-plan-cta" :class="plan.ctaClass">
                  {{ plan.ctaLabel }}
                </button>
              </form>
            </div>
          </article>
        </div>
      </section>

      <section class="pricing-comparison" aria-labelledby="pricing-comparison-heading">
        <h2 id="pricing-comparison-heading" class="pricing-section-title">
          {{ t('homepage.feature_comparison') }}
        </h2>

        <div class="pricing-comparison-table-wrap" role="region" :aria-label="t('homepage.feature_comparison')">
          <table class="pricing-comparison-table">
            <thead>
              <tr>
                <th>{{ t('homepage.pricing.featureColumn') }}</th>
                <th>{{ t('homepage.free') }}</th>
                <th class="is-highlight">{{ t('homepage.pricing.premium') }}</th>
                <th>{{ t('homepage.pro') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comparisonRows" :key="row.id">
                <th scope="row">{{ row.feature }}</th>
                <td>
                  <span :class="comparisonValueClass(row.free)">
                    <i v-if="comparisonCell(row.free).icon" class="bi" :class="comparisonCell(row.free).icon" aria-hidden="true"></i>
                    <span v-if="comparisonCell(row.free).label">{{ comparisonCell(row.free).label }}</span>
                  </span>
                </td>
                <td class="is-highlight">
                  <span :class="comparisonValueClass(row.premium)">
                    <i v-if="comparisonCell(row.premium).icon" class="bi" :class="comparisonCell(row.premium).icon" aria-hidden="true"></i>
                    <span v-if="comparisonCell(row.premium).label">{{ comparisonCell(row.premium).label }}</span>
                  </span>
                </td>
                <td>
                  <span :class="comparisonValueClass(row.pro)">
                    <i v-if="comparisonCell(row.pro).icon" class="bi" :class="comparisonCell(row.pro).icon" aria-hidden="true"></i>
                    <span v-if="comparisonCell(row.pro).label">{{ comparisonCell(row.pro).label }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pricing-comparison-cards" role="list" :aria-label="t('homepage.feature_comparison')">
          <article
            v-for="row in comparisonRows"
            :key="`comparison-card-${row.id}`"
            class="pricing-comparison-card"
            role="listitem"
          >
            <h3 class="pricing-comparison-card-feature">{{ row.feature }}</h3>
            <dl class="pricing-comparison-card-tiers">
              <div class="pricing-comparison-card-tier">
                <dt>{{ t('homepage.free') }}</dt>
                <dd>
                  <span :class="comparisonValueClass(row.free)">
                    <i v-if="comparisonCell(row.free).icon" class="bi" :class="comparisonCell(row.free).icon" aria-hidden="true"></i>
                    <span v-if="comparisonCell(row.free).label">{{ comparisonCell(row.free).label }}</span>
                  </span>
                </dd>
              </div>
              <div class="pricing-comparison-card-tier is-highlight">
                <dt>{{ t('homepage.pricing.premium') }}</dt>
                <dd>
                  <span :class="comparisonValueClass(row.premium)">
                    <i v-if="comparisonCell(row.premium).icon" class="bi" :class="comparisonCell(row.premium).icon" aria-hidden="true"></i>
                    <span v-if="comparisonCell(row.premium).label">{{ comparisonCell(row.premium).label }}</span>
                  </span>
                </dd>
              </div>
              <div class="pricing-comparison-card-tier">
                <dt>{{ t('homepage.pro') }}</dt>
                <dd>
                  <span :class="comparisonValueClass(row.pro)">
                    <i v-if="comparisonCell(row.pro).icon" class="bi" :class="comparisonCell(row.pro).icon" aria-hidden="true"></i>
                    <span v-if="comparisonCell(row.pro).label">{{ comparisonCell(row.pro).label }}</span>
                  </span>
                </dd>
              </div>
            </dl>
          </article>
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
    const currentTheme = ref(getSavedTheme());
    const billingCycle = ref('annual');
    const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');

    const startFreeHref = computed(() => (window.mutqinAuthCheck ? '/memorisation' : '/register'));

    const handleGlobalThemeChange = (event) => {
      currentTheme.value = event?.detail?.theme || getSavedTheme();
    };

    onMounted(() => {
      currentTheme.value = getSavedTheme();
      setGlobalTheme(currentTheme.value, { dispatchEvent: false });
      window.addEventListener('mutqin:theme-change', handleGlobalThemeChange);
    });

    onUnmounted(() => {
      window.removeEventListener('mutqin:theme-change', handleGlobalThemeChange);
    });

    const comparisonValueClass = (value) => {
      if (value === true) return 'comparison-value comparison-value-included comparison-value-icon';
      if (value === false) return 'comparison-value comparison-value-excluded comparison-value-icon';
      return 'comparison-value comparison-value-limited';
    };

    const comparisonCell = (value) => {
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

    const premiumDisplayPrice = computed(() => (billingCycle.value === 'annual' ? '1.50' : '2.99'));
    const proDisplayPrice = computed(() => (billingCycle.value === 'annual' ? '4.17' : '5.99'));

    const planCards = computed(() => {
      const isAnnual = billingCycle.value === 'annual';

      return [
        {
          id: 'free',
          name: t('homepage.free'),
          features: [
            t('homepage.planFeatures.savedSessions3'),
            t('homepage.planFeatures.basicAnalytics'),
            t('homepage.planFeatures.focusMode')
          ],
          amount: '0',
          priceSuffix: '',
          billingNote: t('pricingPage.freeForever'),
          badge: '',
          badgeClass: '',
          featured: false,
          ctaType: 'link',
          ctaHref: startFreeHref.value,
          ctaLabel: t('homepage.start_free'),
          ctaClass: 'pricing-plan-cta--secondary'
        },
        {
          id: 'premium',
          name: t('homepage.pricing.premium'),
          features: [
            t('homepage.planFeatures.savedSessions5'),
            t('homepage.planFeatures.blurringMethod'),
            t('homepage.planFeatures.chainingMethod'),
            t('homepage.planFeatures.manualSelfAssessment')
          ],
          amount: premiumDisplayPrice.value,
          priceSuffix: t('homepage.pricing.perMonth'),
          billingNote: isAnnual ? t('pricingPage.billedAnnually', { amount: '17.99' }) : t('pricingPage.billedMonthly'),
          badge: isAnnual ? t('pricingPage.premiumDiscount') : t('homepage.most_useful'),
          badgeClass: isAnnual ? 'pricing-plan-badge--discount' : 'pricing-plan-badge--popular',
          featured: true,
          ctaType: 'form',
          checkoutPlan: isAnnual ? 'premium_yearly' : 'premium_monthly',
          ctaLabel: t('pricingPage.buyPremium'),
          ctaClass: 'pricing-plan-cta--primary'
        },
        {
          id: 'pro',
          name: t('homepage.pro'),
          features: [
            t('homepage.planFeatures.savedSessionsUnlimited'),
            t('homepage.planFeatures.aiRecitation'),
            t('homepage.planFeatures.aiMemorisationChecker'),
            t('homepage.planFeatures.offlineDownloads')
          ],
          amount: proDisplayPrice.value,
          priceSuffix: t('homepage.pricing.perMonth'),
          billingNote: isAnnual ? t('pricingPage.billedAnnually', { amount: '49.99' }) : t('pricingPage.billedMonthly'),
          badge: isAnnual ? t('pricingPage.proDiscount') : t('homepage.pricing.freeTrial'),
          badgeClass: isAnnual ? 'pricing-plan-badge--discount' : 'pricing-plan-badge--trial',
          featured: false,
          ctaType: 'form',
          checkoutPlan: isAnnual ? 'pro_yearly' : 'pro_monthly',
          ctaLabel: t('pricingPage.buyPro'),
          ctaClass: 'pricing-plan-cta--primary'
        }
      ];
    });

    return {
      t,
      currentTheme,
      billingCycle,
      csrfToken,
      planCards,
      comparisonRows,
      comparisonValueClass,
      comparisonCell
    };
  }
};
</script>

<style src="./PricingPage.css"></style>
