<template>
  <div class="article-search">
    <label class="visually-hidden" :for="inputId">{{ t('articlesPage.searchLabel') }}</label>
    <div class="article-search__field">
      <i class="bi bi-search article-search__icon" aria-hidden="true"></i>
      <input
        :id="inputId"
        ref="input"
        class="article-search__input"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        :value="modelValue"
        :placeholder="t('articlesPage.searchPlaceholder')"
        @input="$emit('update:modelValue', $event.target.value)"
      >
      <button
        v-if="modelValue"
        type="button"
        class="article-search__clear"
        :aria-label="t('articlesPage.searchClear')"
        @click="clear"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ArticleSearch',
  props: {
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  computed: {
    inputId() {
      return 'articles-search'
    },
  },
  methods: {
    clear() {
      this.$emit('update:modelValue', '')
      this.$nextTick(() => this.$refs.input?.focus())
    },
  },
}
</script>
