<template>
  <section class="parent-home parent-homework teacher-stack">
    <header class="teacher-page-header teacher-page-header--actions">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_learning') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.learning_detail_hint') }}</p>
      </div>
      <div v-if="shared && !loading && !error && sortedRows.length" class="teacher-page-header__aside">
        <button type="button" class="dash-btn dash-btn--ghost" @click="openBreakdown">
          <i class="bi bi-columns-gap" aria-hidden="true"></i>
          {{ t('parent.homework_breakdown_title') }}
        </button>
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
      <template v-else>
        <div id="parent-homework-breakdown" class="parent-homework-breakdown">
          <div v-if="showBreakdownCharts" class="parent-homework-breakdown__summary">
            <div class="parent-homework-breakdown__charts">
              <section v-if="statusChartBars.length" class="parent-reports-chart-panel">
                <h3 class="parent-report__subhead parent-report__subhead--chart">{{ t('parent.homework_chart_status') }}</h3>
                <ParentSimpleBarChart :bars="statusChartBars" :aria-label="t('parent.homework_chart_status')" />
              </section>
              <section v-if="activityChartBars.length" class="parent-reports-chart-panel">
                <h3 class="parent-report__subhead parent-report__subhead--chart">{{ t('parent.homework_chart_activity') }}</h3>
                <ParentSimpleBarChart :bars="activityChartBars" :aria-label="t('parent.homework_chart_activity')" />
              </section>
            </div>
          </div>
          <h2 class="parent-report__subhead">{{ t('parent.homework_breakdown_list') }}</h2>
          <p v-if="breakdownLead" class="parent-stat__hint parent-homework-breakdown__lead">{{ breakdownLead }}</p>
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
    </template>

    <DashModalRoot
      :open="breakdownOpen"
      labelled-by="parent-homework-breakdown-title"
      root-class="parent-modal-root parent-homework-breakdown-modal"
      panel-class="parent-modal parent-homework-breakdown-modal__panel"
      test-id="parent-homework-breakdown-modal"
      @close="closeBreakdown"
    >
      <header class="parent-modal__head">
        <div class="parent-modal__head-main">
          <h2 id="parent-homework-breakdown-title" class="parent-report__subhead">{{ t('parent.homework_breakdown_title') }}</h2>
          <p class="parent-lead parent-modal__quiet">{{ breakdownIntro }}</p>
        </div>
        <button type="button" class="parent-modal__close" :aria-label="t('parent.modal_close')" @click="closeBreakdown">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div class="parent-modal__body parent-homework-breakdown-modal__body">
        <div class="parent-stats parent-stats--compact parent-homework-breakdown__stats" role="list">
          <article
            v-for="card in summaryCards"
            :key="card.key"
            class="parent-stat parent-stat--compact parent-homework-stat"
            :class="`is-tone-${card.tone}`"
            role="listitem"
          >
            <span aria-hidden="true"><i :class="card.icon"></i></span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.label }}</small>
          </article>
        </div>
        <p v-if="breakdownLead" class="parent-stat__hint">{{ breakdownLead }}</p>
        <div class="parent-homework-breakdown parent-homework-breakdown--modal">
          <section
            v-for="group in groupedRows"
            :key="`modal-${group.key}`"
            class="parent-homework-group"
            :aria-labelledby="`parent-homework-breakdown-group-${group.key}`"
          >
            <h3 :id="`parent-homework-breakdown-group-${group.key}`" class="parent-homework-group__title">
              {{ groupTitle(group.key) }}
              <span class="parent-homework-group__count">{{ group.rows.length }}</span>
            </h3>
            <ul class="parent-homework-breakdown-modal__list" role="list">
              <li v-for="item in group.rows" :key="`modal-${item.id}`" role="listitem">
                <button type="button" class="parent-homework-breakdown-modal__row" @click="openDetailFromBreakdown(item)">
                  <span class="parent-homework-breakdown-modal__row-main">
                    <strong :dir="titleDir(item)">{{ taskTitle(item) }}</strong>
                    <small>{{ cardMeta(item) }}</small>
                  </span>
                  <span class="parent-status" :class="statusClass(item.display_status)">
                    {{ statusLabel(item.display_status) }}
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </DashModalRoot>

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
            <section v-if="active.instructions || assignmentFeedback(active) || assignmentVoiceInstruction(active) || assignmentRecitationDemo(active)" class="learner-assignment-modal__section">
              <h3>{{ t('parent.instructions') }}</h3>
              <p v-if="active.instructions" dir="auto">{{ active.instructions }}</p>
              <p v-if="assignmentFeedback(active)" dir="auto">{{ assignmentFeedback(active) }}</p>
              <TeacherAudioFeedbackPlayer
                v-if="assignmentVoiceInstruction(active)?.available && assignmentVoiceInstruction(active)?.url"
                :src="assignmentVoiceInstruction(active).url"
                :duration-ms="assignmentVoiceInstruction(active).duration_ms"
                compact
                :play-label="t('teacher.assignment_voice_instruction_label')"
                :pause-label="t('teacher.pause_recording')"
              />
              <TeacherAudioFeedbackPlayer
                v-if="assignmentRecitationDemo(active)?.available && assignmentRecitationDemo(active)?.url"
                class="mt-2"
                :src="assignmentRecitationDemo(active).url"
                :duration-ms="assignmentRecitationDemo(active).duration_ms"
                compact
                :play-label="t('teacher.assignment_recitation_demo_label')"
                :pause-label="t('teacher.pause_recording')"
              />
            </section>
            <section v-if="publishedFeedback(active)" class="learner-assignment-modal__section parent-homework-detail__feedback">
              <h3><i class="bi bi-chat-left-quote" aria-hidden="true"></i>{{ t('parent.teacher_feedback') }}</h3>
              <template v-if="publishedFeedback(active)">
                <p v-if="publishedFeedback(active).body" dir="auto">{{ publishedFeedback(active).body }}</p>
                <TeacherAudioFeedbackPlayer
                  v-if="publishedFeedback(active).audio?.available && publishedFeedback(active).audio?.url"
                  :src="publishedFeedback(active).audio.url"
                  :duration-ms="publishedFeedback(active).audio.duration_ms"
                  compact
                />
              </template>
            </section>
            <section v-if="reviewedAssessment(active)" class="learner-assignment-modal__section">
              <h3>{{ t('parent.assessment_heading') }}</h3>
              <ParentAssessmentCard :assessment="reviewedAssessment(active)" />
            </section>
            <section v-if="mushafRows(active).length" class="learner-assignment-modal__section parent-homework-detail__mushaf">
              <h3>{{ t('parent.homework_mushaf_title') }}</h3>
              <p class="parent-modal__quiet">{{ t('parent.homework_mushaf_hint') }}</p>
              <ul class="parent-homework-mushaf-list">
                <li v-for="row in mushafRows(active)" :key="row.id">
                  <span class="parent-status is-quiet">{{ mushafCategory(row) }}</span>
                  <p v-if="row.guidance" class="mb-0" dir="auto">{{ row.guidance }}</p>
                </li>
              </ul>
            </section>
            <section
              v-if="canAcknowledgeSupervision(active)"
              class="learner-assignment-modal__section parent-homework-detail__supervision"
            >
              <h3>{{ t('parent.homework_supervision_title') }}</h3>
              <p class="parent-modal__quiet">{{ t('parent.homework_supervision_hint') }}</p>
              <p v-if="supervisionAcknowledged(active)" class="parent-homework-supervision-done" role="status">
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
                {{ supervisionAcknowledgedLabel(active) }}
              </p>
              <button
                v-else
                type="button"
                class="dash-btn dash-btn--primary"
                :disabled="acknowledging"
                @click="acknowledgeSupervision(active)"
              >
                {{ acknowledging ? t('parent.homework_supervision_saving') : t('parent.homework_supervision_confirm') }}
              </button>
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
  assignmentRecitationDemo,
  assignmentVoiceInstruction,
  homeworkDetailHasContent,
  homeworkDisplayStatusClass,
  homeworkDisplayStatusIcon,
  homeworkDisplayStatusKey,
  passageTitleDirection,
  resetLearningFilters,
  publishedHomeworkFeedback,
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
import ParentSimpleBarChart from './ParentSimpleBarChart.vue'
import DashModalRoot from '../dashboard/DashModalRoot.vue'
import ParentAssessmentCard from './ParentAssessmentCard.vue'
import ParentChildLearningFilters from './ParentChildLearningFilters.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherAudioFeedbackPlayer from '../teacher/TeacherAudioFeedbackPlayer.vue'
import NetworkFallback from '../NetworkFallback.vue'
import { learningApi } from '../../scripts/api/learning'

