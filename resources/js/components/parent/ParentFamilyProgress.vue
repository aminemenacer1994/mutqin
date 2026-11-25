<template>
  <section class="parent-home parent-progress-page teacher-stack">
    <header class="teacher-page-header parent-progress__head">
      <div class="parent-progress__head-copy">
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_progress') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.progress_detail_hint') }}</p>
      </div>
      <div v-if="children.length" class="parent-progress__toolbar parent-filters">
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
    <TeacherEmpty v-else-if="!childId" illustrated icon="bi bi-person" :message="t('parent.progress_pick_child_shell')" />
    <TeacherEmpty v-else-if="!shared" illustrated icon="bi bi-lock" :message="t('parent.permission_progress')" />
    <div v-else-if="loading" class="teacher-skeletons" role="status">
      <div v-for="n in 3" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <NetworkFallback v-else-if="error" @retry="$emit('reload')" />
    <template v-else-if="payload">
      <section class="parent-panel parent-progress-summary parent-progress-summary--featured" :aria-labelledby="overviewHeadingId">
        <h2 :id="overviewHeadingId" class="parent-report__subhead">{{ t('parent.progress_summary_title') }}</h2>
        <p class="parent-lead">{{ summaryLine }}</p>
        <div v-if="practiceBar.length" class="parent-progress-chart parent-progress-chart--practice">
          <p class="parent-stat__hint">{{ t('parent.progress_practice_chart_hint') }}</p>
          <ParentSimpleBarChart :bars="practiceBar" :aria-label="t('parent.kpi_practice')" />
        </div>
        <div class="parent-stats parent-stats--compact parent-progress-overview" role="list">
          <article v-for="card in overviewCards" :key="card.key" class="parent-stat parent-stat--compact" role="listitem">
            <span aria-hidden="true"><i :class="card.icon"></i></span>
            <strong :class="{ 'parent-metric__empty': card.empty }">{{ card.value }}</strong>
            <small>{{ card.label }}</small>
            <p v-if="card.hint" class="parent-stat__hint">{{ card.hint }}</p>
          </article>
        </div>
        <section
          v-if="periodHomeworkBars.length"
          class="parent-progress-chart parent-progress-chart--period"
          :aria-label="t('parent.progress_chart_period_homework')"
        >
          <p class="parent-stat__hint">{{ t('parent.progress_chart_period_homework_hint') }}</p>
          <ParentSimpleBarChart :bars="periodHomeworkBars" :aria-label="t('parent.progress_chart_period_homework')" />
        </section>
        <div class="parent-progress-summary__actions">
          <button
            v-if="assignmentsShared"
            type="button"
            class="parent-home-link"
            @click="$emit('open-learning', childId)"
          >
            {{ t('parent.open_learning') }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="parent-home-link" @click="$emit('open-reports', childId)">
            {{ t('parent.progress_open_report') }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>

      <section v-if="learningLine" class="parent-panel" :aria-labelledby="learningHeadingId">
        <h2 :id="learningHeadingId" class="parent-report__subhead">{{ t('parent.progress_current_learning') }}</h2>
        <p class="parent-lead">{{ learningLine }}</p>
        <button
          v-if="assignmentsShared"
          type="button"
          class="parent-home-link"
          @click="$emit('open-learning', childId)"
        >
          <i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.open_learning') }}
        </button>
      </section>

      <section
        v-if="showHomeworkSection"
        class="parent-panel"
        :aria-labelledby="homeworkHeadingId"
      >
        <h2 :id="homeworkHeadingId" class="parent-report__subhead">{{ t('parent.progress_section_homework') }}</h2>
        <div
          v-if="showActivityFilters"
          class="parent-pills parent-progress__activity-pills"
          role="group"
          :aria-label="t('parent.filter_category')"
        >
          <button
            type="button"
            :class="{ 'is-active': !activityFilter }"
            :aria-pressed="!activityFilter ? 'true' : 'false'"
            @click="activityFilter = null"
          >
            {{ t('parent.filter_all_activities') }}
          </button>
          <button
            v-for="act in progressActivities"
            :key="act"
            type="button"
            :class="{ 'is-active': activityFilter === act }"
            :aria-pressed="activityFilter === act ? 'true' : 'false'"
            @click="activityFilter = act"
          >
            {{ activityName(t, act) }}
          </button>
        </div>
        <section v-if="homeworkTrendBars.length" class="parent-progress-chart" :aria-label="t('parent.progress_chart_homework')">
          <ParentSimpleBarChart :bars="homeworkTrendBars" :aria-label="t('parent.progress_chart_homework')" />
        </section>
        <ul v-if="homeworkRows.length" class="parent-progress-homework-list" role="list">
          <li v-for="row in homeworkRows" :key="row.id" role="listitem">
            <div class="parent-progress-homework-list__copy">
              <strong>{{ homeworkRowTitle(row) }}</strong>
              <small v-if="row.due_at">{{ formatTrendWeek(row.due_at) }}</small>
            </div>
            <span class="parent-status" :class="homeworkStatusClass(row.displayState)">{{ t(homeworkStatusKey(row.displayState)) }}</span>
          </li>
        </ul>
        <TeacherEmpty
          v-else
          inline
          icon="bi bi-journal-check"
          :message="t('parent.homework_empty_filter')"
        />
        <button
          v-if="assignmentsShared"
          type="button"
          class="parent-home-link"
          @click="$emit('open-learning', childId)"
        >
          <i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.open_learning') }}
        </button>
      </section>

      <section class="parent-panel" :aria-labelledby="memorisationHeadingId">
        <h2 :id="memorisationHeadingId" class="parent-report__subhead">{{ t('parent.progress_section_memorisation') }}</h2>
        <p class="parent-stat__hint">{{ t('parent.progress_lifetime_scope') }}</p>
        <details class="parent-progress-hifz-terms">
          <summary>{{ t('parent.progress_hifz_terms') }}</summary>
          <p class="parent-stat__hint">{{ t('teacher.hifz_stage_help') }}</p>
        </details>
        <ul class="parent-report-metrics">
          <li v-for="row in lifetimeRows" :key="row.key">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
          </li>
        </ul>
        <p v-for="row in lifetimeHints" :key="`${row.key}-hint`" class="parent-stat__hint">{{ row.hint }}</p>
      </section>

      <section v-if="showActivitySection" class="parent-panel" :aria-labelledby="activityHeadingId">
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

      <section class="parent-panel" :aria-labelledby="weakHeadingId">
        <h2 :id="weakHeadingId" class="parent-report__subhead">{{ t('parent.progress_weak') }}</h2>
        <ul v-if="weakPassages.length" class="parent-progress-trends" role="list">
          <li v-for="item in weakPassages" :key="item.id" role="listitem">
            <span>{{ item.label }}</span>
            <span>{{ t('parent.progress_weak_count', { count: item.count }) }}</span>
          </li>
        </ul>
        <TeacherEmpty
          v-else
          inline
          icon="bi bi-lightbulb"
          :message="t('parent.progress_weak_empty')"
        />
      </section>

      <section
        v-if="attendanceShared"
        class="parent-panel"
        :aria-labelledby="attendanceHeadingId"
      >
        <h2 :id="attendanceHeadingId" class="parent-report__subhead">{{ t('parent.progress_section_attendance') }}</h2>
        <p class="parent-stat__hint">{{ t('parent.progress_attendance_hint') }}</p>
        <div v-if="attendanceLoading" class="teacher-skeletons" role="status">
          <div class="teacher-skeleton"></div>
        </div>
        <NetworkFallback v-else-if="attendanceError" @retry="$emit('reload')" />
        <template v-else-if="attendance">
          <div class="parent-stats parent-stats--compact" role="list">
            <article class="parent-stat parent-stat--compact" role="listitem">
              <span aria-hidden="true"><i class="bi bi-percent"></i></span>
              <strong>{{ attendanceRateLabel }}</strong>
              <small>{{ t('parent.progress_attendance_rate') }}</small>
            </article>
            <article
              v-for="chip in attendanceCounts"
              :key="chip.key"
              class="parent-stat parent-stat--compact"
              role="listitem"
            >
              <span aria-hidden="true"><i :class="chip.icon"></i></span>
              <strong>{{ chip.value }}</strong>
              <small>{{ chip.label }}</small>
            </article>
          </div>
          <ul v-if="attendanceHistory.length" class="parent-progress-attendance" role="list">
            <li v-for="row in attendanceHistory" :key="`${row.date}-${row.status}`" role="listitem">
              <span>{{ formatTrendWeek(row.date) }}</span>
              <span>{{ attendanceStatusLabel(row.status) }}</span>
              <small v-if="row.group">{{ row.group }}</small>
            </li>
          </ul>
          <TeacherEmpty
            v-else
            inline
            icon="bi bi-calendar-week"
            :message="t('parent.progress_attendance_empty')"
          />
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

    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, formatWhen, learningLabel, passageLabel } from '../../scripts/parent/dashboard'
import {
  PARENT_PROGRESS_ACTIVITIES,
  filterProgressHomeworkItems,
  lifetimeMetricRows,
  parentWeakPassages,
  progressHomeworkDueState,
  progressHomeworkStatusKey,
  progressSummaryCards,
  progressSummaryLine,
  showAssignmentTrends,
  showWordingTrend,
  teacherReviewedAssessments,
  wordingDirectionKey,
} from '../../scripts/parent/progressView'
import ParentAssessmentCard from './ParentAssessmentCard.vue'
import ParentSimpleBarChart from './ParentSimpleBarChart.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'
import { assignmentTrendBars, progressPeriodHomeworkBars, progressPracticeBar } from '../../scripts/parent/progressCharts'

export default {
  name: 'ParentFamilyProgress',
  components: { ParentAssessmentCard, ParentSimpleBarChart, TeacherEmpty, NetworkFallback },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
    childId: { type: Number, default: null },
    payload: { type: Object, default: null },
    window: { type: String, default: 'week' },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    learning: { type: Object, default: null },
    attendance: { type: Object, default: null },
    attendanceLoading: { type: Boolean, default: false },
    attendanceError: { type: Boolean, default: false },
    attendanceShared: { type: Boolean, default: false },
  },
  emits: ['window', 'reload', 'open-learning', 'open-messages', 'open-reports'],
  data() {
    return {
      activityFilter: null,
    }
  },
  watch: {
    window() {
      this.activityFilter = null
    },
    childId() {
      this.activityFilter = null
    },
  },
  computed: {
    progressActivities() {
      return PARENT_PROGRESS_ACTIVITIES
    },
    learningHeadingId() {
      return `parent-progress-learning-${this.childId || 'none'}`
    },
    attendanceHeadingId() {
      return `parent-progress-attendance-${this.childId || 'none'}`
    },
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
    homeworkHeadingId() {
      return `parent-progress-homework-${this.childId || 'none'}`
    },
    weakHeadingId() {
      return `parent-progress-weak-${this.childId || 'none'}`
    },
    showHomeworkSection() {
      const completion = this.payload?.assignment_completion || {}
      const items = completion.items
      const due = Number(completion.due || 0)
      return due > 0 || (Array.isArray(items) && items.length > 0)
    },
    showActivityFilters() {
      const items = this.payload?.assignment_completion?.items
      if (!Array.isArray(items) || items.length < 2) return false
      const activities = new Set(items.map((row) => String(row?.activity || '')).filter(Boolean))
      return activities.size > 1
    },
    homeworkRows() {
      const items = filterProgressHomeworkItems(this.payload?.assignment_completion?.items, this.activityFilter)
      return items.map((row) => ({
        ...row,
        displayState: progressHomeworkDueState(row),
      }))
    },
    weakPassages() {
      return parentWeakPassages(this.payload?.weak_passages)
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
    learningLine() {
      return learningLabel(this.t, this.learning) || ''
    },
    homeworkTrendBars() {
      return assignmentTrendBars(this.t, this.payload?.assignment_trends, this.formatTrendWeek.bind(this))
    },
    periodHomeworkBars() {
      return progressPeriodHomeworkBars(this.t, this.payload?.assignment_completion)
    },
    practiceBar() {
      return progressPracticeBar(this.t, this.payload?.practice_volume, this.window)
    },
    assignmentsShared() {
      const child = this.children.find((row) => Number(row.id) === Number(this.childId))
      return Boolean(child?.permissions?.assignments)
    },
    showActivitySection() {
      return this.showTrends || this.showWording
    },
    attendanceRateLabel() {
      const rate = this.attendance?.rate_percent
      return rate == null ? '—' : `${rate}%`
    },
    attendanceCounts() {
      const counts = this.attendance?.counts || {}
      return [
        { key: 'present', icon: 'bi bi-check-lg', label: this.t('teacher.attendance_present'), value: Number(counts.present || 0) },
        { key: 'absent', icon: 'bi bi-x-lg', label: this.t('teacher.attendance_absent'), value: Number(counts.absent || 0) },
        { key: 'late', icon: 'bi bi-clock', label: this.t('teacher.attendance_late'), value: Number(counts.late || 0) },
      ]
    },
    attendanceHistory() {
      return Array.isArray(this.attendance?.history) ? this.attendance.history.slice(0, 8) : []
    },
  },
  methods: {
    attendanceStatusLabel(status) {
      if (status === 'present') return this.t('teacher.attendance_present')
      if (status === 'absent') return this.t('teacher.attendance_absent')
      if (status === 'late') return this.t('teacher.attendance_late')
      if (status === 'excused') return this.t('teacher.attendance_excused')
      return status || ''
    },
    recommendationTitle(item) {
      return [activityName(this.t, item.activity), passageLabel(item) || item.surah_name].filter(Boolean).join(' · ')
    },
    formatTrendWeek(value) {
      return formatWhen(value)
    },
    homeworkStatusKey(state) {
      return progressHomeworkStatusKey(state)
    },
    homeworkStatusClass(state) {
      if (state === 'overdue' || state === 'late') return 'is-late'
      if (state === 'completed' || state === 'done') return 'is-ok'
      return 'is-open'
    },
    homeworkRowTitle(row) {
      const activity = activityName(this.t, row.activity)
      const stage = row.activity === 'hifz' && row.hifz_category
        ? this.t(`teacher.hifz_${row.hifz_category}`)
        : ''
      const bits = [activity, stage, row.label].filter(Boolean)
      return bits.join(' · ')
    },
  },
}
</script>