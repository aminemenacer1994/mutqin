<template>
  <div class="article-filters">
    <div class="article-filters__rail">
      <nav class="article-filters__track" :aria-label="t('articlesPage.filtersLabel')">
        <button
          type="button"
          class="article-filters__chip"
          :class="{ 'is-active': modelValue === '' }"
          :aria-pressed="modelValue === '' ? 'true' : 'false'"
          @click="$emit('update:modelValue', '')"
        >
          <span>{{ t('articlesPage.filterAll') }}</span>
          <span class="article-filters__count">{{ totalCount }}</span>
        </button>
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          class="article-filters__chip"
          :class="{ 'is-active': modelValue === option.id }"
          :aria-pressed="modelValue === option.id ? 'true' : 'false'"
          @click="$emit('update:modelValue', option.id)"
        >
          <span>{{ option.label }}</span>
          <span class="article-filters__count">{{ option.count }}</span>
        </button>
      </nav>
    </div>
    <p v-if="resultLabel" class="article-filters__summary" role="status">{{ resultLabel }}</p>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'ArticleFilters',
  props: {
    modelValue: { type: String, default: '' },
    options: { type: Array, default: () => [] },
    totalCount: { type: Number, default: 0 },
    matchCount: { type: Number, default: 0 },
    searching: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props) {
    const { t } = useI18n()
    const resultLabel = computed(() => {
      if (!props.modelValue && !props.searching) return ''
      return t('articlesPage.filterSummary', {
        shown: props.matchCount,
        total: props.totalCount,
      })
    })
    return { t, resultLabel }
  },
}
</script>
