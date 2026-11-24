<template>
  <section class="parent-home">
    <header class="parent-page parent-progress__head">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-graph-up-arrow"></i></span>
      <div class="parent-progress__head-copy">
        <h1>{{ t('parent.nav_progress') }}</h1>
        <p>{{ t('parent.progress_detail_hint') }}</p>
      </div>
      <div v-if="children.length" class="parent-progress__toolbar parent-filters">
        <ParentChildFilter
          v-if="children.length > 1"
          :children="children"
          :selected-id="selectedId"
          :allow-all="false"
          @select="$emit('select-child', $event)"
        />
        <div class="parent-pills" role="group" :aria-label="t('parent.progress_window_label')">
          <button
            type="button"
            :class="{ 'is-active': window === 'week' }"
            :aria-pressed="window === 'week' ? 'true' : 'false'"
            @click="$emit('window', 'week')"
          >
            {{ t('parent.progress_week') }}
          </button>
          <button
            type="button"
            :class="{ 'is-active': window === 'month' }"
            :aria-pressed="window === 'month' ? 'true' : 'false'"
            @click="$emit('window', 'month')"
          >
            {{ t('parent.progress_month') }}
          </button>
        </div>
      </div>
    </header>

    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherEmpty v-else-if="!childId" illustrated icon="bi bi-person" :message="t('parent.progress_pick_child')" />
    <TeacherEmpty v-else-if="!shared" illustrated icon="bi bi-lock" :message="t('parent.permission_progress')" />
    <div v-else-if="loading" class="teacher-skeletons" role="status">
      <div v-for="n in 3" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <NetworkFallback v-else-if="error" @retry="$emit('reload')" />
    <template v-else-if="payload">
      <section class="parent-panel parent-progress-summary" :aria-label="t('parent.progress_summary_title')">
        <p class="parent-lead">{{ summaryLine }}</p>
        <div class="parent-stats parent-stats--compact" role="list">
          <article v-for="card in summaryCards" :key="card.key" class="parent-stat" role="listitem">
            <span aria-hidden="true"><i :class="card.icon"></i></span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.label }}</small>
          </article>
        </div>
      </section>

      <div class="parent-progress-stack">
        <section class="parent-panel" :aria-labelledby="lifetimeHeadingId">
          <h2 :id="lifetimeHeadingId" class="parent-report__subhead">{{ t('parent.reports_lifetime_stats') }}</h2>
          <ul class="parent-report-metrics">
            <li v-for="row in lifetimeRows" :key="row.key">
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </li>
          </ul>
          <p v-for="row in lifetimeHints" :key="row.key" class="parent-stat__hint">{{ row.hint }}</p>
        </section>

        <section class="parent-panel" :aria-labelledby="periodHeadingId">
          <h2 :id="periodHeadingId" class="parent-report__subhead">{{ t('parent.reports_period_stats') }}</h2>
          <ul class="parent-report-metrics">
            <li v-for="row in periodRows" :key="row.key">
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </li>
          </ul>
        </section>
      </div>

      <section class="parent-progress-metrics" :aria-label="t('parent.progress_coverage')">
        <article v-for="card in metricCards" :key="card.key" class="parent-stat parent-progress-metric">
          <span aria-hidden="true"><i :class="card.icon"></i></span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.label }}</small>
          <p class="parent-stat__hint">{{ card.detail }}</p>
        </article>
      </section>

      <section v-if="showTrends" class="parent-panel" :aria-label="t('parent.progress_assignments')">
        <h2 class="parent-report__subhead">{{ t('parent.progress_assignments') }}</h2>
        <ul class="parent-progress-trends">
          <li v-for="bucket in trendBuckets" :key="bucket.week_start">
            <span>{{ formatTrendWeek(bucket.week_start) }}</span>
            <span>{{ t('parent.progress_trend_line', { due: bucket.due, completed: bucket.completed, overdue: bucket.overdue }) }}</span>
          </li>
        </ul>
      </section>

      <section v-else-if="payload.assignment_trends?.length" class="parent-panel">
        <p class="parent-stat__hint">{{ t('parent.progress_trends_empty') }}</p>
      </section>

      <section v-if="showWording" class="parent-panel">
        <h2 class="parent-report__subhead">{{ t('parent.progress_wording_match') }}</h2>
        <p>{{ t('parent.progress_wording_direction', { direction: t(wordingDirection) }) }}</p>
        <small class="parent-stat__hint">{{ t('parent.progress_wording_note') }}</small>
      </section>

      <nav class="parent-progress-links parent-hub-actions" :aria-label="t('parent.home_quick_actions')">
        <button type="button" @click="$emit('open-learning', childId)">
          <i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.open_learning') }}
        </button>
        <button type="button" @click="$emit('open-reports', childId)">
          <i class="bi bi-calendar2-heart" aria-hidden="true"></i>{{ t('parent.reports_open') }}
        </button>
        <button type="button" @click="$emit('open-messages', childId)">
          <i class="bi bi-chat-heart" aria-hidden="true"></i>{{ t('parent.home_message') }}
        </button>
      </nav>

      <section v-if="suggestions.length" class="parent-suggest">
        <h2><i class="bi bi-lightbulb" aria-hidden="true"></i>{{ t('parent.progress_suggests') }}</h2>
        <ul>
          <li v-for="item in suggestions" :key="item.id">{{ recommendationTitle(item) }}</li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, formatWhen, passageLabel } from '../../scripts/parent/dashboard'
