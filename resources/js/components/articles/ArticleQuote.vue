<template>
  <figure class="article-quote" :class="`article-quote--${kind}`">
    <blockquote class="article-quote__arabic" lang="ar" dir="rtl">
      <p>{{ arabic }}</p>
    </blockquote>
    <figcaption class="article-quote__caption">
      <p v-if="translation" class="article-quote__translation" lang="en" dir="ltr">
        {{ translation }}
      </p>
      <p v-if="translator" class="article-quote__translator">{{ translator }}</p>
      <p class="article-quote__meta">
        <span>{{ reference }}</span>
        <template v-if="sourceUrl">
          <span aria-hidden="true"> · </span>
          <a :href="sourceUrl" target="_blank" rel="noopener noreferrer">
            {{ sourceLabel || 'Source' }}
          </a>
        </template>
      </p>
      <p v-if="note" class="article-quote__note">{{ note }}</p>
    </figcaption>
  </figure>
</template>

<script>
export default {
  name: 'ArticleQuote',
  props: {
    kind: { type: String, default: 'quran' },
    arabic: { type: String, required: true },
    translation: { type: String, default: '' },
    translator: { type: String, default: '' },
    reference: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    sourceLabel: { type: String, default: '' },
    note: { type: String, default: '' },
  },
}
</script>
