<template>
  <div class="aa-chart" :class="{ 'aa-chart--donut': type === 'doughnut' }">
    <component
      :is="chartComponent"
      :data="config.data"
      :options="config.options"
      :aria-label="label"
      :aria-describedby="summaryId"
    />
    <ul :id="summaryId" class="visually-hidden">
      <li v-for="(row, index) in summaryRows" :key="index">{{ row }}</li>
    </ul>
  </div>
</template>

<script>
import { Bar, Doughnut, Line } from 'vue-chartjs'

export default {
  name: 'AnalyticsChart',
  components: { Bar, Doughnut, Line },
  props: {
    type: { type: String, default: 'line' },
    config: { type: Object, required: true },
    label: { type: String, required: true },
  },
  data() {
    return { summaryId: `aa-chart-${Math.random().toString(36).slice(2, 9)}` }
  },
  computed: {
    chartComponent() {
      return { bar: 'Bar', doughnut: 'Doughnut', line: 'Line' }[this.type] || 'Line'
    },
    summaryRows() {
      const datasets = this.config.data?.datasets || []
      return (this.config.data?.labels || []).map((label, index) => {
        const values = datasets.map((dataset) => [dataset.label, dataset.data?.[index] ?? '—'].filter((value) => value !== undefined && value !== null && value !== '').join(': '))
        return `${label}: ${values.join('; ')}`
      })
    },
  },
}
</script>
