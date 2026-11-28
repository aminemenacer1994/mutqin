<template>
  <div class="parent-chart" role="img" :aria-label="ariaLabel">
    <div v-for="bar in normalised" :key="bar.key" class="parent-chart__row">
      <div class="parent-chart__label">
        <span class="parent-chart__name">{{ bar.label }}</span>
        <span class="parent-chart__value">{{ bar.display }}</span>
      </div>
      <div class="parent-chart__track" aria-hidden="true">
        <span class="parent-chart__fill" :class="`is-${bar.tone}`" :style="{ width: `${bar.percent}%` }"></span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ParentSimpleBarChart',
  props: {
    bars: { type: Array, default: () => [] },
    ariaLabel: { type: String, default: '' },
  },
  computed: {
    normalised() {
      const rows = (this.bars || []).filter((row) => Number(row.value || 0) >= 0)
      const max = Math.max(1, ...rows.map((row) => Number(row.value || 0)))
      return rows.map((row) => ({
        key: row.key,
        label: row.label,
        display: row.display ?? String(row.value ?? 0),
        percent: Math.round((Number(row.value || 0) / max) * 100),
        tone: row.tone || 'neutral',
      }))
    },
  },
}
</script>