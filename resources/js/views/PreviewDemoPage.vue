<template>
  <div ref="pageRoot" class="homepage preview-demo homepage--preview" :data-theme="currentTheme">
    <p class="homepage-preview-banner" role="status">
      <i class="bi bi-eye" aria-hidden="true"></i>
      <span>
        <strong>{{ t('homepage.preview.bannerLabel') }}</strong>
        {{ t('homepage.preview.bannerDetail') }}
      </span>
    </p>

    <nav class="preview-audience__nav wrap" aria-label="Preview navigation">
      <a class="preview-audience__nav-back" href="/preview">
        <i class="bi bi-arrow-left" aria-hidden="true"></i>
        {{ t('previewDemo.nav.back') }}
      </a>
    </nav>

    <main id="main-content">
      <section class="preview-demo-entry wrap" aria-labelledby="preview-demo-title">
        <header class="preview-demo-entry__head" data-reveal>
          <h1 id="preview-demo-title" class="preview-demo-entry__title">
            {{ t('previewDemo.hero.title') }}
          </h1>
          <p class="preview-demo-entry__sub">{{ t('previewDemo.hero.subtitle') }}</p>
        </header>

        <p v-if="flashError" class="preview-demo__error" role="alert">{{ flashError }}</p>

        <div class="preview-demo-entry__layout" data-reveal>
          <div
            class="preview-demo-entry__picker"
            role="listbox"
            :aria-label="t('previewDemo.experiences.label')"
          >
            <button
              v-for="item in experienceOptions"
              :key="item.experience"
              type="button"
              class="preview-demo-entry__option"
              :class="{ 'is-active': selectedExperience === item.experience }"
              role="option"
              :aria-selected="selectedExperience === item.experience"
              @click="selectedExperience = item.experience"
            >
              <span class="preview-demo-entry__option-label">{{ item.label }}</span>
              <span class="preview-demo-entry__option-hint">{{ item.summary }}</span>
            </button>
          </div>

          <div class="preview-demo-entry__panel">
            <figure v-if="selectedPreview" class="preview-browser preview-demo-entry__shot">
              <img
                class="preview-browser__shot"
                :src="selectedPreview.asset"
                :alt="selectedPreview.alt"
                width="1440"
                height="900"
                loading="lazy"
                decoding="async"
              >
            </figure>
            <p class="preview-demo-entry__detail">{{ selectedPreview?.body }}</p>

            <fieldset class="preview-demo-entry__modes">
              <legend class="visually-hidden">{{ t('previewDemo.launch.modeLegend') }}</legend>
              <label class="preview-demo-entry__mode">
                <input v-model="launchMode" type="radio" name="demo-launch-mode" value="explore">
                <span>
                  <strong>{{ t('previewDemo.launch.explore') }}</strong>
                  <small>{{ t('previewDemo.launch.exploreHint') }}</small>
                </span>
              </label>
              <label class="preview-demo-entry__mode">
                <input v-model="launchMode" type="radio" name="demo-launch-mode" value="guided">
                <span>
                  <strong>{{ t('previewDemo.launch.guided') }}</strong>
                  <small>{{ t('previewDemo.launch.guidedHint') }}</small>
                </span>
              </label>
            </fieldset>

            <form method="POST" :action="enterUrl" class="preview-demo-entry__launch">
              <input type="hidden" name="_token" :value="csrfToken">
              <input type="hidden" name="experience" :value="selectedExperience">
              <input type="hidden" name="guided" :value="launchMode === 'guided' ? '1' : '0'">
              <button
                type="submit"
                class="btn btn--primary"
                :disabled="!canLaunch"
                :aria-busy="launching ? 'true' : 'false'"
                @click="launching = true"
              >
                {{ canLaunch ? t('previewDemo.launch.cta') : t('previewDemo.launch.seedRequired') }}
              </button>
            </form>

            <p class="preview-demo-entry__footnote">{{ t('previewDemo.launch.footnote') }}</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';
import { bindRevealObserver, mountPreviewPageEnter } from '../composables/usePreviewMotion.js';

const EXPERIENCE_ORDER = ['teacher', 'student', 'parent', 'personal', 'connected'];

export default {
  name: 'PreviewDemoPage',
  props: {
    enterUrl: { type: String, required: true },
    statusUrl: { type: String, required: true },
    flashError: { type: String, default: '' },
  },
  setup(props) {
    const { t, tm } = useI18n();
    const currentTheme = ref(getSavedTheme());
    const pageRoot = ref(null);
    let disconnectReveals = () => {};
    let cleanupPageEnter = () => {};
    const experienceStatus = ref({});
    const selectedExperience = ref('teacher');
    const launchMode = ref('explore');
    const launching = ref(false);
    const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');

    const experienceOptions = computed(() => EXPERIENCE_ORDER.map((experience) => {
      const copy = tm(`previewDemo.experiences.${experience}`) || {};
      return {
        experience,
        label: copy.label || experience,
        summary: copy.summary || '',
        body: copy.body || '',
        asset: experienceStatus.value[experience]?.preview_asset || copy.previewAsset || '',
        alt: copy.shotAlt || copy.label || experience,
      };
    }));

    const selectedPreview = computed(() => {
      return experienceOptions.value.find((row) => row.experience === selectedExperience.value) || experienceOptions.value[0];
    });

    const canLaunch = computed(() => {
      const row = experienceStatus.value[selectedExperience.value];
      return row ? !!row.ready : selectedExperience.value === 'personal';
    });

    watch(selectedExperience, () => {
      launching.value = false;
    });

    onMounted(async () => {
      setGlobalTheme(currentTheme.value, { dispatchEvent: false, persist: false });
      cleanupPageEnter = mountPreviewPageEnter(pageRoot.value);
      disconnectReveals = bindRevealObserver({ root: pageRoot.value, selector: '[data-reveal]' });
      try {
        const response = await fetch(props.statusUrl, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const data = await response.json();
        const map = {};
        (data.experiences || []).forEach((row) => {
          map[row.experience] = row;
        });
        experienceStatus.value = map;
      } catch {
        // optional offline
      }
    });

    onUnmounted(() => {
      disconnectReveals();
      cleanupPageEnter();
    });

    return {
      t,
      currentTheme,
      pageRoot,
      experienceOptions,
      selectedExperience,
      selectedPreview,
      launchMode,
      canLaunch,
      launching,
      csrfToken,
      flashError: props.flashError,
      enterUrl: props.enterUrl,
    };
  },
};
</script>

<style src="./Homepage.css"></style>
<style src="./PreviewAudiencePage.css"></style>
<style src="./PreviewDemoPage.css"></style>
<style src="../styles/preview-motion.css"></style>