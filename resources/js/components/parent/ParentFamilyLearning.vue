<template>
  <section class="parent-home">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-journal-check"></i></span>
      <div>
        <h1>{{ t('parent.nav_learning') }}</h1>
        <p>{{ t('parent.learning_detail_hint') }}</p>
      </div>
    </header>

    <div class="parent-filters">
      <ParentChildFilter :children="children" :selected-id="selectedId" @select="$emit('select-child', $event)" />
      <ParentChildLearningFilters
        :activity="filters.activity"
        :status="filters.status"
        :from="filters.from"
        :to="filters.to"
        @activity="updateFilter('activity', $event)"
        @status="updateFilter('status', $event)"
        @from="updateFilter('from', $event)"
        @to="updateFilter('to', $event)"
      />
    </div>

    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherEmpty v-else-if="!shared" illustrated icon="bi bi-lock" :message="t('parent.permission_assignments')" />
    <div v-else-if="loading" class="teacher-skeletons" role="status">
      <div v-for="n in 3" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <NetworkFallback v-else-if="error" @retry="$emit('reload')" />
    <template v-else>
      <p v-if="truncated" class="parent-note">{{ t('parent.homework_truncated') }}</p>
      <p class="parent-count">{{ listHint }}</p>
      <TeacherEmpty v-if="!rows.length" illustrated icon="bi bi-check2-circle" :message="t('parent.homework_empty_filter')" />
      <ul v-else class="parent-tasks">
        <li v-for="(item, index) in rows" :key="item.id" class="parent-task" :style="{ '--parent-i': index }">
          <button type="button" @click="active = item">
            <span class="parent-task__icon" aria-hidden="true"><i :class="activityIcon(item.assignment?.activity)"></i></span>
            <span class="parent-task__copy">
              <strong>{{ taskTitle(item) }}</strong>
              <small>{{ taskMeta(item) }}</small>
            </span>
            <span class="parent-status" :class="statusClass(item.display_status)">
              <i :class="statusIcon(item.display_status)" aria-hidden="true"></i>
              {{ statusLabel(item.display_status) }}
            </span>
          </button>
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
            <div>
              <span class="parent-status" :class="statusClass(active.display_status)">
                <i :class="statusIcon(active.display_status)" aria-hidden="true"></i>
                {{ statusLabel(active.display_status) }}
              </span>
              <h2 id="parent-task-title">{{ taskTitle(active) }}</h2>
              <p>{{ taskMeta(active) }}</p>
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
import DashModalRoot from '../dashboard/DashModalRoot.vue'
import ParentChildFilter from './ParentChildFilter.vue'
import ParentChildLearningFilters from './ParentChildLearningFilters.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'

export default {
  name: 'ParentFamilyLearning',
  components: { DashModalRoot, ParentChildFilter, ParentChildLearningFilters, TeacherEmpty, NetworkFallback },
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
    return { active: null }
  },
  computed: {
    listHint() {
      const count = this.rows.length
      return count === 1 ? this.t('parent.homework_count_one') : this.t('parent.homework_count', { count })
    },
  },
  methods: {
    activityIcon,
    updateFilter(key, value) {
      this.$emit('filter', { ...this.filters, [key]: value || (key === 'status' ? 'all' : '') })
    },
    taskTitle(item) {
      const assignment = item.assignment || {}
      return passageLabel(assignment) || activityName(this.t, assignment.activity) || this.t('parent.nav_learning')
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
    teacherNote(item) {
      if (item.teacher_feedback) return item.teacher_feedback
      const assessment = item.latest_assessment
      if (assessment?.source === 'teacher_reviewed' && assessment.teacher_note) return assessment.teacher_note
      return ''
    },
    statusLabel(status) {
      const key = `parent.homework_${status}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
    statusClass(status) {
      if (status === 'overdue') return 'is-late'
      if (status === 'completed') return 'is-ok'
      if (status === 'awaiting_confirmation') return 'is-wait'
      return 'is-open'
    },
    statusIcon(status) {
      if (status === 'overdue') return 'bi bi-clock'
      if (status === 'completed') return 'bi bi-check-circle'
      if (status === 'awaiting_confirmation') return 'bi bi-hourglass'
      return 'bi bi-circle'
    },
  },
}
</script>