import {
  coreMetricCards,
  lifetimeMetricRows,
  periodMetricRows,
  progressSummaryLine,
  showAssignmentTrends,
  showWordingTrend,
  wordingDirectionKey,
} from '../../scripts/parent/progressView'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'

export default {
  name: 'ParentFamilyProgress',
  components: { ParentChildFilter, TeacherEmpty, NetworkFallback },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
    childId: { type: Number, default: null },
    payload: { type: Object, default: null },
    window: { type: String, default: 'month' },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
  },
  emits: ['select-child', 'window', 'reload', 'open-learning', 'open-reports', 'open-messages'],
  computed: {
    lifetimeHeadingId() {
      return `parent-progress-lifetime-${this.childId || 'none'}`
    },
    periodHeadingId() {
      return `parent-progress-period-${this.childId || 'none'}`
    },
    summaryLine() {
      return progressSummaryLine(this.t, this.payload, this.window)
    },
    summaryCards() {
      const coverage = this.payload?.coverage || {}
      const practice = this.payload?.practice_volume || {}
      return [
        { key: 'memorised', label: this.t('parent.kpi_memorised'), value: coverage.memorised_ayahs || 0, icon: 'bi bi-journal-bookmark' },
        { key: 'practice', label: this.t('parent.kpi_practice'), value: practice.ayah_rows || 0, icon: 'bi bi-activity' },
        {
          key: 'assignments',
          label: this.t('parent.kpi_active'),
          value: this.payload?.assignment_completion?.completed ?? 0,
          icon: 'bi bi-journal-check',
        },
      ]
    },
    lifetimeRows() {
      return lifetimeMetricRows(this.t, this.payload)
    },
    lifetimeHints() {
      return this.lifetimeRows.filter((row) => row.hint)
    },
    periodRows() {
      return periodMetricRows(this.t, this.payload, this.window)
    },
    metricCards() {
      return coreMetricCards(this.t, this.payload, this.window)
    },
    suggestions() {
      return (this.payload?.recommendations || []).slice(0, 3)
    },
    showTrends() {
      return showAssignmentTrends(this.payload?.assignment_trends)
    },
    trendBuckets() {
      return (this.payload?.assignment_trends || []).filter((row) => Number(row?.due || 0) > 0)
    },
    showWording() {
      return showWordingTrend(this.payload?.wording_match)
    },
    wordingDirection() {
      return wordingDirectionKey(this.payload?.wording_match?.direction)
    },
  },
  methods: {
    recommendationTitle(item) {
      return [activityName(this.t, item.activity), passageLabel(item) || item.surah_name].filter(Boolean).join(' · ')
    },
    formatTrendWeek(value) {
      return formatWhen(value)
    },
  },
}
</script>