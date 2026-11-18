<template>
  <section class="dash-section dash-section--flat">
    <div class="dash-section__head dash-section__head--compact">
      <div class="dash-section__head-row">
        <div class="dash-section__title">
          <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true"><i class="bi bi-bar-chart"></i></span>
          <div class="dash-section__title-copy">
            <h2>{{ title || t('teacher.activity') }}</h2>
            <p v-if="caption" class="teacher-insights__caption">{{ caption }}</p>
          </div>
        </div>
        <div v-if="showRange" class="dash-range-toggle" role="group" :aria-label="t('teacher.chart_range')">
          <button
            v-for="days in dayOptions"
            :key="days"
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            :class="{ 'is-active': chartDays === days }"
            :aria-pressed="chartDays === days ? 'true' : 'false'"
            @click="$emit('set-days', days)"
          >
            {{ t('teacher.days', { n: days }) }}
          </button>
        </div>
      </div>
    </div>
    <div class="dash-section__body">
      <div v-if="errorMessage" class="dash-chart__empty dash-chart__empty--error" role="alert">
        <strong>{{ errorMessage }}</strong>
      </div>
      <div v-else-if="loading" class="dash-chart__empty" role="status" aria-live="polite">
        <strong>{{ t('teacher.loading') }}</strong>
      </div>
      <div v-else-if="isEmpty" class="dash-chart__empty">
        <strong>{{ emptyMessage || t('teacher.activity_empty') }}</strong>
      </div>
      <div v-else class="dash-chart__wrap">
        <Bar v-if="chartReady" :data="chartData" :options="chartOptions" :aria-label="title || t('teacher.activity')" role="img" />
      </div>
    </div>
  </section>
</template>

<script>
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { i18nMixin } from '../../mixins/i18nMixin'

ChartJS.register(CategoryScale, LinearScale, BarElement, Legend, Tooltip)

export default {
  name: 'TeacherActivityChart',
  components: { Bar },
  mixins: [i18nMixin],
  props: {
    title: { type: String, default: '' },
    caption: { type: String, default: '' },
    emptyMessage: { type: String, default: '' },
    showRange: { type: Boolean, default: true },
    chartDays: { type: Number, required: true },
    dayOptions: { type: Array, default: () => [30, 90] },
    loading: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
    isEmpty: { type: Boolean, default: false },
    chartReady: { type: Boolean, default: true },
    chartData: { type: Object, required: true },
    chartOptions: { type: Object, required: true },
  },
  emits: ['set-days'],
}
</script>
