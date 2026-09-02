<template>
  <div class="madani-mushaf-skeleton" role="status" :aria-label="label">
    <div v-for="n in lineCount" :key="n" class="madani-mushaf-skeleton__line">
      <span class="madani-mushaf-skeleton__shimmer" />
    </div>
    <span class="visually-hidden">{{ label }}</span>
  </div>
</template>

<script>
import { MADANI_LINES_PER_PAGE } from '../../scripts/mushaf/madaniPageLayout.js'

export default {
  name: 'MushafLoadingSkeleton',
  props: {
    lineCount: { type: Number, default: MADANI_LINES_PER_PAGE },
    label: { type: String, default: 'Loading Mushaf page' },
  },
}
</script>
