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
          <p v-if="isArticle && pageMetaLine" class="seo-article-meta">{{ pageMetaLine }}</p>
        </div>
        <div class="info-header-aside">
          <p v-html="proseHtml(page.lede)"></p>
          <div class="info-actions">
            <a
              class="info-btn info-btn--primary"
              :href="page.cta_primary.href"
              @click="onCtaClick('primary')"
            >{{ page.cta_primary.label }}</a>
            <a
              class="info-btn info-btn--ghost"
              :href="page.cta_secondary.href"
              @click="onCtaClick('secondary')"
            >{{ page.cta_secondary.label }}</a>
          </div>
        </div>
      </header>

      <seo-tool-planner v-if="page.tool === 'planner'" />
      <seo-tool-progress v-else-if="page.tool === 'progress'" />
      <seo-tool-quiz v-else-if="page.tool === 'quiz'" />
      <seo-tool-find-ayah v-else-if="page.tool === 'find-ayah'" />

      <div v-if="guideIndex" class="seo-guide-index">
        <h2>Browse guides</h2>
        <nav class="seo-guide-filters" aria-label="Guide categories">
          <a
            :href="guideIndex.all_href"
            class="seo-guide-filter"
            :class="{ 'is-active': !guideIndex.active_category }"
          >All</a>
          <a
            v-for="category in guideIndex.categories"
            :key="category.id"
            :href="category.href"
            class="seo-guide-filter"
            :class="{ 'is-active': guideIndex.active_category === category.id }"
          >{{ category.label }}</a>
        </nav>
        <ul class="seo-guide-list">
          <li v-for="entry in guideIndex.entries" :key="entry.id">
            <a :href="entry.href" class="seo-guide-card">
              <span class="seo-guide-card__kicker">{{ entry.category_label }}</span>
              <strong>{{ entry.title }}</strong>
              <span>{{ entry.description }}</span>
            </a>
          </li>
        </ul>
        <p v-if="!guideIndex.entries.length" class="seo-guide-empty">No guides in this category yet.</p>
      </div>

      <div class="info-prose">
        <section v-for="section in page.sections" :key="section.h2" class="info-prose__block">
          <h2>{{ section.h2 }}</h2>
          <p
            v-for="(paragraph, pIndex) in section.paragraphs"
            :key="pIndex"
            v-html="proseHtml(paragraph)"
          ></p>
          <template v-for="sub in section.subs || []" :key="sub.h3">
            <h3>{{ sub.h3 }}</h3>
            <p
              v-for="(paragraph, sIndex) in sub.paragraphs"
              :key="sIndex"
              v-html="proseHtml(paragraph)"
            ></p>
          </template>
        </section>
      </div>

      <aside v-if="page.related_feature && page.related_feature.href" class="seo-feature-cta">
        <h2>Continue in Mutqin</h2>
        <p>{{ continueCopy }}</p>
        <a
          class="info-btn info-btn--primary"
          :href="page.related_feature.href"
          @click="onCtaClick('feature')"
        >{{ page.related_feature.label }}</a>
      </aside>

      <section v-if="relatedGuides.length" class="seo-related" aria-label="Related guides">
        <h2>Related guides</h2>
        <ul class="seo-related__list">
          <li v-for="related in relatedGuides" :key="'g-' + related.href">
            <a :href="related.href">
              <strong>{{ related.label }}</strong>
            </a>
          </li>
        </ul>
      </section>

      <section v-if="relatedTools.length" class="seo-related" aria-label="Related tools">
        <h2>Related tools</h2>
        <ul class="seo-related__list">
          <li v-for="related in relatedTools" :key="'t-' + related.href">
            <a :href="related.href">
              <strong>{{ related.label }}</strong>
            </a>
          </li>
        </ul>
      </section>

      <section v-if="relatedFeatures.length" class="seo-related" aria-label="Related features">
        <h2>Related features</h2>
        <ul class="seo-related__list">
          <li v-for="related in relatedFeatures" :key="'f-' + related.href">
            <a :href="related.href">
              <strong>{{ related.label }}</strong>
            </a>
          </li>
        </ul>
      </section>

      <section v-if="faqs.length" class="seo-faq" aria-label="Frequently asked questions">
        <h2>FAQ</h2>
        <div v-for="faq in faqs" :key="faq.q" class="seo-faq__item">
          <h3>{{ faq.q }}</h3>
          <p v-html="proseHtml(faq.a)"></p>
        </div>
      </section>

      <section v-if="relatedArticles.length" class="seo-related" aria-label="More related guides">
        <h2>{{ relatedGuides.length ? 'More related guides' : 'Related guides' }}</h2>
        <ul class="seo-related__list">
          <li v-for="related in relatedArticles" :key="related.href">
            <a :href="related.href">
              <span v-if="related.category" class="seo-guide-card__kicker">{{ related.category }}</span>
              <strong>{{ related.label }}</strong>
              <span v-if="related.description">{{ related.description }}</span>
            </a>
          </li>
        </ul>
      </section>

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
        <a
          class="info-btn info-btn--primary"
          :href="page.cta_primary.href"
          @click="onCtaClick('primary')"
        >{{ page.cta_primary.label }}</a>
        <a
          class="info-btn info-btn--ghost"
          :href="page.cta_secondary.href"
          @click="onCtaClick('secondary')"
        >{{ page.cta_secondary.label }}</a>
      </div>
    </div>
  </article>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { seoProseHtml } from '../scripts/seoTools/prose.js'
