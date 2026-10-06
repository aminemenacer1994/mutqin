<template>
  <div class="articles-page">
    <section class="articles-hero" aria-labelledby="articles-heading">
      <div class="wrap">
        <header class="section-head articles-hero__head">
          <p class="section-kicker">{{ t('articlesPage.kicker') }}</p>
          <h1 id="articles-heading" class="articles-title">{{ t('articlesPage.title') }}</h1>
          <p class="section-sub">{{ t('articlesPage.subtitle') }}</p>
        </header>
        <article-search v-model="query" />
        <article-filters
          v-model="category"
          :options="categoryOpts"
          :total-count="articles.length"
          :match-count="matching.length"
          :searching="isSearching"
        />
      </div>
    </section>

    <section class="articles-grid-section" :aria-label="t('articlesPage.listLabel')">
      <div class="wrap">
        <div v-if="visible.length" class="articles-grid">
          <article-card
            v-for="(article, index) in visible"
            :key="article.id"
            :href="article.href"
            :title="article.title"
            :excerpt="article.excerpt"
            :category="article.category"
            :published-at="article.publishedAt"
            :reading-minutes="article.readingMinutes"
            :image="article.image"
            :image-alt="article.imageAlt || article.title"
            :image-credit="photoCredit(article)"
            :highlight-query="query"
            :eager="index < 3"
          />
        </div>
        <div v-else class="articles-empty" role="status">
          <p class="articles-empty__title">{{ t('articlesPage.emptyTitle') }}</p>
          <p class="articles-empty__body">{{ t('articlesPage.emptyBody') }}</p>
        </div>
        <div v-if="showLoadMore" class="articles-more">
          <button type="button" class="btn btn--secondary articles-more__btn" @click="loadMore">
            {{ t('articlesPage.loadMore') }}
          </button>
        </div>
      </div>
    </section>

    <articles-footer />
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ArticleCard from '../components/articles/ArticleCard.vue'
import ArticleFilters from '../components/articles/ArticleFilters.vue'
import ArticleSearch from '../components/articles/ArticleSearch.vue'
import ArticlesFooter from '../components/articles/ArticlesFooter.vue'
import placeholderArticles from '../data/articles.json'
import {
  PAGE_SIZE,
  canLoadMore,
  categoryOptions,
  filterArticles,
  initialVisibleCount,
  isSearchActive,
  listingArticles,
  nextVisibleCount,
  visibleArticles,
} from '../scripts/articles/articleSearch.js'
import { readingMinutes } from '../scripts/articles/readingTime.js'

export default {
  name: 'ArticlesPage',
  components: { ArticleCard, ArticleFilters, ArticleSearch, ArticlesFooter },
  setup() {
    const { t } = useI18n()
    const query = ref('')
    const category = ref('')
    const articles = listingArticles(placeholderArticles).map((article) => ({
      ...article,
      readingMinutes: readingMinutes(article),
    }))
    const categoryOpts = categoryOptions(articles)
    const matching = computed(() => filterArticles(articles, query.value, category.value))
    const isSearching = computed(() => isSearchActive(query.value))
    const visibleCount = ref(initialVisibleCount(matching.value.length, PAGE_SIZE))
    const visible = computed(() => visibleArticles(matching.value, visibleCount.value))
    const showLoadMore = computed(() => canLoadMore(visibleCount.value, matching.value.length))

    watch([query, category], () => {
      visibleCount.value = initialVisibleCount(matching.value.length, PAGE_SIZE)
    })

    function loadMore() {
      visibleCount.value = nextVisibleCount(visibleCount.value, matching.value.length, PAGE_SIZE)
    }

    function photoCredit(article) {
      const name = String(article?.imageCredit || '').trim()
      if (!name) return ''
      return t('articlesPage.photoCredit', { name })
    }

    return {
      t,
      query,
      category,
      articles,
      categoryOpts,
      matching,
      isSearching,
      visible,
      showLoadMore,
      loadMore,
      photoCredit,
    }
  },
}
</script>

<style src="../styles/articles-page.css"></style>
