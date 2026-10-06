<template>
  <div class="articles-page article-detail-page">
    <article v-if="article" class="article-detail">
      <div class="wrap article-detail__wrap">
        <div class="article-detail__column col-md-10">
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

          <div class="article-detail__prose">
            <section v-for="section in article.sections" :key="section.h2">
              <h2>{{ section.h2 }}</h2>
              <p
                v-for="(paragraph, index) in section.paragraphs || []"
                :key="index"
                v-html="proseHtml(paragraph)"
              ></p>
              <template v-for="sub in section.subs || []" :key="sub.h3">
                <h3>{{ sub.h3 }}</h3>
                <p
                  v-for="(paragraph, sIndex) in sub.paragraphs || []"
                  :key="sIndex"
                  v-html="proseHtml(paragraph)"
                ></p>
              </template>
            </section>
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
import ArticleShare from '../components/articles/ArticleShare.vue'
import ArticlesFooter from '../components/articles/ArticlesFooter.vue'
import { seoProseHtml } from '../scripts/seoTools/prose.js'

export default {
  name: 'ArticleDetailPage',
  components: { ArticleCard, ArticleShare, ArticlesFooter },
  setup() {
    const { t } = useI18n()
    const article = computed(() => (
      typeof window !== 'undefined' && window.mutqinArticle ? window.mutqinArticle : null
    ))
    const related = computed(() => (
      Array.isArray(article.value?.related) ? article.value.related : []
    ))
    const showUpdated = computed(() => {
      const published = article.value?.publishedAt
      const updated = article.value?.updatedAt
      return Boolean(updated && published && updated !== published)
    })

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
      showUpdated,
      formatDate,
      photoCredit,
      proseHtml: seoProseHtml,
    }
  },
}
</script>

<style src="../styles/articles-page.css"></style>
