<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>

    <section class="teacher-overview-summary" :aria-label="t('teacher.nav_overview')">
      <TeacherKpiGrid :cards="kpiCards" compact selectable @select="$emit('select-kpi', $event)" />
    </section>

    <TeacherSectionPane
      v-if="taskRows.length"
      :title="t('teacher.overview_task_status')"
      :hint="t('teacher.overview_task_status_hint')"
      icon="bi bi-list-check"
      tone="practice"
      flat
    >
      <div class="teacher-task-pulse">
        <div class="teacher-task-pulse__lead">
          <strong>{{ taskLead.count }}</strong>
          <span>{{ taskLead.label }}</span>
        </div>
        <div class="teacher-task-pulse__breakdown">
          <button
            v-for="row in taskRows"
            :key="row.id"
            type="button"
            :class="row.tone"
            :aria-label="`${row.label}: ${row.count}`"
            @click="$emit('open-assignments', row.id)"
          >
            <span class="teacher-task-pulse__name"><i aria-hidden="true"></i>{{ row.label }}</span>
            <strong>{{ row.count }}</strong>
          </button>
        </div>
      </div>
    </TeacherSectionPane>

    <TeacherSectionPane
      v-else-if="hasStudents"
      :title="t('teacher.overview_task_status')"
      :hint="t('teacher.overview_task_status_hint')"
      icon="bi bi-list-check"
      tone="practice"
      flat
    >
      <div class="teacher-empty-with-action">
        <TeacherEmpty inline icon="bi bi-journal-plus" :message="t('teacher.assignments_empty')" />
        <button type="button" class="btn btn-primary btn-sm teacher-empty-action" @click="$emit('create-assignment')">
          {{ t('teacher.add_task') }}
        </button>
      </div>
    </TeacherSectionPane>

    <TeacherSectionPane
      :title="t('teacher.overview_need_look')"
      :hint="t('teacher.overview_need_look_hint')"
      icon="bi bi-exclamation-circle"
      tone="warn"
      flat
    >
      <TeacherAttentionList
        :rows="attentionRows"
        @open-student="openStudent"
        @assign-revision="$emit('assign-revision', $event)"
      />
      <button v-if="!attentionRows.length" type="button" class="btn btn-outline-secondary btn-sm teacher-empty-action" @click="$emit('select-kpi', 'students')">{{ t('teacher.view_students') }}</button>
    </TeacherSectionPane>

    <div class="teacher-overview-detail-grid teacher-overview-detail-grid--activity-only">
      <TeacherSectionPane
        :title="t('teacher.overview_recent_activity')"
        :hint="t('teacher.overview_recent_activity_hint')"
        icon="bi bi-activity"
        tone="practice"
        flat
      >
        <ul v-if="recentActivity.length" class="teacher-activity-list">
          <li v-for="student in recentActivity" :key="student.id">
            <button type="button" @click="openStudent(student.id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ student.name }}</strong>
                <small>{{ t('teacher.activity_recorded', { when: formatWhen(student.last_activity_at) }) }}</small>
              </span>
              <span v-if="typeof student.ai_success_rate === 'number'" class="teacher-activity-list__score" :class="`teacher-activity-list__score--${scoreTone(student.ai_success_rate)}`">
                {{ student.ai_success_rate }}%
                <small>{{ t('teacher.ai_word_match_short') }}</small>
              </span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <div v-else class="teacher-empty-with-action">
          <TeacherEmpty inline icon="bi bi-calendar2" :message="t('teacher.activity_empty')" />
          <button type="button" class="btn btn-outline-secondary btn-sm teacher-empty-action" @click="$emit('select-kpi', 'students')">{{ t('teacher.view_students') }}</button>
        </div>
      </TeacherSectionPane>
    </div>

  </section>
</template>
<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { scoreBadgeTone, studentInitial } from '../../scripts/teacher/formatters'
import TeacherAttentionList from './TeacherAttentionList.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherKpiGrid from './TeacherKpiGrid.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'

export default {
  name: 'TeacherOverviewSection',
  components: {
    TeacherAttentionList,
    TeacherEmpty,
    TeacherKpiGrid,
    TeacherSectionPane,
  },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, required: true },
    kpiCards: { type: Array, default: () => [] },
    attentionPreview: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
    chartDays: { type: Number, default: 30 },
    chartDayOptions: { type: Array, default: () => [30, 90] },
    chartEmpty: { type: Boolean, default: false },
    chartReady: { type: Boolean, default: true },
    chartData: { type: Object, required: true },
    chartOptions: { type: Object, required: true },
  },
  emits: ['open-student', 'select-kpi', 'assign-revision', 'set-chart-days', 'open-assignments', 'create-assignment'],
  computed: {
    recentActivity() {
      return (this.overview.recently_active || []).slice(0, 5)
    },
    assignmentCounts() {
      return this.overview?.assignments || {}
    },
    hasStudents() {
      return Number(this.overview?.kpis?.authorised_students || 0) > 0
    },
    taskRows() {
      const counts = this.assignmentCounts
      return [
        { id: 'overdue', label: this.t('teacher.task_filter_overdue'), count: Number(counts.overdue || 0), tone: 'is-danger' },
        { id: 'progress', label: this.t('teacher.task_filter_progress'), count: Number(counts.in_progress || 0), tone: '' },
        { id: 'done', label: this.t('teacher.task_filter_completed'), count: Number(counts.completed || 0), tone: 'is-good' },
      ].filter((row) => row.count > 0)
    },
    taskLead() {
      const counts = this.assignmentCounts
      const overdue = Number(counts.overdue || 0)
      if (overdue > 0) return { count: overdue, label: this.t('teacher.task_filter_overdue') }
      return { count: Number(this.overview?.kpis?.outstanding_assignments || 0), label: this.t('teacher.kpi_open_tasks') }
    },
    attentionRows() {
      if (this.attentionPreview.length) return this.attentionPreview
      const inactive = this.overview.inactive || []
      const extra = (this.overview.recently_active || []).filter((student) => student.needs_attention)
      const seen = new Set()
      return [...inactive, ...extra].filter((student) => {
        if (!student?.needs_attention || seen.has(student.id)) return false
        seen.add(student.id)
        return true
      })
    },
  },
  methods: {
    initial: studentInitial,
    scoreTone: scoreBadgeTone,
    openStudent(id, section = 'ai') {
      this.$emit('open-student', id, section)
    },
  },
}
</script>