import {
  rememberSeoTool,
  trackSeoCtaClick,
  trackSeoLandingView,
} from '../scripts/seoTools/track.js'

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
        kind: null,
        author: null,
        published_at: null,
        updated_at: null,
        related_articles: [],
        related_guides: [],
        related_tools: [],
        related_features: [],
        related_feature: null,
        faqs: [],
        guide_index: null,
        cta_primary: { href: '/waiting-list', label: 'Join the waiting list' },
        cta_secondary: { href: '/memorisation', label: 'Open memorisation' },
      },
    };
  },
  computed: {
    isArticle() {
      return this.page.kind === 'article';
    },
    isTool() {
      return Boolean(this.page.tool) || this.page.kind === 'tool';
    },
    guideIndex() {
      return this.page.guide_index || null;
    },
    relatedGuides() {
      return Array.isArray(this.page.related_guides) ? this.page.related_guides : [];
    },
    relatedTools() {
      return Array.isArray(this.page.related_tools) ? this.page.related_tools : [];
    },
    relatedFeatures() {
      return Array.isArray(this.page.related_features) ? this.page.related_features : [];
    },
    relatedArticles() {
      const listed = new Set(this.relatedGuides.map((item) => item.href));
      return (Array.isArray(this.page.related_articles) ? this.page.related_articles : [])
        .filter((item) => item?.href && !listed.has(item.href));
    },
    faqs() {
      return Array.isArray(this.page.faqs) ? this.page.faqs : [];
    },
    continueCopy() {
      if (this.isTool) {
        return 'Keep the same workflow in the Mutqin workspace: save a range, practise, and return — still beside your teacher.';
      }
      return 'Use the matching feature in the workspace for the practice this guide describes.';
    },
    pageMetaLine() {
      const parts = [];
      if (this.page.author) parts.push(this.page.author);
      if (this.page.published_at) parts.push(`Published ${this.page.published_at}`);
      if (this.page.updated_at && this.page.updated_at !== this.page.published_at) {
        parts.push(`Updated ${this.page.updated_at}`);
      }
      return parts.join(' · ');
    },
  },
  mounted() {
    const kind = this.page.kind || (this.page.tool ? 'tool' : 'page');
    trackSeoLandingView({
      kind,
      pageId: this.page.id || '',
      path: this.page.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
      tool: this.page.tool || '',
    });
  },
  methods: {
    proseHtml(text) {
      return seoProseHtml(text);
    },
    onCtaClick(dest) {
      if (this.page.tool) rememberSeoTool(this.page.tool);
      let href = '';
      let label = '';
      if (dest === 'primary') {
        href = this.page.cta_primary?.href || '';
        label = this.page.cta_primary?.label || '';
      } else if (dest === 'secondary') {
        href = this.page.cta_secondary?.href || '';
        label = this.page.cta_secondary?.label || '';
      } else if (dest === 'feature') {
        href = this.page.related_feature?.href || '';
        label = this.page.related_feature?.label || '';
      }
      trackSeoCtaClick({
        dest,
        href,
        label,
        ctaId: `${this.page.kind || 'page'}_${dest}`,
        tool: this.page.tool || '',
      });
    },
  },
};
</script>

<style src="../styles/info-pages.css"></style>
<style src="../styles/seo-pages.css"></style>
