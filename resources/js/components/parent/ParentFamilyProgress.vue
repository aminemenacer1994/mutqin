<template>
  <section class="parent-home parent-progress-page teacher-stack">
    <header class="teacher-page-header parent-progress__head">
      <div class="parent-progress__head-copy">
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_progress') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.progress_detail_hint') }}</p>
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
      <section class="parent-panel parent-progress-summary" :aria-labelledby="overviewHeadingId">
        <h2 :id="overviewHeadingId" class="parent-report__subhead">{{ t('parent.progress_summary_title') }}</h2>
        <p class="parent-lead">{{ summaryLine }}</p>
        <div class="parent-stats parent-stats--compact parent-progress-overview" role="list">
          <article v-for="card in overviewCards" :key="card.key" class="parent-stat parent-stat--compact" role="listitem">
            <span aria-hidden="true"><i :class="card.icon"></i></span>
            <strong :class="{ 'parent-metric__empty': card.empty }">{{ card.value }}</strong>
            <small>{{ card.label }}</small>
            <p v-if="card.hint" class="parent-stat__hint">{{ card.hint }}</p>
          </article>
        </div>
      </section>

      <section class="parent-panel" :aria-labelledby="memorisationHeadingId">
        <h2 :id="memorisationHeadingId" class="parent-report__subhead">{{ t('parent.progress_section_memorisation') }}</h2>
        <p class="parent-stat__hint">{{ t('parent.progress_lifetime_scope') }}</p>
        <ul class="parent-report-metrics">
          <li v-for="row in lifetimeRows" :key="row.key">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
          </li>
        </ul>
        <p v-for="row in lifetimeHints" :key="`${row.key}-hint`" class="parent-stat__hint">{{ row.hint }}</p>
      </section>

      <section class="parent-panel" :aria-labelledby="activityHeadingId">
        <h2 :id="activityHeadingId" class="parent-report__subhead">{{ t('parent.progress_section_activity') }}</h2>
        <template v-if="showTrends">
          <h3 class="parent-report__subhead parent-report__subhead--minor">{{ t('parent.progress_assignments') }}</h3>
          <ul class="parent-progress-trends">
            <li v-for="bucket in trendBuckets" :key="bucket.week_start">
              <span>{{ formatTrendWeek(bucket.week_start) }}</span>
              <span>{{ t('parent.progress_trend_line', { due: bucket.due, completed: bucket.completed, overdue: bucket.overdue }) }}</span>
            </li>
          </ul>
        </template>
        <TeacherEmpty
          v-else-if="payload.assignment_trends?.length"
          inline
          icon="bi bi-journal-check"
          :message="t('parent.progress_trends_empty')"
        />
        <template v-if="showWording">
          <h3 class="parent-report__subhead parent-report__subhead--minor">{{ t('parent.progress_wording_match') }}</h3>
          <p>{{ t('parent.progress_wording_direction', { direction: t(wordingDirection) }) }}</p>
          <small class="parent-stat__hint">{{ t('parent.progress_wording_note') }}</small>
        </template>
      </section>

      <section class="parent-panel" :aria-labelledby="feedbackHeadingId">
        <h2 :id="feedbackHeadingId" class="parent-report__subhead">{{ t('parent.progress_section_feedback') }}</h2>
        <div v-if="suggestions.length" class="parent-suggest parent-suggest--inline">
          <h3 class="parent-report__subhead parent-report__subhead--minor">
            <i class="bi bi-lightbulb" aria-hidden="true"></i>{{ t('parent.progress_suggests') }}
          </h3>
          <ul>
            <li v-for="item in suggestions" :key="item.id">{{ recommendationTitle(item) }}</li>
          </ul>
        </div>
        <div v-if="teacherAssessments.length" class="parent-progress-assessments">
          <ParentAssessmentCard
            v-for="row in teacherAssessments"
            :key="row.attempt_id"
            :assessment="row"
          />
        </div>
        <TeacherEmpty
          v-if="!suggestions.length && !teacherAssessments.length"
          inline
          icon="bi bi-chat-square-quote"
          :message="t('parent.profile_feedback_empty')"
        />
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
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, formatWhen, passageLabel } from '../../scripts/parent/dashboard'
import {
  lifetimeMetricRows,
  progressSummaryCards,
  progressSummaryLine,
  showAssignmentTrends,
  showWordingTrend,
  teacherReviewedAssessments,
  wordingDirectionKey,
} from '../../scripts/parent/progressView'
import ParentAssessmentCard from './ParentAssessmentCard.vue'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'

export default {
  name: 'ParentFamilyProgress',
  components: { ParentAssessmentCard, ParentChildFilter, TeacherEmpty, NetworkFallback },
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
    overviewHeadingId() {
      return `parent-progress-overview-${this.childId || 'none'}`
    },
    memorisationHeadingId() {
      return `parent-progress-memorisation-${this.childId || 'none'}`
    },
    activityHeadingId() {
      return `parent-progress-activity-${this.childId || 'none'}`
    },
    feedbackHeadingId() {
      return `parent-progress-feedback-${this.childId || 'none'}`
    },
    summaryLine() {
      return progressSummaryLine(this.t, this.payload, this.window)
    },
    overviewCards() {
      return progressSummaryCards(this.t, this.payload, this.window)
    },
    lifetimeRows() {
      return lifetimeMetricRows(this.t, this.payload)
    },
    lifetimeHints() {
      return this.lifetimeRows.filter((row) => row.hint)
    },
    suggestions() {
      return (this.payload?.recommendations || []).slice(0, 3)
    },
    teacherAssessments() {
      return teacherReviewedAssessments(this.payload?.assessments)
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