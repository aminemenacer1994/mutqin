<template>
  <article
    class="mutashabihat-card"
    :data-testid="testId"
  >
    <div class="mutashabihat-card__stack">
      <section class="mutashabihat-card__passage" :aria-labelledby="`mutashabihat-left-${row.key}`">
        <h3 :id="`mutashabihat-left-${row.key}`" class="mutashabihat-card__passage-title">
          {{ leftHeading }}
        </h3>
        <p
          class="mutashabihat-card__arabic"
          dir="rtl"
          lang="ar"
          v-html="row.leftPreviewHtml"
        ></p>
      </section>
      <section class="mutashabihat-card__passage" :aria-labelledby="`mutashabihat-right-${row.key}`">
        <h3 :id="`mutashabihat-right-${row.key}`" class="mutashabihat-card__passage-title">
          {{ rightHeading }}
        </h3>
        <p
          class="mutashabihat-card__arabic"
          dir="rtl"
          lang="ar"
          v-html="row.rightPreviewHtml"
        ></p>
      </section>
    </div>
    <button
      type="button"
      class="mutashabihat-card__compare"
      @click="$emit('compare', row)"
    >
      <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
      <span>{{ compareLabel }}</span>
    </button>
  </article>
</template>

<script>
export default {
  name: 'MutashabihatPairCard',
  props: {
    row: { type: Object, required: true },
    quranFontFamily: { type: String, default: '' },
    compareLabel: { type: String, default: 'Compare' },
    leftHeading: { type: String, default: '' },
    rightHeading: { type: String, default: '' },
    testId: { type: String, default: 'mutashabihat-card' },
  },
  emits: ['compare'],
}
</script>

<style src="./MutashabihatPairCard.css"></style>
