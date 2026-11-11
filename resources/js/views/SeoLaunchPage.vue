<template>
  <div v-if="isFeaturesHub" class="articles-page how-it-works-page">
    <section class="articles-hero" aria-labelledby="how-it-works-heading">
      <div class="wrap">
        <header class="section-head articles-hero__head">
          <p class="section-kicker">{{ page.kicker }}</p>
          <h1 id="how-it-works-heading" class="articles-title">{{ page.h1 }}</h1>
          <p class="section-sub">{{ page.lede }}</p>
        </header>
      </div>
    </section>

    <section class="articles-grid-section" :aria-label="t('howItWorksPage.listLabel')">
      <div class="wrap">
        <walkthrough-card
          v-if="featured"
          featured
          :kicker="page.kicker"
          :title="featured.feature"
          :summary="featured.tagline"
          :detail="featured.description || ''"
          :feature-id="featured.featureId"
          :youtube-id="featured.id"
          :image="featuredThumb"
          :image-alt="featured.feature"
        />
        <div class="articles-grid">
          <walkthrough-card
            v-for="(item, index) in showcase"
            :key="item.href"
            :index="index + 1"
            :kicker="page.kicker"
            :title="item.label"
            :summary="item.summary"
            :detail="item.detail || ''"
            :category="item.category || ''"
            :feature-id="item.feature_id || ''"
            :duration-label="item.duration_label || ''"
            :youtube-id="item.youtube_id || ''"
            :youtube-watch="item.youtube_watch || ''"
            :image="item.image || ''"
            :image-alt="item.image_alt || item.label"
            :eager="index < 3"
          />
        </div>
      </div>
    </section>
  </div>

  <article v-else class="info-page info-page--seo">
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

      <figure v-if="page.youtube_id" class="how-it-works-media how-it-works-media--page">
        <iframe
          :src="youtubeEmbedSrc(page.youtube_id)"
          :title="page.h1"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </figure>

      <seo-tool-planner v-if="page.tool === 'planner'" />
      <seo-tool-progress v-else-if="page.tool === 'progress'" />
      <seo-tool-quiz v-else-if="page.tool === 'quiz'" />
      <seo-tool-find-ayah v-else-if="page.tool === 'find-ayah'" />

      <div v-if="guideIndex" class="seo-guide-index">
        <h2>{{ t('about.seo.browseGuides') }}</h2>
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
        <p v-if="!guideIndex.entries.length" class="seo-guide-empty">{{ t('about.seo.noGuidesInCategory') }}</p>
      </div>

      <div v-if="page.sections && page.sections.length" class="info-prose">
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

      <aside v-if="!isFeaturesHub && page.related_feature && page.related_feature.href" class="seo-feature-cta">
        <h2>Continue in Mutqin</h2>
        <p>{{ continueCopy }}</p>
        <a
          class="info-btn info-btn--primary"
          :href="page.related_feature.href"
          @click="onCtaClick('feature')"
        >{{ page.related_feature.label }}</a>
      </aside>

      <section v-if="!isFeaturesHub && relatedGuides.length" class="seo-related" aria-label="Related guides">
        <h2>Related guides</h2>
        <ul class="seo-related__list">
          <li v-for="related in relatedGuides" :key="'g-' + related.href">
            <a :href="related.href">
              <strong>{{ related.label }}</strong>
            </a>
          </li>
        </ul>
      </section>

      <section v-if="!isFeaturesHub && relatedTools.length" class="seo-related" aria-label="Related tools">
        <h2>Related tools</h2>
        <ul class="seo-related__list">
          <li v-for="related in relatedTools" :key="'t-' + related.href">
            <a :href="related.href">
              <strong>{{ related.label }}</strong>
            </a>
          </li>
        </ul>
      </section>

      <section v-if="!isFeaturesHub && relatedFeatures.length" class="seo-related" aria-label="Related features">
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

      <section v-if="!isFeaturesHub && relatedArticles.length" class="seo-related" aria-label="More related guides">
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

      <nav v-if="!isFeaturesHub" class="about-more" aria-label="Related">
        <a
          v-for="link in page.links"
          :key="link.href"
          :href="link.href"
          class="info-inline-link"
        >
          {{ link.label }}
        </a>
      </nav>

      <div v-if="!isFeaturesHub" class="info-actions">
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
import { useI18n } from 'vue-i18n'
import { featuredTutorial, tutorialThumbnailUrl } from '../config/tutorialVideos.js'
import { seoProseHtml } from '../scripts/seoTools/prose.js'
import {
  rememberSeoTool,
  trackSeoCtaClick,
  trackSeoLandingView,
} from '../scripts/seoTools/track.js'

export default {
  name: 'SeoLaunchPage',
  setup() {
    const { t } = useI18n()
    const featured = featuredTutorial()
    return {
      t,
      featured,
      featuredThumb: featured ? tutorialThumbnailUrl(featured.id) : '',
    }
  },
  components: {
    WalkthroughCard: defineAsyncComponent(() => import(
      /* webpackChunkName: "walkthrough-card" */ '../components/seo/WalkthroughCard.vue'
    )),
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
        showcase: [],
        youtube_id: null,
        youtube_channel: 'https://www.youtube.com/@Mutqin-w7h',
        cta_primary: { href: '/', label: 'Mutqin' },
        cta_secondary: { href: '/memorisation', label: 'Open memorisation' },
      },
    };
  },
  computed: {
    isArticle() {
      return this.page.kind === 'article';
    },
    isFeaturesHub() {
      return this.page.id === 'features-hub' || this.page.path === '/features';
    },
    showcase() {
      return Array.isArray(this.page.showcase) ? this.page.showcase : [];
    },
    youtubeChannel() {
      return this.page.youtube_channel || 'https://www.youtube.com/@Mutqin-w7h';
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
    youtubeEmbedSrc(videoId) {
      const id = encodeURIComponent(String(videoId || '').trim());
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : '';
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
<style src="../styles/articles-page.css"></style>
