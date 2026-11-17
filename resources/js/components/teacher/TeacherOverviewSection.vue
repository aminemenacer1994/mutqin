<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>
    <TeacherKpiGrid :cards="kpiCards" compact selectable @select="$emit('select-kpi', $event)" />
    <section class="teacher-priorities" :aria-label="t('teacher.today_priorities')">
      <p>{{ t('teacher.today_priorities_summary', deskCounts) }}</p>
      <div class="teacher-priorities__actions">
        <button v-if="deskCounts.reviews" type="button" class="btn btn-primary btn-sm" @click="$emit('open-assignments', 'submitted')">{{ t('teacher.today_review_submissions') }}</button>
        <button v-if="deskCounts.overdue" type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('open-assignments', 'overdue')">{{ t('teacher.today_overdue_tasks') }}</button>
        <button v-if="deskCounts.plans" type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('open-plans')">{{ t('teacher.today_review_plans') }}</button>
      </div>
    </section>
    <div class="teacher-overview-columns">
      <TeacherSectionPane :title="t('teacher.overview_need_look')" icon="bi bi-exclamation-circle" tone="warn" flat>
        <TeacherAttentionList :rows="attentionRows" :format-when="formatWhen" @open-student="openStudent" @assign-revision="$emit('assign-revision', $event)" />
        <button v-if="!attentionRows.length" type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('select-kpi', 'students')">{{ t('teacher.view_students') }}</button>
      </TeacherSectionPane>
      <div class="teacher-overview-secondary">
        <TeacherSectionPane :title="t('teacher.overview_recent_activity')" icon="bi bi-activity" flat>
          <ul v-if="recentActivity.length" class="teacher-activity-list">
            <li v-for="student in recentActivity" :key="student.id">
              <button type="button" @click="openActivity(student)">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
                <span class="teacher-activity-list__copy"><strong>{{ student.name }}</strong><small>{{ activityLabel(student) }}</small></span>
                <span v-if="typeof student.ai_success_rate === 'number'" class="teacher-activity-list__score" :class="`teacher-activity-list__score--${scoreTone(student.ai_success_rate)}`">{{ student.ai_success_rate }}%<small>{{ t('teacher.ai_word_match_short') }}</small></span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <TeacherEmpty v-else inline icon="bi bi-calendar2" :message="t('teacher.activity_empty')" />
        </TeacherSectionPane>
        <TeacherSectionPane v-if="taskRows.length > 1 || assignmentCounts.awaiting_confirmation" :title="t('teacher.overview_task_status')" flat>
          <div class="teacher-task-pulse__breakdown">
            <button v-for="row in taskRows" :key="row.id" type="button" :class="row.tone" @click="$emit('open-assignments', row.id)"><span class="teacher-task-pulse__name"><i aria-hidden="true"></i>{{ row.label }}</span><strong>{{ row.count }}</strong></button>
          </div>
        </TeacherSectionPane>
      </div>
    </div>
    <div class="teacher-overview-columns">
      <TeacherSectionPane :title="t('teacher.overview_outstanding_revision')" icon="bi bi-arrow-repeat" flat>
        <ul v-if="outstandingRevision.length" class="teacher-activity-list">
          <li v-for="row in outstandingRevision" :key="row.recipient_id">
            <button type="button" @click="openStudent(row.student_id, 'tasks', { taskId: row.recipient_id })">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
              <span class="teacher-activity-list__copy"><strong>{{ row.student_name }}</strong><small>{{ row.label }}</small></span>
              <span></span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <TeacherEmpty v-else inline icon="bi bi-check2-circle" :message="t('teacher.overview_revision_empty')" />
      </TeacherSectionPane>
      <div class="teacher-overview-secondary">
        <TeacherSectionPane :title="t('teacher.overview_plan_progress')" icon="bi bi-calendar-week" flat>
          <ul v-if="planRows.length" class="teacher-activity-list">
            <li v-for="row in planRows" :key="row.id">
              <button type="button" @click="openStudent(row.student_id, 'plan')">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
                <span class="teacher-activity-list__copy"><strong>{{ row.student_name }}</strong><small>{{ row.title }} · {{ row.completed }}/{{ row.total }}</small></span>
                <span></span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <TeacherEmpty v-else inline icon="bi bi-calendar-week" :message="t('teacher.overview_plan_empty')" />
        </TeacherSectionPane>
        <TeacherSectionPane :title="t('teacher.overview_recent_completions')" icon="bi bi-check2-circle" flat>
          <ul v-if="recentCompletions.length" class="teacher-activity-list">
            <li v-for="row in recentCompletions" :key="`done-${row.recipient_id}`">
              <button type="button" @click="openStudent(row.student_id, 'tasks', { taskId: row.recipient_id })">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
                <span class="teacher-activity-list__copy"><strong>{{ row.student_name }}</strong><small>{{ row.label }}</small></span>
                <span></span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <TeacherEmpty v-else inline icon="bi bi-inbox" :message="t('teacher.overview_completions_empty')" />
        </TeacherSectionPane>
      </div>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { scoreBadgeTone, studentInitial, teacherAttentionAction, teacherAttentionRank, teacherDeskCounts } from '../../scripts/teacher/formatters'
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
  emits: ['open-student', 'select-kpi', 'assign-revision', 'set-chart-days', 'open-assignments', 'open-plans', 'create-assignment'],
  computed: {
    deskCounts() {
      return teacherDeskCounts(this.overview)
    },
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
        { id: 'submitted', label: this.t('teacher.status_awaiting_confirmation'), count: Number(counts.awaiting_confirmation || 0), tone: '' },
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
    outstandingRevision() {
      return this.overview?.outstanding_revision || []
    },
    planRows() {
      return this.overview?.plan_progress?.rows || []
    },
    recentCompletions() {
      return this.overview?.recent_completions || []
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
      }).sort((a, b) => teacherAttentionRank(a) - teacherAttentionRank(b))
    },
  },
  methods: {
    initial: studentInitial,
    scoreTone: scoreBadgeTone,
    activityLabel(student) {
      const action = teacherAttentionAction(student, this.t)
      const when = this.formatWhen(student.last_activity_at)
      return when ? `${action.label} · ${when}` : action.label
    },
    openActivity(student) {
      const action = teacherAttentionAction(student, this.t)
      if (action.assign) {
        this.$emit('assign-revision', student)
        return
      }
      this.openStudent(student.id, action.section || 'ai', action.focus || null)
    },
    openStudent(id, section = 'ai', focus = null) {
      this.$emit('open-student', id, section, focus)
    },
  },
}
</script>
