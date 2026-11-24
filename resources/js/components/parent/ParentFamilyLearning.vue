<template>
  <section class="parent-home parent-homework">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-journal-check"></i></span>
      <div>
        <h1>{{ t('parent.nav_learning') }}</h1>
        <p>{{ t('parent.learning_detail_hint') }}</p>
      </div>
    </header>

    <div v-if="children.length" class="parent-filters parent-homework-toolbar" :class="{ 'is-expanded': filtersOpen }">
      <label v-if="children.length" class="parent-report-field">
        <span class="parent-report-field__label">{{ t('parent.child_filter') }}</span>
        <select
          class="parent-report-select"
          :value="childSelectValue"
          :aria-label="t('parent.child_filter')"
          @change="onChildChange"
        >
          <option value="">{{ t('parent.child_all') }}</option>
          <option v-for="child in children" :key="child.id" :value="child.id">{{ child.name }}</option>
        </select>
      </label>
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
      <div class="parent-homework-toolbar__meta">
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
      <ul v-else class="parent-tasks parent-homework-list">
        <li
          v-for="(item, index) in sortedRows"
          :key="item.id"
          class="parent-task parent-homework-card"
          :style="{ '--parent-i': index }"
        >
          <article>
            <button
              type="button"
              class="parent-homework-card__hit"
              :aria-label="viewLabel(item)"
              @click="active = item"
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
                {{ t('parent.open_learning') }}
                <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </span>
            </button>
          </article>
        </li>
      </ul>
      <DashModalRoot
        :open="Boolean(active)"
        labelled-by="parent-task-title"
        root-class="parent-modal-root"
        panel-class="parent-modal"
        @close="active = null"
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
            <button type="button" class="parent-modal__close" :aria-label="t('parent.modal_close')" @click="active = null">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>
          <div class="parent-modal__body">
            <p v-if="active.instructions">{{ active.instructions }}</p>
            <p v-if="teacherNote(active)">{{ teacherNote(active) }}</p>
            <p v-if="!active.instructions && !teacherNote(active)" class="parent-modal__quiet">{{ t('parent.task_no_note') }}</p>
          </div>
        </template>
      </DashModalRoot>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityIcon, activityName, formatWhen, passageLabel } from '../../scripts/parent/dashboard'
import {
  hasLearningFiltersActive,
  homeworkDisplayStatusClass,
  homeworkDisplayStatusIcon,
  homeworkDisplayStatusKey,
  passageTitleDirection,
  resetLearningFilters,
  sortLearningRows,
} from '../../scripts/parent/familyLearning'
import DashModalRoot from '../dashboard/DashModalRoot.vue'
import ParentChildLearningFilters from './ParentChildLearningFilters.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'

export default {
  name: 'ParentFamilyLearning',
  components: { DashModalRoot, ParentChildLearningFilters, TeacherEmpty, NetworkFallback },
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
  },
  emits: ['select-child', 'filter', 'reload'],
  data() {
    return { active: null, filtersOpen: false }
  },
  computed: {
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
  },
  methods: {
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
    taskMeta(item) {
      const assignment = item.assignment || {}
      return [
        item.child_name,
        activityName(this.t, assignment.activity),
        assignment.due_at ? this.t('parent.homework_due_short', { when: formatWhen(assignment.due_at) }) : '',
        item.teacher_name,
      ].filter(Boolean).join(' · ')
    },
    dueLabel(item) {
      const dueAt = item.assignment?.due_at
      return dueAt ? this.t('parent.homework_due_short', { when: formatWhen(dueAt) }) : this.t('parent.not_yet')
    },
    teacherNote(item) {
      if (item.teacher_feedback) return item.teacher_feedback
      const assessment = item.latest_assessment
      if (assessment?.source === 'teacher_reviewed' && assessment.teacher_note) return assessment.teacher_note
      return ''
    },
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