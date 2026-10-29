<template>
  <div v-if="visible" class="learner-teacher__attempt-trend">
    <button
      type="button"
      class="learner-teacher__attempt-trend-btn"
      :aria-label="trendAriaLabel"
      @click="$emit('open-history')"
    >
      <span class="learner-teacher__attempt-trend-scores" aria-hidden="true">
        <template v-for="(score, index) in trend.scores" :key="`${score}-${index}`">
          <span
            class="learner-teacher__attempt-trend-score"
            :class="{ 'is-final': index === trend.scores.length - 1 }"
          >{{ score }}%</span>
          <i
            v-if="index < trend.scores.length - 1"
            class="bi bi-arrow-right learner-teacher__attempt-trend-sep"
            aria-hidden="true"
          ></i>
        </template>
        <span v-if="trend.hiddenCount" class="learner-teacher__attempt-trend-more">
          {{ t('teacher.learner_attempt_trend_earlier', { n: trend.hiddenCount }) }}
        </span>
      </span>
      <svg
        v-if="sparkline"
        class="learner-teacher__attempt-sparkline"
        viewBox="0 0 56 20"
        width="56"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          :points="sparkline"
        />
      </svg>
    </button>
    <p v-if="deltaLabel" class="learner-teacher__attempt-delta">{{ deltaLabel }}</p>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import {
  attemptDeltaKind,
  attemptScoreDelta,
  buildSparklinePolyline,
  buildTrendDisplay,
  shouldShowAttemptTrend,
  trendAccessibleScoreList,
} from '../../scripts/teacher/learnerTaskAttemptHistory.js'

export default {
  name: 'LearnerTaskAttemptTrend',
  mixins: [i18nMixin],
  props: {
    attempts: { type: Array, default: () => [] },
    maxAttempts: { type: Number, default: 1 },
  },
  emits: ['open-history'],
  computed: {
    visible() {
      return shouldShowAttemptTrend(this.attempts, this.maxAttempts)
    },
    trend() {
      return buildTrendDisplay(this.attempts)
    },
    sparkline() {
      return buildSparklinePolyline(this.attempts)
    },
    deltaLabel() {
      const kind = attemptDeltaKind(this.attempts)
      if (!kind) return ''
      if (kind === 'same') return this.t('teacher.learner_attempt_delta_same')
      const delta = Math.abs(attemptScoreDelta(this.attempts) || 0)
      if (kind === 'up') {
        return this.t('teacher.learner_attempt_delta_up', { n: delta })
      }
      return this.t('teacher.learner_attempt_delta_down', { n: delta })
    },
    trendAriaLabel() {
      const scores = trendAccessibleScoreList(this.attempts)
      return this.t('teacher.learner_attempt_trend_aria', { scores })
    },
  },
}
</script>
