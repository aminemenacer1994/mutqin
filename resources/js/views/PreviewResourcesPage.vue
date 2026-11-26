<template>
  <div ref="pageRoot" class="homepage preview-resources homepage--preview" :data-theme="currentTheme">
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
        {{ t('previewResources.nav.back') }}
      </a>
    </nav>

    <main id="main-content" class="preview-resources__main wrap">
      <header class="section-head" data-reveal>
        <p class="section-kicker">{{ t('previewResources.hero.kicker') }}</p>
        <h1 class="section-title">{{ t('previewResources.hero.title') }}</h1>
        <p class="section-sub">{{ t('previewResources.hero.subtitle') }}</p>
      </header>

      <section class="preview-resources__section" aria-labelledby="preview-resources-pages">
        <h2 id="preview-resources-pages" class="section-title section-title--sm">{{ t('previewResources.pages.title') }}</h2>
        <ul class="preview-resources__links">
          <li v-for="link in pageLinks" :key="link.href">
            <a :href="link.href">{{ link.label }}</a>
            <span>{{ link.note }}</span>
          </li>
        </ul>
      </section>

      <section class="preview-resources__section" aria-labelledby="preview-resources-docs">
        <h2 id="preview-resources-docs" class="section-title section-title--sm">{{ t('previewResources.docs.title') }}</h2>
        <ul class="preview-resources__links">
          <li v-for="doc in docLinks" :key="doc.id">
            <a v-if="doc.href" :href="doc.href">{{ doc.label }}</a>
            <span v-else class="preview-resources__label">{{ doc.label }}</span>
            <span>{{ doc.note }}</span>
          </li>
        </ul>
      </section>

      <section class="preview-resources__section" aria-labelledby="preview-resources-downloads">
        <h2 id="preview-resources-downloads" class="section-title section-title--sm">{{ t('previewResources.downloads.title') }}</h2>
        <ul class="preview-resources__links">
          <li v-for="file in downloadLinks" :key="file.id">
            <a :href="file.href" download>{{ file.label }}</a>
            <span>{{ file.note }}</span>
          </li>
        </ul>
      </section>

      <section class="preview-resources__section" aria-labelledby="preview-resources-quality">
        <h2 id="preview-resources-quality" class="section-title section-title--sm">{{ t('previewResources.quality.title') }}</h2>
        <p>{{ t('previewResources.quality.intro') }}</p>
        <ul class="preview-resources__legend">
          <li v-for="(line, idx) in qualityItems" :key="idx">{{ line }}</li>
        </ul>
        <p class="preview-resources__cmd">
          <code>node --test tests/js/landing-preview-responsive.test.mjs</code>
        </p>
      </section>
    </main>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';
import { bindRevealObserver, mountPreviewPageEnter } from '../composables/usePreviewMotion.js';

export default {
  name: 'PreviewResourcesPage',
  setup() {
    const { t, tm } = useI18n();
    const currentTheme = ref(getSavedTheme());
    const pageRoot = ref(null);
    let disconnectReveals = () => {};
    let cleanupPageEnter = () => {};

    const pageLinks = computed(() => [
      { href: '/preview', label: t('previewResources.pages.items.home'), note: t('previewResources.pages.items.homeNote') },
      { href: '/preview/pricing', label: t('previewResources.pages.items.pricing'), note: t('previewResources.pages.items.pricingNote') },
      { href: '/preview/teachers', label: t('previewResources.pages.items.teachers'), note: '' },
      { href: '/preview/learning', label: t('previewResources.pages.items.learning'), note: '' },
      { href: '/preview/institutions', label: t('previewResources.pages.items.institutions'), note: '' },
      { href: '/preview/demo', label: t('previewResources.pages.items.demo'), note: '' },
    ]);

    const docLinks = computed(() => [
      { id: 'progress', href: null, label: 'IMPLEMENTATION_PROGRESS.md', note: t('previewResources.docs.progress') },
      { id: 'audit', href: null, label: 'mutqin-2.0-audit.md', note: t('previewResources.docs.audit') },
      { id: 'demo', href: null, label: 'PREVIEW_DEMO.md', note: t('previewResources.docs.demoDoc') },
      { id: 'shots', href: null, label: 'screenshots/MANIFEST.md', note: t('previewResources.docs.manifest') },
    ]);

    const downloadLinks = computed(() => [
      {
        id: 'business-model',
        href: '/preview/resources/files/business-model',
        label: t('previewResources.downloads.businessModel'),
        note: t('previewResources.downloads.proposedOnly'),
      },
      {
        id: 'business-plan',
        href: '/preview/resources/files/business-plan',
        label: t('previewResources.downloads.businessPlan'),
        note: t('previewResources.downloads.proposedOnly'),
      },
    ]);

    const qualityItems = computed(() => tm('previewResources.quality.items') || []);

    onMounted(() => {
      setGlobalTheme(currentTheme.value, { dispatchEvent: false, persist: false });
      cleanupPageEnter = mountPreviewPageEnter(pageRoot.value);
      disconnectReveals = bindRevealObserver({ root: pageRoot.value, selector: '[data-reveal]' });
    });

    onUnmounted(() => {
      disconnectReveals();
      cleanupPageEnter();
    });

    return {
      t,
      currentTheme,
      pageRoot,
      pageLinks,
      docLinks,
      downloadLinks,
      qualityItems,
    };
  },
};
</script>

<style src="./Homepage.css"></style>
<style src="./PreviewAudiencePage.css"></style>
<style src="./PreviewResourcesPage.css"></style>
<style src="../styles/preview-motion.css"></style>