<template>
  <section class="parent-home parent-homework teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_learning') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.learning_detail_hint') }}</p>
      </div>
    </header>

    <div v-if="children.length" class="parent-filters parent-homework-toolbar" :class="{ 'is-expanded': filtersOpen }">
      <button
        type="button"
        class="parent-homework-toolbar__toggle"
        :aria-expanded="filtersOpen ? 'true' : 'false'"
        @click="filtersOpen = !filtersOpen"
      >
        <i class="bi bi-funnel" aria-hidden="true"></i>
        {{ t('parent.filter_label') }}
      </button>
      <ParentChildLearningFilters
        :activity="filters.activity"
        :status="filters.status"
        :from="filters.from"
        :to="filters.to"
        :expanded="filtersOpen"
        @activity="updateFilter('activity', $event)"
        @status="updateFilter('status', $event)"
        @from="updateFilter('from', $event)"
        @to="updateFilter('to', $event)"
      />
    </div>

    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherEmpty v-else-if="!shared" illustrated icon="bi bi-lock" :message="t('parent.permission_assignments')" />
    <div v-else-if="loading" class="parent-homework-loading" role="status">
      <div class="parent-homework-skeleton__toolbar teacher-skeleton" aria-hidden="true"></div>
      <div v-for="n in 3" :key="n" class="teacher-skeleton parent-homework-skeleton__card"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <NetworkFallback v-else-if="error" @retry="$emit('reload')" />
    <template v-else>
      <div v-if="filtersActive" class="parent-homework-toolbar__meta">
        <p class="parent-count">{{ listHint }}</p>
        <button v-if="filtersActive" type="button" class="parent-homework-reset" @click="resetFilters">
          {{ t('parent.filter_reset') }}
        </button>
      </div>
      <p v-if="truncated" class="parent-note">{{ t('parent.homework_truncated') }}</p>
      <div v-if="!sortedRows.length" class="parent-homework-empty">
        <TeacherEmpty illustrated icon="bi bi-check2-circle" :message="emptyMessage" />
        <button v-if="filtersActive" type="button" class="dash-btn dash-btn--ghost" @click="resetFilters">
          {{ t('parent.filter_reset') }}
        </button>
      </div>
      <div v-else id="parent-homework-breakdown" class="parent-homework-breakdown">
        <h2 class="parent-report__subhead">{{ listHint }}</h2>
        <section
          v-for="group in groupedRows"
          :key="group.key"
          class="parent-homework-group"
          :aria-labelledby="`parent-homework-group-${group.key}`"
        >
          <h2 :id="`parent-homework-group-${group.key}`" class="parent-homework-group__title">
            {{ groupTitle(group.key) }}
            <span class="parent-homework-group__count">{{ group.rows.length }}</span>
          </h2>
          <ul class="parent-tasks parent-homework-list">
            <li
              v-for="(item, index) in group.rows"
              :key="item.id"
              class="parent-task parent-homework-card"
              :style="{ '--parent-i': index }"
            >
              <article>
                <button
                  type="button"
                  class="parent-homework-card__hit"
                  :aria-label="viewLabel(item)"
                  @click="openDetail(item)"
                >
                  <span class="parent-task__icon" aria-hidden="true"><i :class="activityIcon(item.assignment?.activity)"></i></span>
                  <span class="parent-homework-card__body">
                    <strong class="parent-homework-card__title" :dir="titleDir(item)">{{ taskTitle(item) }}</strong>
                    <small class="parent-homework-card__meta">{{ cardMeta(item) }}</small>
                    <span class="parent-homework-card__badges">
                      <span v-if="categoryLabel(item)" class="parent-status is-quiet">{{ categoryLabel(item) }}</span>
                      <span class="parent-status" :class="statusClass(item.display_status)">
                        <i :class="statusIcon(item.display_status)" aria-hidden="true"></i>
                        {{ statusLabel(item.display_status) }}
                      </span>
                    </span>
                  </span>
                  <span class="parent-homework-card__cta">
                    {{ t('parent.homework_view_details') }}
                    <i class="bi bi-arrow-right" aria-hidden="true"></i>
                  </span>
                </button>
              </article>
            </li>
          </ul>
        </section>
      </div>
    </template>
    <details v-if="!loading && !error && shared && sortedRows.length" class="parent-disclosure parent-homework-analytics">
      <summary>{{ t('parent.homework_breakdown_title') }}</summary>
        <div v-if="statusBars.length || activityBars.length" class="parent-homework-breakdown__charts">
          <section v-if="statusBars.length" class="parent-reports-chart-panel">
            <h3 class="parent-report__subhead parent-report__subhead--minor">{{ t('parent.homework_chart_status') }}</h3>
            <ParentSimpleBarChart :bars="statusBars" :aria-label="t('parent.homework_chart_status')" />
          </section>
          <section v-if="activityBars.length" class="parent-reports-chart-panel">
            <h3 class="parent-report__subhead parent-report__subhead--minor">{{ t('parent.homework_chart_activity') }}</h3>
            <ParentSimpleBarChart :bars="activityBars" :aria-label="t('parent.homework_chart_activity')" />
          </section>
        </div>
    </details>

    <DashModalRoot
        :open="Boolean(active)"
        labelled-by="parent-task-title"
        root-class="parent-modal-root parent-homework-detail"
        panel-class="parent-modal parent-homework-detail__panel"
        test-id="parent-homework-detail-modal"
        @close="closeDetail"
      >
        <template v-if="active">
          <header class="parent-modal__head">
            <div class="parent-modal__head-main">
              <div class="parent-modal__title-row">
                <h2 id="parent-task-title" :dir="titleDir(active)">{{ taskTitle(active) }}</h2>
                <span class="parent-status" :class="statusClass(active.display_status)">
                  <i :class="statusIcon(active.display_status)" aria-hidden="true"></i>
                  {{ statusLabel(active.display_status) }}
                </span>
              </div>
              <dl class="parent-modal__meta-grid">
                <div>
                  <dt>{{ t('parent.modal_student') }}</dt>
                  <dd>{{ active.child_name }}</dd>
                </div>
                <div>
                  <dt>{{ t('parent.filter_category') }}</dt>
                  <dd>{{ categoryLabel(active) || '—' }}</dd>
                </div>
                <div>
                  <dt>{{ t('parent.modal_due') }}</dt>
                  <dd>{{ dueLabel(active) }}</dd>
                </div>
                <div>
                  <dt>{{ t('parent.modal_teacher') }}</dt>
                  <dd>{{ active.teacher_name || '—' }}</dd>
                </div>
              </dl>
            </div>
            <button type="button" class="parent-modal__close" :aria-label="t('parent.modal_close')" @click="closeDetail">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>
          <div class="parent-modal__body parent-homework-detail__body">
            <dl v-if="detailFields(active).length" class="parent-homework-detail__grid">
              <div v-for="field in detailFields(active)" :key="field.key">
                <dt>{{ field.label }}</dt>
                <dd>{{ field.value }}</dd>
              </div>
            </dl>
            <p class="parent-homework-detail__summary">{{ cardMeta(active) }}</p>
            <section v-if="historyRows(active).length" class="learner-assignment-modal__section parent-homework-detail__timeline">
              <h3>{{ t('parent.homework_timeline') }}</h3>
              <ol class="parent-homework-timeline">
                <li v-for="(step, index) in historyRows(active)" :key="`${step.label}-${index}`">
                  <span class="parent-homework-timeline__dot" aria-hidden="true"></span>
                  <div>
                    <strong>{{ step.label }}</strong>
                    <time v-if="step.when" :datetime="step.when">{{ step.whenLabel }}</time>
                  </div>
                </li>
              </ol>
            </section>
            <section v-if="active.instructions" class="learner-assignment-modal__section">
              <h3>{{ t('parent.instructions') }}</h3>
              <p dir="auto">{{ active.instructions }}</p>
            </section>
            <section v-if="assignmentFeedback(active)" class="learner-assignment-modal__section parent-homework-detail__feedback">
              <h3><i class="bi bi-chat-left-quote" aria-hidden="true"></i>{{ t('parent.teacher_feedback') }}</h3>
              <p dir="auto">{{ assignmentFeedback(active) }}</p>
            </section>
            <section v-if="reviewedAssessment(active)" class="learner-assignment-modal__section">
              <h3>{{ t('parent.assessment_heading') }}</h3>
              <ParentAssessmentCard :assessment="reviewedAssessment(active)" />
            </section>
            <p v-if="!detailHasContent(active)" class="parent-modal__quiet">{{ t('parent.task_no_note') }}</p>
          </div>
        </template>
      </DashModalRoot>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityIcon, activityName, formatWhen, passageLabel } from '../../scripts/parent/dashboard'
