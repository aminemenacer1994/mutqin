<template>
  <div class="articles-page article-detail-page">
    <article-progress v-if="article" :label="t('articleDetail.progress')" />
    <article v-if="article" class="article-detail">
      <div class="wrap article-detail__wrap">
        <div class="article-detail__column article-detail__column--read">
          <nav class="article-detail__crumbs" aria-label="Breadcrumb">
            <ol>
              <li><a href="/">{{ t('articleDetail.home') }}</a></li>
              <li><a href="/articles">{{ t('articleDetail.articles') }}</a></li>
              <li aria-current="page">{{ article.title }}</li>
            </ol>
          </nav>

          <header class="article-detail__header">
            <p class="section-kicker">{{ article.category }}</p>
            <h1 id="article-heading" class="articles-title">{{ article.title }}</h1>
            <p class="article-detail__lede">{{ article.lede || article.excerpt }}</p>
            <p class="article-detail__meta">
              <time :datetime="article.publishedAt">{{ t('articleDetail.published', { date: formatDate(article.publishedAt) }) }}</time>
              <span v-if="showUpdated"> · {{ t('articleDetail.updated', { date: formatDate(article.updatedAt) }) }}</span>
              <span> · {{ t('articleDetail.readingTime', { minutes: article.readingMinutes }) }}</span>
            </p>
          </header>

          <figure v-if="article.image" class="article-detail__figure">
            <img
              class="article-detail__image"
              :src="article.image"
              :alt="article.imageAlt || article.title"
              width="1200"
              height="750"
              fetchpriority="high"
              decoding="async"
              referrerpolicy="no-referrer-when-downgrade"
            >
            <figcaption v-if="article.imageCredit">
              {{ t('articlesPage.photoCredit', { name: article.imageCredit }) }}
            </figcaption>
          </figure>

          <article-share :title="article.title" :slug="article.slug" />
          <article-toc
            v-if="tocItems.length"
            :items="tocItems"
            :label="t('articleDetail.toc')"
          />

          <div class="article-detail__prose">
            <section v-if="introParagraphs.length" class="article-detail__intro" aria-label="Introduction">
              <p
                v-for="(paragraph, index) in introParagraphs"
                :key="`intro-${index}`"
                v-html="proseHtml(paragraph)"
              ></p>
              <article-quote
                v-if="article.introQuote"
                v-bind="quoteProps(article.introQuote)"
              />
            </section>

            <section
              v-for="section in article.sections"
              :id="sectionAnchor(section)"
              :key="section.h2"
              class="article-detail__section"
            >
              <h2 tabindex="-1">{{ section.h2 }}</h2>
              <p
                v-for="(paragraph, index) in section.paragraphs || []"
                :key="`p-${index}`"
                v-html="proseHtml(paragraph)"
              ></p>

              <template v-for="(quote, qIndex) in section.quotes || []" :key="`q-${qIndex}`">
                <article-quote v-bind="quoteProps(quote)" />
              </template>

              <article-inline-image
                v-if="section.image"
                :src="section.image.src"
                :alt="section.image.alt || section.h2"
                :credit="section.image.credit"
              />

              <ol v-if="section.steps?.length" class="article-steps">
                <li v-for="(step, sIndex) in section.steps" :key="`step-${sIndex}`" class="article-steps__item">
                  <h3 class="article-steps__title">{{ step.title }}</h3>
                  <p v-html="proseHtml(step.body)"></p>
                </li>
              </ol>

              <div v-if="section.sequence" class="article-sequence">
                <h3 v-if="section.sequence.title">{{ section.sequence.title }}</h3>
                <p v-if="section.sequence.intro">{{ section.sequence.intro }}</p>
                <ol class="article-sequence__list">
                  <li v-for="(item, iIndex) in section.sequence.items || []" :key="`seq-${iIndex}`">
                    {{ item }}
                  </li>
                </ol>
                <p v-if="section.sequence.outro" class="article-sequence__outro">{{ section.sequence.outro }}</p>
              </div>

              <div v-if="section.comparison" class="article-comparison">
                <p v-if="section.comparison.intro" class="article-comparison__intro">
                  {{ section.comparison.intro }}
                </p>
                <div class="article-comparison__grid">
                  <div class="article-comparison__card">
                    <h3>{{ section.comparison.left?.title }}</h3>
                    <p>{{ section.comparison.left?.body }}</p>
                  </div>
                  <div class="article-comparison__card">
                    <h3>{{ section.comparison.right?.title }}</h3>
                    <p>{{ section.comparison.right?.body }}</p>
                  </div>
                </div>
              </div>

              <ol v-if="section.routine?.length" class="article-routine">
                <li v-for="(item, rIndex) in section.routine" :key="`routine-${rIndex}`">
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.body }}</p>
                </li>
              </ol>

              <template v-for="sub in section.subs || []" :key="sub.h3">
                <h3>{{ sub.h3 }}</h3>
                <p
                  v-for="(paragraph, sIndex) in sub.paragraphs || []"
                  :key="sIndex"
                  v-html="proseHtml(paragraph)"
                ></p>
                <template v-for="(quote, qIndex) in sub.quotes || []" :key="`${sub.h3}-q-${qIndex}`">
                  <article-quote v-bind="quoteProps(quote)" />
                </template>
              </template>

              <p
                v-for="(paragraph, index) in section.paragraphsAfter || []"
                :key="`after-${index}`"
                v-html="proseHtml(paragraph)"
              ></p>
            </section>

            <article-cta
              v-if="article.cta"
              :heading="article.cta.heading"
              :body="article.cta.body"
              :label="article.cta.label"
              :href="article.cta.href || '/'"
            />
          </div>
        </div>
      </div>

      <section v-if="related.length" class="article-related" :aria-label="t('articleDetail.related')">
        <div class="wrap">
          <h2 class="article-related__title">{{ t('articleDetail.related') }}</h2>
          <div class="articles-grid">
            <article-card
              v-for="item in related"
              :key="item.id"
              :href="item.href"
              :title="item.title"
              :excerpt="item.excerpt"
              :category="item.category"
              :published-at="item.publishedAt"
              :image="item.image"
              :image-alt="item.imageAlt || item.title"
              :image-credit="photoCredit(item)"
            />
          </div>
          <p class="article-detail__back">
            <a href="/articles">{{ t('articleDetail.back') }}</a>
          </p>
        </div>
      </section>
    </article>
    <articles-footer />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ArticleCard from '../components/articles/ArticleCard.vue'
