<template>
  <p class="mutqin-preview-toolbar-spacer" aria-hidden="true"></p>
  <PreviewSandboxConversionSheet v-if="conversionConfig" :config="conversionConfig" />
  <PreviewSandboxExitMenu
    ref="exitMenuRef"
    :config="exitConfig"
    @restart="restartDemo"
  />
  <aside
    class="mutqin-preview-toolbar"
    role="region"
    :aria-label="t('previewDemo.toolbar.region')"
    :data-guided="config.guided ? '1' : null"
  >
    <div class="mutqin-preview-toolbar__inner">
      <div class="mutqin-preview-toolbar__meta">
        <span class="mutqin-preview-toolbar__badge">{{ t('previewDemo.toolbar.demoMode') }}</span>
        <span class="mutqin-preview-toolbar__role">{{ config.activeLabel }}</span>
        <span v-if="expiryLabel" class="mutqin-preview-toolbar__expiry">{{ expiryLabel }}</span>
      </div>

      <form method="POST" :action="config.switchUrl" class="mutqin-preview-toolbar__switch">
        <input type="hidden" name="_token" :value="config.csrfToken">
        <label class="visually-hidden" :for="switchId">{{ t('previewDemo.toolbar.switchLabel') }}</label>
        <select
          :id="switchId"
          name="persona"
          class="mutqin-preview-toolbar__select"
          data-sandbox-tour="sandbox-role-switch"
          :value="config.activePersona"
          @change="onSwitch"
        >
          <option
            v-for="row in config.switchable"
            :key="row.id"
            :value="row.id"
            :disabled="row.id === config.activePersona"
          >
            {{ row.title }}
          </option>
        </select>
      </form>

      <form
        v-if="config.entitlementOverlay"
        method="POST"
        :action="config.entitlementUrl"
        class="mutqin-preview-toolbar__entitlement"
      >
        <input type="hidden" name="_token" :value="config.csrfToken">
        <label class="visually-hidden" :for="entitlementId">{{ t('previewDemo.toolbar.entitlementLabel') }}</label>
        <select
          :id="entitlementId"
          name="tier"
          class="mutqin-preview-toolbar__select"
          :value="config.entitlementTier"
          @change="onEntitlementChange"
        >
          <option value="free">{{ t('previewDemo.toolbar.tierFree') }}</option>
          <option value="premium">{{ t('previewDemo.toolbar.tierPremium') }}</option>
          <option value="pro">{{ t('previewDemo.toolbar.tierPremiumPlus') }}</option>
        </select>
      </form>

      <div class="mutqin-preview-toolbar__actions">
        <details class="mutqin-preview-toolbar__more">
          <summary class="mutqin-preview-toolbar__btn">{{ t('previewDemo.toolbar.more') }}</summary>
          <div class="mutqin-preview-toolbar__more-panel">
            <form method="POST" :action="config.guidedUrl">
              <input type="hidden" name="_token" :value="config.csrfToken">
              <button type="submit" class="mutqin-preview-toolbar__btn" :aria-pressed="config.guided ? 'true' : 'false'">
                {{ config.guided ? t('previewDemo.toolbar.guidedOn') : t('previewDemo.toolbar.guidedOff') }}
              </button>
            </form>
            <form method="POST" :action="config.restartUrl">
              <input type="hidden" name="_token" :value="config.csrfToken">
              <button type="submit" class="mutqin-preview-toolbar__btn">
                {{ t('previewDemo.toolbar.restart') }}
              </button>
            </form>
            <form ref="resetForm" method="POST" :action="config.resetUrl" @submit="confirmReset">
              <input type="hidden" name="_token" :value="config.csrfToken">
              <input type="hidden" name="confirm" value="1">
              <input v-if="resetRestoreCatalog" type="hidden" name="restore_catalog" value="1">
              <button type="submit" class="mutqin-preview-toolbar__btn">
                {{ t('previewDemo.toolbar.reset') }}
              </button>
            </form>
          </div>
        </details>
        <button
          type="button"
          class="mutqin-preview-toolbar__btn mutqin-preview-toolbar__btn--quiet"
          @click="openExitMenu"
        >
          {{ t('previewDemo.toolbar.exit') }}
        </button>
        <a
          class="mutqin-preview-toolbar__cta btn btn--primary"
          :href="config.getStartedUrl"
          data-sandbox-tour="sandbox-get-started"
        >
          {{ getStartedLabel }}
        </a>
      </div>
    </div>
    <p v-if="config.guided" class="mutqin-preview-toolbar__guided-note">
      {{ t('previewDemo.toolbar.guidedNote') }}
    </p>
  </aside>
</template>

