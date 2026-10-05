<template>
  <article class="info-page info-page--seo">
    <div class="info-shell">
      <nav class="info-crumbs" aria-label="Breadcrumb">
        <ol>
          <li v-for="(crumb, index) in page.breadcrumbs" :key="crumb.path">
            <span v-if="index > 0" class="info-crumbs__sep" aria-hidden="true">/</span>
            <a v-if="index < page.breadcrumbs.length - 1" :href="crumb.path">{{ crumb.name }}</a>
            <span v-else aria-current="page">{{ crumb.name }}</span>
          </li>
        </ol>
      </nav>

      <header class="info-header">
        <div class="info-header-copy">
          <span class="info-kicker">{{ page.kicker }}</span>
          <h1>{{ page.h1 }}</h1>
        </div>
        <div class="info-header-aside">
          <p>{{ page.lede }}</p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" :href="page.cta_primary.href">{{ page.cta_primary.label }}</a>
            <a class="info-btn info-btn--ghost" :href="page.cta_secondary.href">{{ page.cta_secondary.label }}</a>
          </div>
        </div>
      </header>

      <seo-tool-planner v-if="page.tool === 'planner'" />
      <seo-tool-progress v-else-if="page.tool === 'progress'" />
      <seo-tool-quiz v-else-if="page.tool === 'quiz'" />
      <seo-tool-find-ayah v-else-if="page.tool === 'find-ayah'" />

      <div class="info-prose">
        <section v-for="section in page.sections" :key="section.h2" class="info-prose__block">
          <h2>{{ section.h2 }}</h2>
          <p v-for="(paragraph, pIndex) in section.paragraphs" :key="pIndex">{{ paragraph }}</p>
          <template v-for="sub in section.subs || []" :key="sub.h3">
            <h3>{{ sub.h3 }}</h3>
            <p v-for="(paragraph, sIndex) in sub.paragraphs" :key="sIndex">{{ paragraph }}</p>
          </template>
        </section>
      </div>

      <nav class="about-more" aria-label="Related">
        <a
          v-for="link in page.links"
          :key="link.href"
          :href="link.href"
          class="info-inline-link"
        >
          {{ link.label }}
        </a>
      </nav>

      <div class="info-actions">
        <a class="info-btn info-btn--primary" :href="page.cta_primary.href">{{ page.cta_primary.label }}</a>
        <a class="info-btn info-btn--ghost" :href="page.cta_secondary.href">{{ page.cta_secondary.label }}</a>
      </div>
    </div>
  </article>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'SeoLaunchPage',
  components: {
    SeoToolFindAyah: defineAsyncComponent(() => import(
      /* webpackChunkName: "seo-tool-find-ayah" */ '../components/seoTools/SeoToolFindAyah.vue'
    )),
    SeoToolPlanner: defineAsyncComponent(() => import(
      /* webpackChunkName: "seo-tool-planner" */ '../components/seoTools/SeoToolPlanner.vue'
    )),
    SeoToolProgress: defineAsyncComponent(() => import(
      /* webpackChunkName: "seo-tool-progress" */ '../components/seoTools/SeoToolProgress.vue'
    )),
    SeoToolQuiz: defineAsyncComponent(() => import(
      /* webpackChunkName: "seo-tool-quiz" */ '../components/seoTools/SeoToolQuiz.vue'
    )),
  },
  data() {
    return {
      page: (typeof window !== 'undefined' && window.mutqinSeoPage) ? window.mutqinSeoPage : {
        kicker: '',
        h1: '',
        lede: '',
        sections: [],
        links: [],
        breadcrumbs: [],
        tool: null,
        cta_primary: { href: '/waiting-list', label: 'Join the waiting list' },
        cta_secondary: { href: '/memorisation', label: 'Open memorisation' },
      },
    };
  },
};
</script>

<style src="../styles/info-pages.css"></style>
<style src="../styles/seo-pages.css"></style>