import ArticleCta from '../components/articles/ArticleCta.vue'
import ArticleInlineImage from '../components/articles/ArticleInlineImage.vue'
import ArticleProgress from '../components/articles/ArticleProgress.vue'
import ArticleQuote from '../components/articles/ArticleQuote.vue'
import ArticleShare from '../components/articles/ArticleShare.vue'
import ArticleToc from '../components/articles/ArticleToc.vue'
import ArticlesFooter from '../components/articles/ArticlesFooter.vue'
import { seoProseHtml } from '../scripts/seoTools/prose.js'

function slugifyHeading(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default {
  name: 'ArticleDetailPage',
  components: {
    ArticleCard,
    ArticleCta,
    ArticleInlineImage,
    ArticleProgress,
    ArticleQuote,
    ArticleShare,
    ArticleToc,
    ArticlesFooter,
  },
  setup() {
    const { t } = useI18n()
    const article = computed(() => (
      typeof window !== 'undefined' && window.mutqinArticle ? window.mutqinArticle : null
    ))
    const related = computed(() => (
      Array.isArray(article.value?.related) ? article.value.related : []
    ))
    const introParagraphs = computed(() => (
      Array.isArray(article.value?.intro) ? article.value.intro : []
    ))
    const showUpdated = computed(() => {
      const published = article.value?.publishedAt
      const updated = article.value?.updatedAt
      return Boolean(updated && published && updated !== published)
    })
    const tocItems = computed(() => {
      const sections = Array.isArray(article.value?.sections) ? article.value.sections : []
      return sections
        .filter((section) => section?.h2)
        .map((section) => ({
          id: sectionAnchor(section),
          label: section.h2,
        }))
    })

    function sectionAnchor(section) {
      if (section?.id) return String(section.id)
      return slugifyHeading(section?.h2)
    }

    function quoteProps(quote) {
      return {
        kind: quote?.kind || 'quran',
        arabic: quote?.arabic || '',
        translation: quote?.translation || '',
        translator: quote?.translator || '',
        reference: quote?.reference || '',
        sourceUrl: quote?.sourceUrl || '',
        sourceLabel: quote?.sourceLabel || '',
        note: quote?.note || '',
      }
    }

    function formatDate(value) {
      const raw = String(value || '')
      const date = new Date(`${raw}T00:00:00`)
      if (Number.isNaN(date.getTime())) return raw
      try {
        return new Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(date)
      } catch {
        return raw
      }
    }

    function photoCredit(item) {
      const name = String(item?.imageCredit || '').trim()
      if (!name) return ''
      return t('articlesPage.photoCredit', { name })
    }

    return {
      t,
      article,
      related,
      introParagraphs,
      showUpdated,
      tocItems,
      sectionAnchor,
      quoteProps,
      formatDate,
      photoCredit,
      proseHtml: seoProseHtml,
    }
  },
}
</script>

<style src="../styles/articles-page.css"></style>
