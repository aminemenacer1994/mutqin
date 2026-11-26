<template>
  <section
    v-if="open"
    class="sandbox-conversion"
    role="region"
    :aria-label="t('previewDemo.conversion.region')"
  >
    <div class="sandbox-conversion__inner">
      <div class="sandbox-conversion__copy">
        <h2 class="sandbox-conversion__title">{{ headline }}</h2>
        <p class="sandbox-conversion__body">{{ body }}</p>
        <p class="sandbox-conversion__note">{{ t('previewDemo.conversion.accountNote') }}</p>
      </div>
      <div class="sandbox-conversion__actions">
        <a class="sandbox-conversion__cta btn btn--primary" :href="config.registerUrl">
          {{ primaryCta }}
        </a>
        <a class="sandbox-conversion__link" :href="config.pricingUrl">
          {{ t('previewDemo.conversion.viewPlans') }}
        </a>
        <button type="button" class="sandbox-conversion__dismiss" @click="dismiss">
          {{ t('previewDemo.conversion.continueExploring') }}
        </button>
      </div>
      <details class="sandbox-conversion__plans">
        <summary>{{ t('previewDemo.conversion.planCompareTitle') }}</summary>
        <ul>
          <li v-for="(line, index) in planLines" :key="index">{{ line }}</li>
        </ul>
      </details>
    </div>
  </section>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const STORAGE_KEY = 'mutqin_sandbox_conversion_dismissed';

export default {
  name: 'PreviewSandboxConversionSheet',
  props: {
    config: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const { t, tm } = useI18n();
    const open = ref(false);

    const experience = computed(() => {
      const key = props.config?.conversionExperience || 'personal';
      if (key === 'connected') {
        return 'teacher';
      }
      return key;
    });

    const headline = computed(() => t(`previewDemo.conversion.headline.${experience.value}`));
    const body = computed(() => t(`previewDemo.conversion.body.${experience.value}`));
    const primaryCta = computed(() => t(`previewDemo.conversion.cta.${experience.value}`));

    const planLines = computed(() => {
      const raw = tm(`previewDemo.conversion.planCompare.${experience.value}`);
      return Array.isArray(raw) ? raw : [];
    });

    const show = () => {
      const dismissedId = window.sessionStorage.getItem(STORAGE_KEY);
      if (dismissedId === props.config?.walkthroughId) {
        return;
      }
      open.value = true;
    };

    const dismiss = () => {
      open.value = false;
      if (props.config?.walkthroughId) {
        window.sessionStorage.setItem(STORAGE_KEY, props.config.walkthroughId);
      }
    };

    const onTourComplete = () => {
      show();
    };

    onMounted(() => {
      if (document.documentElement.classList.contains('sandbox-tour-complete')) {
        show();
      }
      window.addEventListener('mutqin-sandbox-tour-complete', onTourComplete);
    });

    onUnmounted(() => {
      window.removeEventListener('mutqin-sandbox-tour-complete', onTourComplete);
    });

    return {
      t,
      open,
      headline,
      body,
      primaryCta,
      planLines,
      dismiss,
    };
  },
};
</script>