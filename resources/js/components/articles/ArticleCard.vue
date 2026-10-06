<template>
  <article class="article-card" :id="id || undefined">
    <component
      :is="cardTag"
      class="article-card__hit"
      :href="href || undefined"
      :aria-label="title"
    >
      <div class="article-card__media">
        <img
          v-if="!imageFailed"
          class="article-card__image"
          :src="image"
          :alt="imageAlt"
          width="800"
          height="500"
          :loading="eager ? 'eager' : 'lazy'"
          :fetchpriority="eager ? 'high' : 'auto'"
          decoding="async"
          referrerpolicy="no-referrer-when-downgrade"
          @error="imageFailed = true"
        >
        <div v-else class="article-card__fallback" aria-hidden="true">
          <i class="bi bi-book"></i>
        </div>
      </div>
      <div class="article-card__body">
        <p class="article-card__category" v-html="highlightedCategory"></p>
        <h2 class="article-card__title" v-html="highlightedTitle"></h2>
        <p class="article-card__excerpt" v-html="highlightedExcerpt"></p>
        <p v-if="imageCredit" class="article-card__credit">{{ imageCredit }}</p>
        <div class="article-card__meta">
          <time class="article-card__date" :datetime="publishedAt">{{ formattedDate }}</time>
          <span v-if="readingMinutes" class="article-card__read">{{ readingLabel }}</span>
          <span class="article-card__arrow" aria-hidden="true">
            <i class="bi bi-arrow-up-right"></i>
          </span>
        </div>
      </div>
    </component>
  </article>
</template>

<script>
import { useI18n } from 'vue-i18n'
import { highlightMatches } from '../../scripts/articles/articleSearch.js'

export default {
  name: 'ArticleCard',
  props: {
    id: { type: String, default: '' },
    href: { type: String, default: '' },
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    category: { type: String, required: true },
    publishedAt: { type: String, required: true },
    readingMinutes: { type: [Number, String], default: 0 },
    image: { type: String, required: true },
    imageAlt: { type: String, default: '' },
    imageCredit: { type: String, default: '' },
    highlightQuery: { type: String, default: '' },
    eager: { type: Boolean, default: false },
  },
  setup() {
    const { t } = useI18n()
    return { t }
  },
  data() {
    return { imageFailed: false }
  },
  computed: {
    cardTag() {
      return this.href ? 'a' : 'div'
    },
    highlightedTitle() {
      return highlightMatches(this.title, this.highlightQuery)
    },
    highlightedExcerpt() {
      return highlightMatches(this.excerpt, this.highlightQuery)
    },
    highlightedCategory() {
      return highlightMatches(this.category, this.highlightQuery)
    },
    readingLabel() {
      const minutes = Number(this.readingMinutes) || 0
      if (minutes < 1) return ''
      return this.t('articleDetail.readingTime', { minutes })
    },
    formattedDate() {
      const raw = String(this.publishedAt || '')
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
    },
  },
}
</script>
