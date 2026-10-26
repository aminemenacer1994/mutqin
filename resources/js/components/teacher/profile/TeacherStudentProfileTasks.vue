<template>
  <TeacherSectionPane tone="neutral">
    <div v-if="taskRows.length" class="teacher-context-stats teacher-context-stats--interactive" :aria-label="t('teacher.task_summary')">
      <button v-for="filter in filters" :key="filter.id" type="button" :class="[`is-${filter.id}`, { 'is-active': activeFilter === filter.id }]" :aria-pressed="activeFilter === filter.id ? 'true' : 'false'" @click="activeFilter = filter.id"><strong>{{ filter.count }}</strong> {{ filter.label }}</button>
    </div>
    <TeacherRecordList v-if="visibleRows.length" :rows="visibleRows" />
    <p v-else-if="taskRows.length" class="teacher-task-filter-empty">{{ t('teacher.no_tasks_in_filter') }}</p>
    <TeacherEmpty v-else icon="bi bi-clipboard-check" :message="t('teacher.assignments_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { assignmentProgressLabel } from '../../../scripts/teacher/formatters'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileTasks',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  data() { return { activeFilter: 'all' } },
  watch: { 'profile.student.id'() { this.activeFilter = 'all' } },
  computed: {
    overdueCount() {
      return (this.profile.payload.assignments || []).filter((item) => item.status === 'overdue').length
    },
    completedCount() {
      return (this.profile.payload.assignments || []).filter((item) => item.status === 'completed').length
    },
    openCount() {
      return (this.profile.payload.assignments || []).filter((item) => item.status !== 'completed' && item.status !== 'overdue').length
    },
    filters() {
      return [
        { id: 'all', label: this.t('teacher.task_filter_all'), count: this.taskRows.length },
        { id: 'overdue', label: this.t('teacher.overdue'), count: this.overdueCount },
        { id: 'open', label: this.t('teacher.open_tasks'), count: this.openCount },
        { id: 'done', label: this.t('teacher.status_completed'), count: this.completedCount },
      ]
    },
    visibleRows() {
      if (this.activeFilter === 'all') return this.taskRows
      return this.taskRows.filter((row) => {
        if (this.activeFilter === 'done') return row.status === 'completed'
        if (this.activeFilter === 'overdue') return row.status === 'overdue'
        return row.status !== 'completed' && row.status !== 'overdue'
      })
    },
    taskRows() {
      return (this.profile.payload.assignments || []).map((item) => {
        const a = item.assignment || {}
        const kind = a.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-journal-text'
        const statusKey = item.status || 'pending'
        const tone = statusKey === 'completed'
          ? 'good'
          : (statusKey === 'overdue' ? 'danger' : (statusKey === 'pending' ? 'muted' : 'mid'))
        return {
          key: item.id,
          status: statusKey,
          icon: kind,
          iconTone: tone,
          title: `${a.surah_name} ${a.ayah_start}–${a.ayah_end}`,
          hint: [
            a.hifz_category ? this.t(`teacher.hifz_${a.hifz_category}`) : this.t('teacher.hifz_uncategorized'),
            a.kind === 'ai_recite' ? this.t('teacher.kind_ai') : this.t('teacher.kind_practice'),
            a.due_at ? this.t('teacher.task_due_date', { date: this.formatWhen(a.due_at) }) : this.t('teacher.no_due_date'),
            statusKey === 'completed'
              ? this.completionEvidenceLabel(item)
              : this.targetLabel(item, a),
          ].filter(Boolean).join(' · '),
          badge: this.t(`teacher.status_${statusKey}`),
          badgeTone: tone,
          source: statusKey === 'in_progress' || statusKey === 'awaiting_confirmation' ? this.progressLabel(item) : '',
          audio: item.evidence?.audio || null,
          transcript: item.evidence?.transcript || '',
          href: a.surah_number && a.ayah_start
            ? `/memorisation?surah=${a.surah_number}&from=${a.ayah_start}&to=${a.ayah_end || a.ayah_start}&review=1&assignment_recipient=${item.id}`
            : '',
        }
      })
    },
  },
  methods: {
    targetLabel(item, assignment) {
      const n = Math.max(1, Number(item.progress?.target || assignment.repetition_target || 1))
      return this.t(n === 1 ? 'teacher.task_target_context_one' : 'teacher.task_target_context_many', { n })
    },
    progressLabel(item) {
      return item?.progress ? assignmentProgressLabel(item, this.t.bind(this)) : ''
    },
    completionEvidenceLabel(item) {
      if (item?.status !== 'completed' || !item?.completed_at) return ''
      return this.t('teacher.learner_assignments_completed_at', {
        date: this.formatWhen(item.completed_at),
      })
    },
  },
}
</script>