export default {
  name: 'ParentFamilyLearning',
  components: {
    DashModalRoot,
    ParentAssessmentCard,
    ParentChildLearningFilters,
    ParentSimpleBarChart,
    TeacherAudioFeedbackPlayer,
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
  emits: ['select-child', 'filter', 'reload', 'focus-cleared', 'supervision-updated'],
  data() {
    return { active: null, breakdownOpen: false, filtersOpen: false, acknowledging: false }
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
    summaryCards() {
      return homeworkSummaryCards(this.t, this.sortedRows)
    },
    statusChartBars() {
      return homeworkStatusChartBars(this.t, this.sortedRows)
    },
    activityChartBars() {
      return homeworkActivityChartBars(this.t, this.sortedRows)
    },
    showBreakdownCharts() {
      return this.statusChartBars.length > 0 || this.activityChartBars.length > 0
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
    openBreakdown() {
      this.breakdownOpen = true
    },
    closeBreakdown() {
      this.breakdownOpen = false
    },
    openDetailFromBreakdown(item) {
      this.breakdownOpen = false
      this.openDetail(item)
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
    assignmentVoiceInstruction,
    assignmentRecitationDemo,
    publishedFeedback: publishedHomeworkFeedback,
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
    mushafRows(item) {
      return Array.isArray(item?.mushaf_annotations) ? item.mushaf_annotations : []
    },
    mushafCategory(row) {
      const key = row?.category ? `teacher.mushaf_category_${row.category}` : ''
      const label = key ? this.t(key) : ''
      return label && label !== key ? label : (row?.category || '—')
    },
    canAcknowledgeSupervision(item) {
      if (!item) return false
      const status = item.display_status
      if (['completed', 'cancelled', 'reassigned'].includes(status)) return false
      return true
    },
    supervisionAcknowledged(item) {
      return Boolean(item?.supervision?.acknowledged)
    },
    supervisionAcknowledgedLabel(item) {
      const at = item?.supervision?.acknowledged_at
      return at
        ? this.t('parent.homework_supervision_done_when', { when: formatWhen(at) })
        : this.t('parent.homework_supervision_done')
    },
    async acknowledgeSupervision(item) {
      if (!item?.child_id || !item?.id || this.acknowledging) return
      this.acknowledging = true
      try {
        const { supervision } = await learningApi.acknowledgeParentHomeworkSupervision(item.child_id, item.id)
        const next = { ...item, supervision: supervision || { acknowledged: true, acknowledged_at: new Date().toISOString() } }
        this.active = next
        this.$emit('supervision-updated', next)
      } catch {
        // Parent sees no change; they can retry from the same button.
      } finally {
        this.acknowledging = false
      }
    },
  },
}
</script>