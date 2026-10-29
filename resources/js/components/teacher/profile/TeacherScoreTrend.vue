<template>
  <section v-if="points.length" class="teacher-score-trend" :aria-label="t('teacher.score_trend')">
    <header class="teacher-score-trend__head">
      <div>
        <h3>{{ t('teacher.score_trend') }}</h3>
        <p class="tabular-nums">{{ helpText }}</p>
      </div>
      <span v-if="latestScore !== null" class="tabular-nums">{{ t('teacher.score_n', { n: latestScore }) }}</span>
    </header>
    <svg class="teacher-score-trend__chart" viewBox="0 0 320 120" role="img" :aria-label="helpText">
      <g class="teacher-score-trend__grid">
        <line x1="0" y1="100" x2="320" y2="100" />
        <line x1="0" y1="50" x2="320" y2="50" />
      </g>
      <polyline class="teacher-score-trend__line" :points="polyline" />
      <g class="teacher-score-trend__point">
        <circle v-for="(point, index) in plotPoints" :key="index" :cx="point.x" :cy="point.y" r="4" />
      </g>
    </svg>
  </section>
  <p v-else class="teacher-score-trend__empty">{{ t('teacher.no_scored_checks') }}</p>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'

export default {
  name: 'TeacherScoreTrend',
  mixins: [i18nMixin],
  props: {
    trend: { type: Array, default: () => [] },
  },
  computed: {
    points() {
      return (this.trend || []).filter((row) => typeof row.accuracy_percent === 'number')
    },
    helpText() {
      const n = this.points.length
      if (!n) return this.t('teacher.no_scored_checks')
      return this.t('teacher.score_trend_checks', { n })
    },
    latestScore() {
      const last = this.points[this.points.length - 1]
      return typeof last?.accuracy_percent === 'number' ? last.accuracy_percent : null
    },
    plotPoints() {
      if (this.points.length < 2) {
        const score = this.points[0]?.accuracy_percent ?? 0
        return [{ x: 160, y: 100 - score }]
      }
      const maxX = 320
      const step = maxX / Math.max(1, this.points.length - 1)
      return this.points.map((point, index) => ({
        x: index * step,
        y: 100 - Math.min(100, Math.max(0, Number(point.accuracy_percent))),
      }))
    },
    polyline() {
      return this.plotPoints.map((point) => `${point.x},${point.y}`).join(' ')
    },
  },
}
</script>