import {
  hasLearningFiltersActive,
  homeworkDetailHasContent,
  homeworkDisplayStatusClass,
  homeworkDisplayStatusIcon,
  homeworkDisplayStatusKey,
  passageTitleDirection,
  resetLearningFilters,
  sharedReviewedAssessment,
  sortLearningRows,
  visibleAssignmentFeedback,
} from '../../scripts/parent/familyLearning'
import { groupHomeworkRows, historyLabelKey } from '../../scripts/parent/homeworkGroups'
import {
  homeworkActivityChartBars,
  homeworkDetailFields,
  homeworkStatusChartBars,
  homeworkSummaryCards,
} from '../../scripts/parent/homeworkBreakdown'
import DashModalRoot from '../dashboard/DashModalRoot.vue'
import ParentAssessmentCard from './ParentAssessmentCard.vue'
import ParentSimpleBarChart from './ParentSimpleBarChart.vue'
import ParentChildLearningFilters from './ParentChildLearningFilters.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'

export default {
  name: 'ParentFamilyLearning',
  components: {
    DashModalRoot,
    ParentAssessmentCard,
    ParentChildLearningFilters,
    ParentSimpleBarChart,
    TeacherEmpty,
    NetworkFallback,
  },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    truncated: { type: Boolean, default: false },
    filters: { type: Object, default: () => ({ activity: null, status: 'all', from: '', to: '' }) },
    focusAssignmentId: { type: Number, default: null },
  },
  emits: ['select-child', 'filter', 'reload', 'focus-cleared'],
  data() {
    return { active: null, filtersOpen: false }
  },
  watch: {
    rows: {
      immediate: true,
      handler() {
        this.openFocusedAssignment()
      },
    },
    focusAssignmentId() {
      this.openFocusedAssignment()
    },
    loading(next, prev) {
      if (prev && !next) {
        this.openFocusedAssignment()
      }
    },
  },
  computed: {
    groupedRows() {
      return groupHomeworkRows(this.sortedRows)
    },
    breakdownLead() {
      const total = this.sortedRows.length
      if (!total) return ''
      if (this.groupedRows.length === 1) return this.t('parent.homework_breakdown_one')
      return this.t('parent.homework_breakdown', { count: total })
    },
    childSelectValue() {
      return this.selectedId ? String(this.selectedId) : ''
    },
    sortedRows() {
      return sortLearningRows(this.rows)
    },
    filtersActive() {
      return hasLearningFiltersActive(this.filters)
    },
    listHint() {
      const count = this.sortedRows.length
      return count === 1
        ? this.t('parent.homework_showing_one')
        : this.t('parent.homework_showing', { count })
    },
    emptyMessage() {
      return this.filtersActive ? this.t('parent.homework_empty_filter') : this.t('parent.homework_empty')
    },
    breakdownHeadingId() {
      return `parent-homework-breakdown-${this.selectedId || 'all'}`
    },
    summaryCards() {
      return homeworkSummaryCards(this.t, this.sortedRows)
    },
    statusBars() {
      return homeworkStatusChartBars(this.t, this.sortedRows)
    },
    activityBars() {
      return homeworkActivityChartBars(this.t, this.sortedRows)
    },
    breakdownIntro() {
      const count = this.sortedRows.length
      const child = this.selectedId
        ? this.children.find((row) => Number(row.id) === Number(this.selectedId))?.name
        : null
      if (child) {
        return count === 1
          ? this.t('parent.homework_breakdown_child_one', { name: child })
          : this.t('parent.homework_breakdown_child', { name: child, count })
      }
      return count === 1
        ? this.t('parent.homework_breakdown_one')
        : this.t('parent.homework_breakdown', { count })
    },
  },
  methods: {
    openFocusedAssignment() {
      const id = Number(this.focusAssignmentId || 0)
      if (!id || this.loading || !this.rows.length) return
      const match = this.sortedRows.find((row) => Number(row.id) === id)
      if (match) {
        this.active = match
        this.$emit('focus-cleared')
      }
    },
    scrollToBreakdown() {
      const el = this.$el?.querySelector('#parent-homework-breakdown')
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    },
    detailFields(item) {
      return homeworkDetailFields(this.t, item)
    },
    openDetail(item) {
      this.active = item
      this.$emit('focus-cleared')
    },
    closeDetail() {
      this.active = null
      this.$emit('focus-cleared')
    },
    groupTitle(key) {
      const labelKey = `parent.homework_group_${key}`
      const label = this.t(labelKey)
      return label && label !== labelKey ? label : key
    },
    historyRows(item) {
      const rows = Array.isArray(item?.history) ? item.history : []
      return rows.map((row) => {
        const labelKey = historyLabelKey(row.label)
        const label = labelKey ? this.t(labelKey) : row.label
        const when = row.at || ''
        return {
          label,
          when,
          whenLabel: when ? formatWhen(when) : '',
        }
      })
    },
    activityIcon,
    onChildChange(event) {
      const value = Number(event.target.value || 0)
      this.$emit('select-child', value > 0 ? value : null)
    },
    updateFilter(key, value) {
      this.$emit('filter', { ...this.filters, [key]: value || (key === 'status' ? 'all' : key === 'activity' ? null : '') })
    },
    resetFilters() {
      this.$emit('filter', resetLearningFilters())
    },
    viewLabel(item) {
      return `${this.t('parent.open_learning')}: ${this.taskTitle(item)}`
    },
    taskTitle(item) {
      const assignment = item.assignment || {}
      return passageLabel(assignment) || activityName(this.t, assignment.activity) || this.t('parent.nav_learning')
    },
    titleDir(item) {
      return passageTitleDirection(this.taskTitle(item))
    },
    categoryLabel(item) {
      return activityName(this.t, item.assignment?.activity)
    },
    cardMeta(item) {
      const assignment = item.assignment || {}
      return [
        item.child_name,
        item.teacher_name,
        assignment.due_at ? this.t('parent.homework_due_short', { when: formatWhen(assignment.due_at) }) : '',
      ].filter(Boolean).join(' · ')
    },
    dueLabel(item) {
      const dueAt = item.assignment?.due_at
      return dueAt ? this.t('parent.homework_due_short', { when: formatWhen(dueAt) }) : this.t('parent.not_yet')
    },
    assignmentFeedback: visibleAssignmentFeedback,
    reviewedAssessment: sharedReviewedAssessment,
    detailHasContent: homeworkDetailHasContent,
    statusLabel(status) {
      const key = `parent.homework_${homeworkDisplayStatusKey(status)}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
    statusClass(status) {
      return homeworkDisplayStatusClass(status)
    },
    statusIcon(status) {
      return homeworkDisplayStatusIcon(status)
    },
  },
}
</script>