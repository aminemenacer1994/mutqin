<script>
import { Bar, Line } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler)

export default {
  name: 'GrowthChart',
  components: { Bar, Line },
  props: {
    kind: { type: String, default: 'bar' },
    labels: { type: Array, required: true },
    series: { type: Array, required: true },
    ariaLabel: { type: String, default: '' },
    textColor: { type: String, default: '#1f1a17' },
    mutedColor: { type: String, default: '#554c45' },
    gridColor: { type: String, default: 'rgba(78, 58, 38, 0.16)' },
    surfaceColor: { type: String, default: '#ffffff' },
    borderColor: { type: String, default: 'rgba(78, 58, 38, 0.24)' },
    typeface: {
      type: String,
      default: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    },
  },
  computed: {
    frameStyle() {
      if (this.kind !== 'bar') return null
      const points = Math.max(this.labels.length, 1)
      return { width: `min(100%, ${Math.max(points, 4) * 48}px)` }
    },
    chartData() {
      return {
        labels: this.labels,
        datasets: this.series.map((item) => ({
          label: item.label,
          data: item.data,
          backgroundColor: item.color,
          borderColor: item.color,
          borderWidth: this.kind === 'line' ? 2 : 0,
          pointRadius: this.kind === 'line' ? 3 : 0,
          pointHoverRadius: 4,
          tension: 0.25,
          fill: false,
          maxBarThickness: 14,
          borderRadius: 3,
          categoryPercentage: 0.62,
          barPercentage: 0.8,
        })),
      }
    },
    chartOptions() {
      const max = Math.max(0, ...this.series.flatMap((item) => item.data.map((value) => Number(value) || 0)))
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 180 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 2, right: 2, bottom: 0, left: 0 } },
        plugins: {
          legend: {
            display: this.series.length > 1,
            labels: {
              color: this.mutedColor,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { family: this.typeface, size: 11 },
            },
          },
          tooltip: {
            backgroundColor: this.surfaceColor,
            titleColor: this.textColor,
            bodyColor: this.textColor,
            borderColor: this.borderColor,
            borderWidth: 1,
            padding: 8,
            boxPadding: 3,
            titleFont: { family: this.typeface, size: 12 },
            bodyFont: { family: this.typeface, size: 12 },
            events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend'],
          },
        },
        scales: {
          x: {
            ticks: { color: this.mutedColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { family: this.typeface, size: 11 } },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: max <= 4 ? 4 : undefined,
            ticks: {
              color: this.mutedColor,
              precision: 0,
              maxTicksLimit: 5,
              stepSize: max <= 6 ? 1 : undefined,
              font: { family: this.typeface, size: 11 },
            },
            grid: { color: this.gridColor },
            border: { display: false },
          },
        },
      }
    },
  },
}
</script>

<template>
  <div class="growth-chart" :style="frameStyle">
    <Bar v-if="kind === 'bar'" :data="chartData" :options="chartOptions" :aria-label="ariaLabel" role="img" />
    <Line v-else :data="chartData" :options="chartOptions" :aria-label="ariaLabel" role="img" />
  </div>
</template>

<style scoped>
.growth-chart {
  position: relative;
  height: 196px;
  max-width: 100%;
  margin-inline: auto;
  overflow: hidden;
}
.growth-chart :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
  max-width: none;
}
@media (max-width: 720px) {
  .growth-chart { height: 168px; }
}
</style>
