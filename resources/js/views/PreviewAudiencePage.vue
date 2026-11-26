<template>
  <div ref="pageRoot" class="homepage preview-audience homepage--preview" :data-theme="currentTheme">
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
        {{ audienceT('nav.back') }}
      </a>
      <div class="preview-audience__nav-links">
        <a
          v-for="link in audienceNav"
          :key="link.id"
          :href="link.href"
          class="preview-audience__nav-link"
          :class="{ 'is-active': link.id === audience }"
          :aria-current="link.id === audience ? 'page' : undefined"
        >
          {{ link.label }}
        </a>
      </div>
    </nav>

    <main id="main-content">
    <section class="preview-audience__hero" aria-labelledby="preview-audience-title">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <p class="section-kicker">{{ audienceT('hero.kicker') }}</p>
          <h1 id="preview-audience-title" class="section-title">{{ audienceT('hero.title') }}</h1>
          <p class="section-sub">{{ audienceT('hero.subtitle') }}</p>
        </header>
      </div>
    </section>

    <section class="preview-audience__capabilities" aria-labelledby="preview-capabilities-title">
      <div class="wrap">
        <header class="section-head" data-reveal>
          <h2 id="preview-capabilities-title" class="section-title section-title--sm">
            {{ audienceT('capabilities.title') }}
          </h2>
        </header>
        <ul class="preview-audience__list">
          <li
            v-for="(item, idx) in capabilityItems"
            :key="item.id"
            class="preview-ecosystem__item"
            data-reveal
            :style="{ '--delay': `${idx * 45}ms` }"
          >
            <span class="preview-ecosystem__index" aria-hidden="true">{{ String(idx + 1).padStart(2, '0') }}</span>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section
      v-for="(spot, idx) in spotlights"
      :key="spot.id"
      class="preview-classroom preview-audience__spotlight"
      :aria-labelledby="`preview-spotlight-${spot.id}`"
    >
      <div class="wrap" :class="{ 'preview-audience__spotlight-row--reverse': idx % 2 === 1 }">
        <div class="preview-audience__spotlight-row">
          <figure class="preview-browser">
            <img
              class="preview-browser__shot"
              :src="spotlightImageUrl(spot.asset)"
              :alt="spot.alt"
              width="1440"
              height="900"
              loading="lazy"
              decoding="async"
            >
          </figure>
          <div class="preview-audience__spotlight-copy" data-reveal>
            <h2 :id="`preview-spotlight-${spot.id}`">{{ spot.title }}</h2>
            <p>{{ spot.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="preview-audience__footer-note">
      <div class="wrap">
        <p v-if="showPremiumCallout" class="preview-audience__premium">
          {{ audienceT('premium.note') }}
          <a class="preview-audience__premium-link" href="/preview/pricing">{{ audienceT('premium.cta') }}</a>
        </p>
        <p>{{ audienceT('footnote') }}</p>
        <p class="preview-classroom__caption">{{ audienceT('authenticCaption') }}</p>
      </div>
    </section>
    </main>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSavedTheme, setGlobalTheme } from '../utils/theme';
import { trackSeoLandingView } from '../scripts/seoTools/track.js';
import { bindRevealObserver, mountPreviewPageEnter } from '../composables/usePreviewMotion.js';

const AUDIENCES = ['teachers', 'students', 'parents', 'learning', 'institutions'];

const LOCALE_ROOT = {
  teachers: 'previewTeachers',
  students: 'previewStudents',
  parents: 'previewParents',
  learning: 'previewLearning',
  institutions: 'previewInstitutions',
};

export default {
  name: 'PreviewAudiencePage',
  props: {
    audience: {
      type: String,
      required: true,
      validator: (value) => AUDIENCES.includes(value),
    },
  },
  setup(props) {
    const { t, te } = useI18n();
    const currentTheme = ref(getSavedTheme());
    const pageRoot = ref(null);

    const audienceT = (key) => {
      const root = `${LOCALE_ROOT[props.audience]}.${key}`;
      if (te(root)) {
        return t(root);
      }

      return t(`${LOCALE_ROOT.teachers}.${key}`);
    };

    const previewAssetUrl = (basename) => `/preview/assets/${basename}.png`;

    const spotlightImageUrl = (asset) => {
      if (!asset) return '';
      if (asset.startsWith('/')) return asset;

      return previewAssetUrl(asset);
    };

    const audienceNav = computed(() => [
      { id: 'teachers', href: '/preview/teachers', label: t('previewTeachers.nav.teachers') },
      { id: 'students', href: '/preview/students', label: t('previewStudents.nav.students') },
      { id: 'parents', href: '/preview/parents', label: t('previewParents.nav.parents') },
      { id: 'learning', href: '/preview/learning', label: t('previewLearning.nav.learning') },
      { id: 'institutions', href: '/preview/institutions', label: t('previewInstitutions.nav.institutions') },
    ]);

    const showPremiumCallout = computed(() => props.audience === 'learning' && te('previewLearning.premium.note'));

    const capabilityKeys = {
      teachers: ['priorities', 'assignments', 'learningPlan', 'reviews', 'guardians'],
      students: ['assignments', 'practice', 'feedback', 'messages'],
      parents: ['invite', 'progress', 'messages', 'consent'],
      learning: ['memorise', 'revise', 'aiRecite', 'account'],
      institutions: ['staff', 'classes', 'consent', 'scope'],
    };

    const capabilityItems = computed(() => {
      const keys = capabilityKeys[props.audience] ?? [];
      return keys.map((id) => ({
        id: `${props.audience}-cap-${id}`,
        title: audienceT(`capabilities.items.${id}.title`),
        body: audienceT(`capabilities.items.${id}.body`),
      }));
    });

    const spotlightIds = computed(() => (
      ['primary', 'secondary'].filter((id) => te(`${LOCALE_ROOT[props.audience]}.spotlights.${id}.title`))
    ));

    const spotlights = computed(() => spotlightIds.value.map((id) => ({
      id,
      asset: audienceT(`spotlights.${id}.asset`),
      title: audienceT(`spotlights.${id}.title`),
      body: audienceT(`spotlights.${id}.body`),
      alt: audienceT(`spotlights.${id}.alt`),
    })));

    let disconnectReveals = () => {};
    let cleanupPageEnter = () => {};

    const applyTheme = () => {
      currentTheme.value = getSavedTheme();
      setGlobalTheme(currentTheme.value, { dispatchEvent: false, persist: false });
    };

    const onThemeChange = (event) => {
      currentTheme.value = event?.detail?.theme || getSavedTheme();
    };

    onMounted(() => {
      trackSeoLandingView({
        kind: `preview_${props.audience}`,
        pageId: `preview_${props.audience}`,
        path: `/preview/${props.audience}`,
      });
      applyTheme();
      window.addEventListener('mutqin:theme-change', onThemeChange);

      cleanupPageEnter = mountPreviewPageEnter(pageRoot.value);
      disconnectReveals = bindRevealObserver({
        root: pageRoot.value,
        selector: '[data-reveal]',
        threshold: 0.12,
      });
    });

    onUnmounted(() => {
      window.removeEventListener('mutqin:theme-change', onThemeChange);
      disconnectReveals();
      cleanupPageEnter();
    });

    return {
      t,
      audience: toRef(props, 'audience'),
      audienceT,
      audienceNav,
      capabilityItems,
      spotlights,
      spotlightImageUrl,
      showPremiumCallout,
      currentTheme,
      pageRoot,
    };
  },
};
</script>

<style src="./Homepage.css"></style>
<style src="./PreviewAudiencePage.css"></style>
<style src="../styles/preview-motion.css"></style>