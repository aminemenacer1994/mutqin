<script>
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default {
  name: 'DashboardWeeklyChart',
  components: { Bar },
  props: {
    data: { type: Object, required: true },
    options: { type: Object, required: true },
    chartKey: { type: [String, Number], default: 0 },
    ariaLabel: { type: String, default: '' },
  },
}
</script>

<template>
  <Bar
    :key="chartKey"
    :data="data"
    :options="options"
    :aria-label="ariaLabel"
  />
</template>
