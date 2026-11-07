<template>
  <aside v-if="heading" class="article-cta" aria-labelledby="article-cta-heading">
    <h2 id="article-cta-heading" class="article-cta__heading">{{ heading }}</h2>
    <p v-if="body" class="article-cta__body">{{ body }}</p>
    <a v-if="href && label" class="article-cta__link" :href="href">{{ label }}</a>
  </aside>
</template>

<script>
export default {
  name: 'ArticleCta',
  props: {
    heading: { type: String, default: '' },
    body: { type: String, default: '' },
    label: { type: String, default: '' },
    href: { type: String, default: '/' },
  },
}
</script>
