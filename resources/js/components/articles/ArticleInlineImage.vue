<template>
  <figure v-if="src" class="article-inline-image">
    <img
      v-if="!failed"
      class="article-inline-image__img"
      :src="src"
      :alt="alt"
      width="800"
      height="500"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer-when-downgrade"
      @error="failed = true"
    >
    <div v-else class="article-inline-image__fallback" aria-hidden="true">
      <i class="bi bi-book"></i>
    </div>
    <figcaption v-if="credit">
      {{ creditLabel }}
    </figcaption>
  </figure>
</template>

<script>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'ArticleInlineImage',
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
    credit: { type: String, default: '' },
  },
  setup(props) {
    const { t } = useI18n()
    const failed = ref(false)
    const creditLabel = computed(() => (
      props.credit ? t('articlesPage.photoCredit', { name: props.credit }) : ''
    ))
    return { failed, creditLabel }
  },
}
</script>