<script>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSandboxMediaPause } from '../../composables/useSandboxMediaPause.js';
import {
  WALKTHROUGH_STORAGE_ID,
  WALKTHROUGH_STORAGE_STEP,
} from '../../composables/sandboxWalkthroughSteps.js';
import PreviewSandboxConversionSheet from './PreviewSandboxConversionSheet.vue';
import PreviewSandboxExitMenu from './PreviewSandboxExitMenu.vue';

let switchCounter = 0;

export default {
  name: 'PreviewSandboxToolbar',
  components: {
    PreviewSandboxConversionSheet,
    PreviewSandboxExitMenu,
  },
  props: {
    config: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const { t, te } = useI18n();
    const switchId = `preview-sandbox-switch-${switchCounter += 1}`;
    const entitlementId = `preview-sandbox-tier-${switchCounter}`;
    const resetRestoreCatalog = ref(false);
    const exitMenuRef = ref(null);
    const mediaPause = useSandboxMediaPause();

    const conversionExperience = computed(() => props.config?.conversionExperience || 'personal');

    const conversionConfig = computed(() => ({
      conversionExperience: conversionExperience.value,
      walkthroughId: props.config?.walkthroughId || '',
      registerUrl: props.config?.registerUrl || props.config?.getStartedUrl,
      pricingUrl: props.config?.pricingUrl,
    }));

    const exitConfig = computed(() => ({
      csrfToken: props.config?.csrfToken,
      exitUrl: props.config?.exitUrl,
      pricingUrl: props.config?.pricingUrl,
      registerUrl: props.config?.registerUrl || props.config?.getStartedUrl,
      demoHubUrl: props.config?.demoHubUrl,
    }));

    const getStartedLabel = computed(() => {
      const key = `previewDemo.conversion.cta.${conversionExperience.value}`;
      if (te(key)) {
        return t(key);
      }
      return t('previewDemo.toolbar.getStarted');
    });

    const expiryLabel = computed(() => {
      const minutes = props.config?.expiresInMinutes;
      if (typeof minutes !== 'number' || minutes <= 0 || minutes > 180) {
        return '';
      }
      if (minutes <= 30) {
        return t('previewDemo.toolbar.expiresSoon', { minutes });
      }
      return '';
    });

    const applyBodyClass = () => {
      document.documentElement.classList.add('mutqin-preview-sandbox-active');
      if (props.config?.guided) {
        document.documentElement.dataset.sandboxGuided = '1';
      } else {
        delete document.documentElement.dataset.sandboxGuided;
      }
      if (window.sessionStorage.getItem('mutqin_sandbox_walkthrough_reset') === '1') {
        window.sessionStorage.removeItem('mutqin_sandbox_walkthrough_reset');
        window.localStorage.setItem(WALKTHROUGH_STORAGE_STEP, '0');
      }
      if (props.config?.guided && props.config?.walkthroughId) {
        window.localStorage.setItem(WALKTHROUGH_STORAGE_ID, props.config.walkthroughId);
      }
    };

    const prefetchConversionTargets = () => {
      const urls = [props.config?.pricingUrl, props.config?.registerUrl || props.config?.getStartedUrl]
        .filter((href) => typeof href === 'string' && href !== '');
      urls.forEach((href) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      });
    };

    const onSwitch = (event) => {
      mediaPause.pauseMedia();
      event.target.form?.submit();
    };

    const onEntitlementChange = (event) => {
      event.target.form?.submit();
    };

    const confirmReset = async (event) => {
      event.preventDefault();
      if (!window.confirm(t('previewDemo.toolbar.resetConfirm'))) {
        return;
      }
      resetRestoreCatalog.value = props.config?.canRestoreCatalog
        && window.confirm(t('previewDemo.toolbar.resetRestoreConfirm'));
      await nextTick();
      event.target?.submit();
    };

    const openExitMenu = () => {
      exitMenuRef.value?.open?.();
    };

    const restartDemo = () => {
      const hub = props.config?.demoHubUrl;
      if (typeof hub === 'string' && hub !== '') {
        window.location.assign(hub);
      }
    };

    onMounted(() => {
      applyBodyClass();
      mediaPause.mount();
      prefetchConversionTargets();
      if (props.config?.walkthroughReset) {
        window.localStorage.setItem(WALKTHROUGH_STORAGE_STEP, '0');
      }
    });

    onUnmounted(() => {
      mediaPause.unmount();
      document.documentElement.classList.remove('mutqin-preview-sandbox-active');
      delete document.documentElement.dataset.sandboxGuided;
    });

    return {
      t,
      switchId,
      entitlementId,
      expiryLabel,
      resetRestoreCatalog,
      exitMenuRef,
      conversionConfig,
      exitConfig,
      getStartedLabel,
      onSwitch,
      onEntitlementChange,
      confirmReset,
      openExitMenu,
      restartDemo,
    };
  },
};
</script>

<style src="../../views/PreviewDemoPage.css"></style>
<style src="../../styles/sandbox-motion.css"></style>